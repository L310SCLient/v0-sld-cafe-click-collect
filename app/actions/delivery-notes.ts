'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardInterface } from '@/lib/interface/auth'
import { isSupportedMediaType, parseInvoiceImage, type InvoiceMediaType } from '@/lib/interface/invoice-parser'
import {
  cleanSupplierName,
  groupLinesForIngredients,
  type LinePourIngredient,
} from '@/lib/interface/invoice-ingredients'

/**
 * Bons de livraison : import en masse, lecture automatique, rattachement.
 *
 * L'invariant du lot D reste entier ici : AUCUNE de ces actions n'écrit dans
 * `ingredient_prices`. Le bon donne un prix provisoire, la facture fait
 * autorité — seule la validation d'une facture entre un prix en base.
 *
 * Un bon peut vivre sans facture : c'est le cas normal, puisque la facture
 * arrive plus tard. Rien ici ne force le rattachement.
 */

type ActionResult = { error?: string; message?: string }

const BUCKET = 'delivery-notes'
/** Au-delà, l'API vision refuse l'image. Mieux vaut le dire que d'échouer après coup. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function revalidate() {
  revalidatePath('/interface/factures')
  revalidatePath('/interface/ingredients')
}

// ─── Import d'une ou plusieurs photos ───────────────────────────────────────

export type ImportEchec = { name: string; error: string }

/**
 * Enregistre les photos reçues et crée un bon `a_lire` par photo. Aucune
 * lecture n'est déclenchée ici : l'import doit réussir même si le parsing est
 * indisponible.
 *
 * Un fichier refusé n'interrompt pas le lot — sur sept photos prises à la
 * volée, une seule illisible ne doit pas faire perdre les six autres. Les
 * échecs reviennent nommés, pour qu'on sache laquelle reprendre.
 */
export async function importDeliveryNotePhotos(
  formData: FormData
): Promise<ActionResult & { deliveryNoteIds?: string[]; failures?: ImportEchec[] }> {
  const denied = await guardInterface()
  if (denied) return denied

  const fichiers = formData.getAll('photos').filter((item): item is File => item instanceof File)
  if (fichiers.length === 0) {
    return { error: 'Aucune photo reçue.' }
  }

  const supabase = createAdminClient()
  const deliveryNoteIds: string[] = []
  const failures: ImportEchec[] = []

  for (const file of fichiers) {
    const nom = file.name || 'photo'

    if (file.size === 0) {
      failures.push({ name: nom, error: 'Fichier vide.' })
      continue
    }
    if (!isSupportedMediaType(file.type)) {
      failures.push({
        name: nom,
        error: `Format non pris en charge (${file.type || 'inconnu'}). JPEG, PNG, WebP ou GIF.`,
      })
      continue
    }
    if (file.size > MAX_IMAGE_BYTES) {
      failures.push({
        name: nom,
        error: `Photo trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum 5 Mo.`,
      })
      continue
    }

    const extension = file.type.split('/')[1] ?? 'jpg'
    const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      // Le bucket privé « delivery-notes » est un prérequis manuel : le dire
      // explicitement évite de chercher ailleurs.
      failures.push({
        name: nom,
        error: uploadError.message.toLowerCase().includes('not found')
          ? `Le bucket de stockage « ${BUCKET} » n'existe pas. À créer dans Supabase > Storage, en privé.`
          : `Envoi impossible : ${uploadError.message}`,
      })
      continue
    }

    const { data, error } = await supabase
      .from('delivery_notes')
      .insert({ image_path: path, status: 'a_lire' })
      .select('id')
      .single()

    if (error) {
      // Ne pas laisser une photo orpheline dans le bucket.
      await supabase.storage.from(BUCKET).remove([path])
      failures.push({ name: nom, error: error.message })
      continue
    }

    deliveryNoteIds.push(String((data as { id: string }).id))
  }

  revalidate()

  if (deliveryNoteIds.length === 0) {
    return { error: failures[0]?.error ?? 'Aucune photo importée.', failures }
  }

  return {
    message: `${deliveryNoteIds.length} bon${deliveryNoteIds.length > 1 ? 's' : ''} importé${deliveryNoteIds.length > 1 ? 's' : ''}.`,
    deliveryNoteIds,
    failures,
  }
}

// ─── Lecture automatique ────────────────────────────────────────────────────

/**
 * Lance la lecture de la photo par Claude et écrit les lignes proposées.
 * Le bon passe à `a_valider` : rien n'est encore acquis. Le document a la même
 * forme qu'une facture, la même lecture s'y applique.
 */
export async function parseDeliveryNote(deliveryNoteId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()

  const { data: note, error: readError } = await supabase
    .from('delivery_notes')
    .select('id, image_path, status')
    .eq('id', deliveryNoteId)
    .single()

  if (readError) return { error: readError.message }

  const record = note as { image_path: string | null; status: string }
  if (!record.image_path) {
    return { error: 'Ce bon de livraison n’a pas de photo.' }
  }

  await supabase.from('delivery_notes').update({ status: 'lecture' }).eq('id', deliveryNoteId)

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(record.image_path)

  if (downloadError || !blob) {
    await supabase
      .from('delivery_notes')
      .update({ status: 'echec', parse_error: downloadError?.message ?? 'Photo introuvable.' })
      .eq('id', deliveryNoteId)
    revalidate()
    return { error: `Photo illisible : ${downloadError?.message ?? 'introuvable'}` }
  }

  const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
  const mediaType = (blob.type || 'image/jpeg') as InvoiceMediaType

  const outcome = await parseInvoiceImage({
    base64,
    mediaType: isSupportedMediaType(mediaType) ? mediaType : 'image/jpeg',
  })

  if (outcome.status !== 'ok') {
    await supabase
      .from('delivery_notes')
      .update({
        // « Indisponible » n'est pas un échec de lecture : le bon reste à lire,
        // et ses lignes pourront être saisies à la main.
        status: outcome.status === 'unavailable' ? 'a_lire' : 'echec',
        parse_error: outcome.reason,
      })
      .eq('id', deliveryNoteId)
    revalidate()
    return { error: outcome.reason }
  }

  const parsed = outcome.invoice

  // Remplace les lignes proposées précédemment.
  await supabase.from('delivery_note_lines').delete().eq('delivery_note_id', deliveryNoteId)

  let ingredientsCrees = 0

  if (parsed.lines.length > 0) {
    const { data: inserted, error: linesError } = await supabase
      .from('delivery_note_lines')
      .insert(
        parsed.lines.map((line) => ({
          delivery_note_id: deliveryNoteId,
          raw_label: line.raw_label,
          quantity: line.quantity,
          pack_quantity: line.pack_quantity,
          base_unit: line.base_unit,
          pack_price_cents: line.pack_price_cents,
          line_total_cents: line.line_total_cents,
          confidence: line.confidence,
        }))
      )
      .select('id, raw_label')
    if (linesError) return { error: linesError.message }

    ingredientsCrees = await rattacherIngredients(
      deliveryNoteId,
      parsed.lines,
      (inserted ?? []) as { id: string; raw_label: string }[]
    )
  }

  // Même règle que pour les factures : le fournisseur lu est retrouvé par son
  // nom, et créé s'il manque. Le risque assumé est le doublon sur un nom mal
  // lu — rattrapable à la main, contrairement à un prix faux.
  let supplierId: string | null = null
  const supplierName = cleanSupplierName(parsed.supplier_name)
  if (supplierName) {
    const { data: match } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', supplierName)
      .maybeSingle()

    if (match) {
      supplierId = String((match as { id: string }).id)
    } else {
      const { data: cree, error: supplierError } = await supabase
        .from('suppliers')
        .insert({ name: supplierName })
        .select('id')
        .single()

      if (!supplierError) {
        supplierId = String((cree as { id: string }).id)
      } else {
        // Nom pris entre-temps : on rattache à celui qui existe.
        const { data: rattrape } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', supplierName)
          .maybeSingle()
        supplierId = rattrape ? String((rattrape as { id: string }).id) : null
      }
    }
  }

  // `total_cents` du document n'est pas repris : la table des bons n'en a pas.
  // Le total d'un bon valorisé n'est pas une somme due, seule la facture l'est.
  const { error: headerError } = await supabase
    .from('delivery_notes')
    .update({
      supplier_id: supplierId,
      delivery_date: parsed.invoice_date,
      note_number: parsed.invoice_number,
      status: 'a_valider',
      parse_error: null,
      parse_model: outcome.model,
      parsed_at: new Date().toISOString(),
    })
    .eq('id', deliveryNoteId)

  if (headerError) return { error: headerError.message }

  revalidate()
  const suffixe =
    ingredientsCrees > 0
      ? ` ${ingredientsCrees} ingrédient${ingredientsCrees > 1 ? 's' : ''} créé${ingredientsCrees > 1 ? 's' : ''}, sans prix.`
      : ''
  return {
    message:
      parsed.lines.length === 0
        ? 'Lecture terminée, aucune ligne d’article reconnue. À saisir à la main.'
        : `${parsed.lines.length} ligne${parsed.lines.length > 1 ? 's' : ''} lue${parsed.lines.length > 1 ? 's' : ''}. Prix provisoires tant que la facture n’est pas arrivée.${suffixe}`,
  }
}

/**
 * Crée ou retrouve l'ingrédient de chaque ligne, puis l'y rattache.
 *
 * Comme pour les factures, un ingrédient créé ici n'a **aucun prix** — et ce
 * chemin-là en est d'autant plus éloigné : un bon ne produit jamais de prix.
 * Une ligne sans unité reste non rattachée. Renvoie le nombre d'ingrédients
 * réellement créés.
 */
async function rattacherIngredients(
  deliveryNoteId: string,
  lues: {
    raw_label: string
    ingredient_name: string | null
    base_unit: 'g' | 'ml' | 'unit' | null
  }[],
  inserees: { id: string; raw_label: string }[]
): Promise<number> {
  const supabase = createAdminClient()

  // Les lignes insérées reviennent dans l'ordre envoyé ; en cas de doute on
  // rapproche par libellé plutôt que de rattacher au hasard.
  const memeOrdre = inserees.length === lues.length
  const lignes: LinePourIngredient[] = lues.map((line, index) => {
    const correspondante = memeOrdre
      ? inserees[index]
      : inserees.find((row) => row.raw_label === line.raw_label)
    return {
      id: correspondante?.id ?? '',
      raw_label: line.raw_label,
      ingredient_name: line.ingredient_name,
      base_unit: line.base_unit,
    }
  })

  let crees = 0
  for (const groupe of groupLinesForIngredients(lignes.filter((line) => line.id !== ''))) {
    const { data: existant } = await supabase
      .from('ingredients')
      .select('id')
      .ilike('name', groupe.name)
      .maybeSingle()

    let ingredientId = existant ? String((existant as { id: string }).id) : null

    if (!ingredientId) {
      const { data: cree, error } = await supabase
        .from('ingredients')
        .insert({ name: groupe.name, base_unit: groupe.base_unit })
        .select('id')
        .single()

      if (error) {
        // Nom déjà pris entre-temps : on rattache à celui qui existe.
        const { data: rattrape } = await supabase
          .from('ingredients')
          .select('id')
          .ilike('name', groupe.name)
          .maybeSingle()
        if (!rattrape) continue
        ingredientId = String((rattrape as { id: string }).id)
      } else {
        ingredientId = String((cree as { id: string }).id)
        crees += 1
      }
    }

    await supabase
      .from('delivery_note_lines')
      .update({ ingredient_id: ingredientId })
      .in('id', groupe.lineIds)
      .eq('delivery_note_id', deliveryNoteId)
  }

  return crees
}

// ─── Rattachement à une facture ─────────────────────────────────────────────

/**
 * Rattache un bon à une facture.
 *
 * Un fournisseur différent entre les deux documents n'est pas bloquant : le
 * nom du fournisseur peut avoir été mal lu d'un côté, et refuser le
 * rattachement laisserait le bon orphelin pour une raison cosmétique. On le
 * SIGNALE, l'utilisateur tranche.
 */
export async function attachDeliveryNoteToInvoice(
  deliveryNoteId: string,
  invoiceId: unknown
): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = z.string().uuid('Facture invalide.').safeParse(invoiceId)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Facture invalide.' }
  }

  const supabase = createAdminClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, supplier_id, invoice_number')
    .eq('id', parsed.data)
    .maybeSingle()

  if (invoiceError) return { error: invoiceError.message }
  if (!invoice) return { error: 'Cette facture n’existe plus.' }

  const { data: note, error: noteError } = await supabase
    .from('delivery_notes')
    .select('id, supplier_id')
    .eq('id', deliveryNoteId)
    .maybeSingle()

  if (noteError) return { error: noteError.message }
  if (!note) return { error: 'Ce bon de livraison n’existe plus.' }

  const { error } = await supabase
    .from('delivery_notes')
    .update({ invoice_id: parsed.data })
    .eq('id', deliveryNoteId)

  if (error) return { error: error.message }

  revalidate()

  const facture = invoice as { supplier_id: string | null; invoice_number: string | null }
  const bon = note as { supplier_id: string | null }
  const fournisseursDifferents =
    facture.supplier_id !== null && bon.supplier_id !== null && facture.supplier_id !== bon.supplier_id

  const nom = facture.invoice_number ? `nº ${facture.invoice_number}` : 'la facture choisie'
  return {
    message: fournisseursDifferents
      ? `Bon rattaché à ${nom}. Attention : les deux documents ne portent pas le même fournisseur.`
      : `Bon rattaché à ${nom}.`,
  }
}

export async function detachDeliveryNote(deliveryNoteId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('delivery_notes')
    .update({ invoice_id: null })
    .eq('id', deliveryNoteId)

  if (error) return { error: error.message }

  revalidate()
  return { message: 'Bon détaché. Il reste visible parmi les bons en attente.' }
}

export async function deleteDeliveryNote(deliveryNoteId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()

  const { data: note } = await supabase
    .from('delivery_notes')
    .select('image_path')
    .eq('id', deliveryNoteId)
    .maybeSingle()

  const record = note as { image_path: string | null } | null

  // Un bon ne porte aucun prix d'historique : contrairement à une facture
  // validée, le supprimer n'efface rien d'autre que lui-même.
  const { error } = await supabase.from('delivery_notes').delete().eq('id', deliveryNoteId)
  if (error) return { error: error.message }

  if (record?.image_path) {
    await supabase.storage.from(BUCKET).remove([record.image_path])
  }

  revalidate()
  return { message: 'Bon de livraison supprimé.' }
}

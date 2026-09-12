'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardInterface } from '@/lib/interface/auth'
import { isSupportedMediaType, parseInvoiceImage, type InvoiceMediaType } from '@/lib/interface/invoice-parser'

/**
 * Factures : import, lecture automatique, validation.
 *
 * L'invariant du lot vit dans `validateInvoice` : aucun prix n'entre dans
 * l'historique avant confirmation humaine. Tout ce qui précède ne fait que
 * proposer.
 */

type ActionResult = { error?: string; message?: string }

const BUCKET = 'invoices'
/** Au-delà, l'API vision refuse l'image. Mieux vaut le dire que d'échouer après coup. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function revalidate(invoiceId?: string) {
  revalidatePath('/interface/factures')
  revalidatePath('/interface/comparatif')
  revalidatePath('/interface/ingredients')
  revalidatePath('/interface/recettes')
  if (invoiceId) revalidatePath(`/interface/factures/${invoiceId}`)
}

// ─── Fournisseurs ───────────────────────────────────────────────────────────

export async function createSupplier(input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = z
    .object({
      name: z.string().trim().min(2, 'Le nom fait au moins deux caractères.').max(120),
      notes: z.string().trim().max(500).nullable(),
    })
    .safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('suppliers').insert(parsed.data)

  if (error) {
    if (error.code === '23505' || error.message.includes('suppliers_name_unique')) {
      return { error: 'Ce fournisseur existe déjà.' }
    }
    return { error: error.message }
  }

  revalidate()
  return { message: `${parsed.data.name} ajouté.` }
}

// ─── Import d'une photo ─────────────────────────────────────────────────────

/**
 * Reçoit la photo (appareil de l'iPhone ou fichier) et crée la facture au
 * statut `a_lire`. Aucune lecture n'est déclenchée ici : l'import doit
 * réussir même si le parsing est indisponible.
 */
export async function importInvoicePhoto(formData: FormData): Promise<ActionResult & { invoiceId?: string }> {
  const denied = await guardInterface()
  if (denied) return denied

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Aucune photo reçue.' }
  }
  if (!isSupportedMediaType(file.type)) {
    return { error: `Format non pris en charge (${file.type || 'inconnu'}). JPEG, PNG, WebP ou GIF.` }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      error: `Photo trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum 5 Mo : reprends-la de plus loin ou baisse la résolution.`,
    }
  }

  const supabase = createAdminClient()
  const extension = file.type.split('/')[1] ?? 'jpg'
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    // Le bucket privé « invoices » est un prérequis manuel : le dire
    // explicitement évite de chercher ailleurs.
    return {
      error: uploadError.message.toLowerCase().includes('not found')
        ? `Le bucket de stockage « ${BUCKET} » n'existe pas. À créer dans Supabase > Storage, en privé.`
        : `Envoi de la photo impossible : ${uploadError.message}`,
    }
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert({ image_path: path, status: 'a_lire' })
    .select('id')
    .single()

  if (error) {
    // Ne pas laisser une photo orpheline dans le bucket.
    await supabase.storage.from(BUCKET).remove([path])
    return { error: error.message }
  }

  revalidate()
  return { message: 'Photo importée.', invoiceId: String((data as { id: string }).id) }
}

// ─── Lecture automatique ────────────────────────────────────────────────────

/**
 * Lance la lecture de la photo par Claude et écrit les lignes proposées.
 * La facture passe à `a_valider` : rien n'est encore acquis.
 */
export async function parseInvoice(invoiceId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()

  const { data: invoice, error: readError } = await supabase
    .from('invoices')
    .select('id, image_path, status')
    .eq('id', invoiceId)
    .single()

  if (readError) return { error: readError.message }

  const record = invoice as { image_path: string | null; status: string }
  if (record.status === 'validee') {
    return { error: 'Facture déjà validée : relancer la lecture écraserait des prix confirmés.' }
  }
  if (!record.image_path) {
    return { error: 'Cette facture n’a pas de photo.' }
  }

  await supabase.from('invoices').update({ status: 'lecture' }).eq('id', invoiceId)

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(record.image_path)

  if (downloadError || !blob) {
    await supabase
      .from('invoices')
      .update({ status: 'echec', parse_error: downloadError?.message ?? 'Photo introuvable.' })
      .eq('id', invoiceId)
    revalidate(invoiceId)
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
      .from('invoices')
      .update({
        // « Indisponible » n'est pas un échec de lecture : la facture reste
        // à lire, et les lignes pourront être saisies à la main.
        status: outcome.status === 'unavailable' ? 'a_lire' : 'echec',
        parse_error: outcome.reason,
      })
      .eq('id', invoiceId)
    revalidate(invoiceId)
    return { error: outcome.reason }
  }

  const parsed = outcome.invoice

  // Remplace les lignes proposées précédemment, sans toucher à une validation.
  await supabase.from('invoice_lines').delete().eq('invoice_id', invoiceId)

  if (parsed.lines.length > 0) {
    const { error: linesError } = await supabase.from('invoice_lines').insert(
      parsed.lines.map((line) => ({
        invoice_id: invoiceId,
        raw_label: line.raw_label,
        quantity: line.quantity,
        pack_quantity: line.pack_quantity,
        base_unit: line.base_unit,
        pack_price_cents: line.pack_price_cents,
        line_total_cents: line.line_total_cents,
        confidence: line.confidence,
      }))
    )
    if (linesError) return { error: linesError.message }
  }

  // Le fournisseur lu est rapproché d'un fournisseur existant par son nom.
  // Jamais créé automatiquement : un nom mal lu créerait un doublon durable.
  let supplierId: string | null = null
  if (parsed.supplier_name) {
    const { data: match } = await supabase
      .from('suppliers')
      .select('id')
      .ilike('name', parsed.supplier_name)
      .maybeSingle()
    supplierId = match ? String((match as { id: string }).id) : null
  }

  const { error: headerError } = await supabase
    .from('invoices')
    .update({
      supplier_id: supplierId,
      invoice_date: parsed.invoice_date,
      invoice_number: parsed.invoice_number,
      total_cents: parsed.total_cents,
      status: 'a_valider',
      parse_error: null,
      parse_model: outcome.model,
      parsed_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  if (headerError) return { error: headerError.message }

  revalidate(invoiceId)
  return {
    message:
      parsed.lines.length === 0
        ? 'Lecture terminée, aucune ligne d’article reconnue. À saisir à la main.'
        : `${parsed.lines.length} ligne${parsed.lines.length > 1 ? 's' : ''} proposée${parsed.lines.length > 1 ? 's' : ''}. À vérifier avant validation.`,
  }
}

// ─── Corrections avant validation ───────────────────────────────────────────

export async function updateInvoiceHeader(
  invoiceId: string,
  input: unknown
): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = z
    .object({
      supplier_id: z.string().uuid().nullable(),
      invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ').nullable(),
      invoice_number: z.string().trim().max(60).nullable(),
      total_cents: z.number().int().nonnegative().nullable(),
    })
    .safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('invoices').update(parsed.data).eq('id', invoiceId)

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ce numéro de facture est déjà enregistré pour ce fournisseur.' }
    }
    return { error: error.message }
  }

  revalidate(invoiceId)
  return { message: 'Facture mise à jour.' }
}

export async function updateInvoiceLine(lineId: string, input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = z
    .object({
      pack_quantity: z.number().finite().positive().nullable(),
      base_unit: z.enum(['g', 'ml', 'unit']).nullable(),
      pack_price_cents: z.number().int().nonnegative().nullable(),
      ingredient_id: z.string().uuid().nullable(),
    })
    .safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()
  // Une correction humaine efface la confiance de l'IA : la valeur n'est
  // plus une proposition, elle est constatée.
  const { error } = await supabase
    .from('invoice_lines')
    .update({ ...parsed.data, confidence: null })
    .eq('id', lineId)
    .select('invoice_id')
    .single()

  if (error) return { error: error.message }

  revalidate()
  return { message: 'Ligne corrigée.' }
}

/**
 * Crée un ingrédient à partir d'une ligne de facture et l'y rattache.
 * C'est le chemin normal d'entrée des ingrédients : ils viennent des
 * factures, pas d'une saisie séparée.
 */
export async function createIngredientFromLine(
  lineId: string,
  input: unknown
): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = z
    .object({
      name: z.string().trim().min(2, 'Le nom fait au moins deux caractères.').max(120),
      base_unit: z.enum(['g', 'ml', 'unit']),
      category: z
        .enum(['legume', 'fruit', 'viande', 'poisson', 'cremerie', 'boulangerie', 'epicerie', 'boisson', 'emballage', 'autre'])
        .nullable(),
    })
    .safeParse(input)

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()

  // Le prix n'est PAS posé ici : il viendra de la validation de la facture,
  // avec sa provenance et sa date. Créer l'ingrédient avec un prix « manuel »
  // le ferait passer pour déclaratif alors qu'il est sur un document.
  const { data, error } = await supabase
    .from('ingredients')
    .insert({ name: parsed.data.name, base_unit: parsed.data.base_unit, category: parsed.data.category })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505' || error.message.includes('ingredients_name_unique')) {
      return { error: 'Un ingrédient porte déjà ce nom. Rattache la ligne à celui-là.' }
    }
    return { error: error.message }
  }

  const ingredientId = String((data as { id: string }).id)
  const { error: linkError } = await supabase
    .from('invoice_lines')
    .update({ ingredient_id: ingredientId })
    .eq('id', lineId)

  if (linkError) return { error: linkError.message }

  revalidate()
  return { message: `${parsed.data.name} créé et rattaché.` }
}

export async function deleteInvoiceLine(lineId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  const { error } = await supabase.from('invoice_lines').delete().eq('id', lineId)
  if (error) return { error: error.message }

  revalidate()
  return { message: 'Ligne retirée.' }
}

// ─── Validation : le seul endroit qui écrit des prix ────────────────────────

/**
 * Confirme la facture et enregistre ses prix.
 *
 * Refuse tant que le fournisseur ou la date manquent : un prix sans
 * fournisseur ne se compare pas, un prix sans date ne se situe pas dans le
 * temps — et les deux servent précisément à ça.
 *
 * Le prix courant d'un ingrédient est ensuite recalculé depuis le relevé le
 * plus récent de son historique, pas depuis cette facture : importer en juin
 * une facture de mars ne doit pas ramener le coût de revient à mars.
 */
export async function validateInvoice(invoiceId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()

  const { data: invoiceRow, error: readError } = await supabase
    .from('invoices')
    .select('id, supplier_id, invoice_date, status')
    .eq('id', invoiceId)
    .single()

  if (readError) return { error: readError.message }

  const invoice = invoiceRow as {
    supplier_id: string | null
    invoice_date: string | null
    status: string
  }

  if (invoice.status === 'validee') {
    return { error: 'Facture déjà validée.' }
  }

  const missing: string[] = []
  if (!invoice.supplier_id) missing.push('le fournisseur')
  if (!invoice.invoice_date) missing.push('la date de la facture')
  if (missing.length > 0) {
    return {
      error: `Impossible de valider sans ${missing.join(' et ')} : un prix sans fournisseur ne se compare pas, un prix sans date ne se situe pas dans le temps.`,
    }
  }

  const { data: lineRows, error: linesError } = await supabase
    .from('invoice_lines')
    .select('id, raw_label, ingredient_id, pack_quantity, pack_price_cents')
    .eq('invoice_id', invoiceId)

  if (linesError) return { error: linesError.message }

  const usable: {
    id: string
    ingredient_id: string
    pack_quantity: number
    pack_price_cents: number
  }[] = []
  const ignored: string[] = []

  for (const row of lineRows ?? []) {
    const line = row as {
      id: string
      raw_label: string
      ingredient_id: string | null
      pack_quantity: number | null
      pack_price_cents: number | null
    }
    const quantity = line.pack_quantity === null ? null : Number(line.pack_quantity)
    const price = line.pack_price_cents === null ? null : Number(line.pack_price_cents)

    if (!line.ingredient_id || quantity === null || quantity <= 0 || price === null) {
      ignored.push(line.raw_label)
      continue
    }
    usable.push({
      id: line.id,
      ingredient_id: line.ingredient_id,
      pack_quantity: quantity,
      pack_price_cents: price,
    })
  }

  if (usable.length === 0) {
    return {
      error:
        'Aucune ligne exploitable : il faut un ingrédient rattaché, un conditionnement et un prix. Rien n’a été enregistré.',
    }
  }

  const { error: priceError } = await supabase.from('ingredient_prices').insert(
    usable.map((line) => ({
      ingredient_id: line.ingredient_id,
      supplier_id: invoice.supplier_id,
      invoice_line_id: line.id,
      price_per_base_unit: line.pack_price_cents / line.pack_quantity,
      pack_quantity: line.pack_quantity,
      pack_price_cents: line.pack_price_cents,
      observed_on: invoice.invoice_date,
    }))
  )

  if (priceError) return { error: `Enregistrement des prix impossible : ${priceError.message}` }

  // Prix courant = relevé le plus récent de l'historique, toutes factures
  // confondues. Une facture ancienne importée tardivement n'écrase donc rien.
  for (const ingredientId of new Set(usable.map((line) => line.ingredient_id))) {
    const { data: latest } = await supabase
      .from('ingredient_prices')
      .select('pack_quantity, pack_price_cents, observed_on')
      .eq('ingredient_id', ingredientId)
      .order('observed_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latest) continue
    const price = latest as { pack_quantity: number; pack_price_cents: number }

    await supabase
      .from('ingredients')
      .update({
        pack_quantity: price.pack_quantity,
        pack_price_cents: price.pack_price_cents,
        price_source: 'facture',
        price_updated_at: new Date().toISOString(),
      })
      .eq('id', ingredientId)
  }

  const { error: statusError } = await supabase
    .from('invoices')
    .update({ status: 'validee', validated_at: new Date().toISOString() })
    .eq('id', invoiceId)

  if (statusError) return { error: statusError.message }

  revalidate(invoiceId)
  return {
    message:
      ignored.length > 0
        ? `${usable.length} prix enregistré${usable.length > 1 ? 's' : ''}. Ignoré${ignored.length > 1 ? 's' : ''} faute d’ingrédient ou de prix : ${ignored.join(', ')}.`
        : `${usable.length} prix enregistré${usable.length > 1 ? 's' : ''}.`,
  }
}

export async function deleteInvoice(invoiceId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('image_path, status')
    .eq('id', invoiceId)
    .maybeSingle()

  const record = invoice as { image_path: string | null; status: string } | null

  if (record?.status === 'validee') {
    return {
      error:
        'Facture validée : la supprimer effacerait des prix de l’historique. Elle reste comme trace du document.',
    }
  }

  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
  if (error) return { error: error.message }

  if (record?.image_path) {
    await supabase.storage.from(BUCKET).remove([record.image_path])
  }

  revalidate()
  return { message: 'Facture supprimée.' }
}

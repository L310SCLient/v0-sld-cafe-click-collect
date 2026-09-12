'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardInterface } from '@/lib/interface/auth'
import {
  fileKind,
  parseRecipeFile,
  unsupportedFileMessage,
  type RecipeFileKind,
} from '@/lib/interface/recipe-parser'
import {
  buildIngredientDictionary,
  matchExistingRecipe,
  normalizeKey,
  splitLines,
  type ParsedLine,
} from '@/lib/interface/recipe-import'

/**
 * Import de recettes par fichier.
 *
 * L'invariant du lot vit dans `validateStagedRecipe` : rien n'entre dans
 * `recipes` ni `recipe_items` avant confirmation humaine, en deux temps —
 * d'abord les ingrédients du lot, ensuite chaque recette. Tout ce qui précède
 * ne fait que proposer, dans les tables `recipe_import_*`.
 */

type ActionResult = { error?: string; message?: string }

const BUCKET = 'recipe-files'
/** Une fiche scannée en PDF pèse plus lourd qu'une photo de facture. */
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_FILES = 40

function revalidate(importId?: string) {
  revalidatePath('/interface/recettes')
  revalidatePath('/interface/ingredients')
  if (importId) revalidatePath(`/interface/recettes/imports/${importId}`)
}

// ─── Envoi des fichiers ─────────────────────────────────────────────────────

export async function startRecipeImport(
  formData: FormData
): Promise<ActionResult & { importId?: string; rejected?: string[] }> {
  const denied = await guardInterface()
  if (denied) return denied

  const files = formData.getAll('files').filter((item): item is File => item instanceof File)
  if (files.length === 0) return { error: 'Aucun fichier reçu.' }
  if (files.length > MAX_FILES) {
    return { error: `${files.length} fichiers d'un coup, c'est trop. Maximum ${MAX_FILES} par lot.` }
  }

  const accepted: { file: File; kind: RecipeFileKind }[] = []
  const rejected: string[] = []

  for (const file of files) {
    if (file.size === 0) continue
    const kind = fileKind(file.type, file.name)
    if (!kind) {
      rejected.push(unsupportedFileMessage(file.name))
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      rejected.push(
        `« ${file.name} » pèse ${(file.size / 1024 / 1024).toFixed(1)} Mo. Maximum 10 Mo par fichier.`
      )
      continue
    }
    accepted.push({ file, kind })
  }

  if (accepted.length === 0) {
    return { error: rejected[0] ?? 'Aucun fichier lisible dans cet envoi.', rejected }
  }

  const supabase = createAdminClient()
  const { data: created, error: importError } = await supabase
    .from('recipe_imports')
    .insert({ status: 'a_lire' })
    .select('id')
    .single()

  if (importError) return { error: importError.message }
  const importId = String((created as { id: string }).id)

  const uploaded: string[] = []
  for (const { file } of accepted) {
    const path = `${importId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, '_')}`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })

    if (uploadError) {
      // Ne pas laisser de fichiers orphelins ni un lot vide derrière soi.
      if (uploaded.length > 0) await supabase.storage.from(BUCKET).remove(uploaded)
      await supabase.from('recipe_imports').delete().eq('id', importId)
      return {
        error: uploadError.message.toLowerCase().includes('not found')
          ? `Le bucket « ${BUCKET} » n'existe pas. À créer dans Supabase > Storage, en privé.`
          : `Envoi impossible : ${uploadError.message}`,
      }
    }
    uploaded.push(path)

    const { error: rowError } = await supabase.from('recipe_import_files').insert({
      import_id: importId,
      file_path: path,
      original_name: file.name,
      media_type: file.type || 'application/octet-stream',
      status: 'a_lire',
    })
    if (rowError) return { error: rowError.message }
  }

  revalidate(importId)
  return {
    importId,
    rejected,
    message: `${accepted.length} fichier${accepted.length > 1 ? 's' : ''} envoyé${accepted.length > 1 ? 's' : ''}.`,
  }
}

// ─── Lecture ────────────────────────────────────────────────────────────────

/**
 * Lit chaque fichier du lot et écrit les recettes proposées dans la zone
 * d'attente. Un fichier illisible n'arrête pas le lot : il porte sa raison.
 */
export async function parseRecipeImport(importId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  await supabase.from('recipe_imports').update({ status: 'lecture' }).eq('id', importId)

  const { data: files, error: filesError } = await supabase
    .from('recipe_import_files')
    .select('*')
    .eq('import_id', importId)
    .order('created_at', { ascending: true })

  if (filesError) return { error: filesError.message }

  const { data: existingRecipes } = await supabase.from('recipes').select('id, name')
  const { data: existingIngredients } = await supabase
    .from('ingredients')
    .select('id, name, base_unit')
    .eq('is_active', true)

  const staged: { lines: ParsedLine[] }[] = []
  let model: string | null = null
  let lu = 0
  let echoue = 0
  let premierEchec: string | null = null

  for (const row of (files ?? []) as Record<string, string>[]) {
    const kind = fileKind(row.media_type, row.original_name)
    if (!kind) {
      echoue += 1
      premierEchec ??= unsupportedFileMessage(row.original_name)
      await supabase
        .from('recipe_import_files')
        .update({ status: 'echec', parse_error: unsupportedFileMessage(row.original_name) })
        .eq('id', row.id)
      continue
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(row.file_path)

    if (downloadError || !blob) {
      echoue += 1
      premierEchec ??= downloadError?.message ?? 'Fichier introuvable dans le stockage.'
      await supabase
        .from('recipe_import_files')
        .update({ status: 'echec', parse_error: premierEchec })
        .eq('id', row.id)
      continue
    }

    const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
    const outcome = await parseRecipeFile({
      base64,
      mediaType: row.media_type,
      fileName: row.original_name,
      kind,
    })

    if (outcome.status !== 'ok') {
      echoue += 1
      premierEchec ??= outcome.reason
      await supabase
        .from('recipe_import_files')
        .update({ status: 'echec', parse_error: outcome.reason })
        .eq('id', row.id)
      continue
    }

    model = outcome.model
    lu += 1

    for (const card of outcome.file.recipes) {
      const { data: stagedRecipe, error: recipeError } = await supabase
        .from('recipe_import_recipes')
        .insert({
          import_id: importId,
          file_id: row.id,
          raw_name: card.name,
          matched_recipe_id: matchExistingRecipe(
            card.name,
            (existingRecipes ?? []) as { id: string; name: string }[]
          ),
          portions: card.portions,
          portions_read: card.portions_read,
          notes: card.notes,
          confidence: card.confidence,
          status: 'a_valider',
        })
        .select('id')
        .single()

      if (recipeError) return { error: recipeError.message }
      const stagedId = String((stagedRecipe as { id: string }).id)

      const lines = card.lines.map((line) => ({
        staged_recipe_id: stagedId,
        raw_label: line.raw_label,
        raw_quantity: line.raw_quantity,
        quantity: line.quantity,
        base_unit: line.base_unit,
        normalized_name: normalizeKey(line.raw_label),
        confidence: line.confidence,
      }))

      if (lines.length > 0) {
        const { error: linesError } = await supabase.from('recipe_import_lines').insert(lines)
        if (linesError) return { error: linesError.message }
      }
      staged.push({ lines: card.lines })
    }

    await supabase
      .from('recipe_import_files')
      .update({ status: 'lue', parsed_at: new Date().toISOString(), parse_error: null })
      .eq('id', row.id)
  }

  if (lu === 0) {
    await supabase
      .from('recipe_imports')
      .update({ status: 'echec', parse_error: premierEchec, parsed_at: new Date().toISOString() })
      .eq('id', importId)
    revalidate(importId)
    return { error: premierEchec ?? 'Aucun fichier lisible dans ce lot.' }
  }

  const dictionary = buildIngredientDictionary(
    staged,
    (existingIngredients ?? []) as { id: string; name: string; base_unit: 'g' | 'ml' | 'unit' }[]
  )

  if (dictionary.length > 0) {
    const { error: dictError } = await supabase.from('recipe_import_ingredients').insert(
      dictionary.map((entry) => ({
        import_id: importId,
        raw_name: entry.raw_name,
        normalized_name: entry.normalized_name,
        base_unit: entry.base_unit,
        ingredient_id: entry.ingredient_id,
        decision: entry.decision,
        occurrences: entry.occurrences,
      }))
    )
    if (dictError) return { error: dictError.message }
  }

  await supabase
    .from('recipe_imports')
    .update({
      status: 'ingredients_a_valider',
      parse_model: model,
      parsed_at: new Date().toISOString(),
      parse_error: echoue > 0 ? `${echoue} fichier(s) illisible(s) dans ce lot.` : null,
    })
    .eq('id', importId)

  revalidate(importId)
  return {
    message: `${lu} fichier${lu > 1 ? 's' : ''} lu${lu > 1 ? 's' : ''}${echoue > 0 ? `, ${echoue} en échec` : ''}.`,
  }
}

// ─── Écran 1 : les ingrédients du lot ───────────────────────────────────────

export async function updateImportIngredient(id: string, input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = z
    .object({
      raw_name: z.string().trim().min(2, 'Le nom fait au moins deux caractères.').max(120),
      base_unit: z.enum(['g', 'ml', 'unit']).nullable(),
      ingredient_id: z.string().uuid().nullable(),
      decision: z.enum(['creer', 'rattacher', 'ignorer']),
    })
    .safeParse(input)

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  if (parsed.data.decision === 'rattacher' && !parsed.data.ingredient_id) {
    return { error: 'Choisis l’ingrédient existant auquel rattacher ce nom.' }
  }

  const supabase = createAdminClient()
  const { data: updated, error } = await supabase
    .from('recipe_import_ingredients')
    .update(parsed.data)
    .eq('id', id)
    .select('import_id')
    .single()

  if (error) return { error: error.message }
  revalidate(String((updated as { import_id: string }).import_id))
  return { message: 'Ingrédient mis à jour.' }
}

/**
 * Crée les ingrédients manquants — sans prix, le prix ne venant que d'une
 * facture validée — puis rattache toutes les lignes du lot.
 */
export async function validateImportIngredients(importId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  const { data: entries, error } = await supabase
    .from('recipe_import_ingredients')
    .select('*')
    .eq('import_id', importId)

  if (error) return { error: error.message }

  const sansUnite = (entries ?? []).filter(
    (entry) => (entry as Record<string, unknown>).decision === 'creer' && !(entry as Record<string, unknown>).base_unit
  )
  if (sansUnite.length > 0) {
    const noms = sansUnite.map((e) => (e as Record<string, string>).raw_name).slice(0, 3).join(', ')
    return {
      error: `Choisis une unité pour ${sansUnite.length} ingrédient(s) avant de valider : ${noms}${sansUnite.length > 3 ? '…' : ''}.`,
    }
  }

  for (const row of (entries ?? []) as Record<string, string | null>[]) {
    if (row.decision !== 'creer') continue

    const { data: created, error: insertError } = await supabase
      .from('ingredients')
      .insert({ name: row.raw_name, base_unit: row.base_unit })
      .select('id')
      .single()

    if (insertError) {
      // Nom déjà pris : on rattache plutôt que d'échouer.
      const { data: existing } = await supabase
        .from('ingredients')
        .select('id')
        .ilike('name', String(row.raw_name))
        .maybeSingle()
      if (!existing) return { error: insertError.message }
      await supabase
        .from('recipe_import_ingredients')
        .update({ ingredient_id: (existing as { id: string }).id, decision: 'rattacher' })
        .eq('id', row.id as string)
      continue
    }

    await supabase
      .from('recipe_import_ingredients')
      .update({ ingredient_id: (created as { id: string }).id })
      .eq('id', row.id as string)
  }

  // Rattachement des lignes, par clé normalisée.
  const { data: finalEntries } = await supabase
    .from('recipe_import_ingredients')
    .select('normalized_name, ingredient_id')
    .eq('import_id', importId)

  const { data: stagedRecipes } = await supabase
    .from('recipe_import_recipes')
    .select('id')
    .eq('import_id', importId)

  const stagedIds = (stagedRecipes ?? []).map((row) => (row as { id: string }).id)

  for (const entry of (finalEntries ?? []) as { normalized_name: string; ingredient_id: string | null }[]) {
    if (!entry.ingredient_id || stagedIds.length === 0) continue
    await supabase
      .from('recipe_import_lines')
      .update({ ingredient_id: entry.ingredient_id })
      .in('staged_recipe_id', stagedIds)
      .eq('normalized_name', entry.normalized_name)
  }

  await supabase
    .from('recipe_imports')
    .update({ status: 'recettes_a_valider' })
    .eq('id', importId)

  revalidate(importId)
  return { message: 'Ingrédients validés. Passe aux recettes.' }
}

// ─── Écran 2 : les recettes ─────────────────────────────────────────────────

export async function updateStagedRecipe(id: string, input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = z
    .object({
      raw_name: z.string().trim().min(2, 'Le nom fait au moins deux caractères.').max(200),
      portions: z.number().int().positive().nullable(),
      matched_recipe_id: z.string().uuid().nullable(),
    })
    .safeParse(input)

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }

  const supabase = createAdminClient()
  const { data: updated, error } = await supabase
    .from('recipe_import_recipes')
    .update({ ...parsed.data, portions_read: parsed.data.portions !== null })
    .eq('id', id)
    .select('import_id')
    .single()

  if (error) return { error: error.message }
  revalidate(String((updated as { import_id: string }).import_id))
  return { message: 'Recette mise à jour.' }
}

export async function updateStagedLine(id: string, input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = z
    .object({
      quantity: z.number().positive().nullable(),
      base_unit: z.enum(['g', 'ml', 'unit']).nullable(),
      ingredient_id: z.string().uuid().nullable(),
    })
    .safeParse(input)

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('recipe_import_lines').update(parsed.data).eq('id', id)
  if (error) return { error: error.message }

  revalidate()
  return { message: 'Ligne mise à jour.' }
}

export async function ignoreStagedRecipe(id: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  const { data: updated, error } = await supabase
    .from('recipe_import_recipes')
    .update({ status: 'ignoree' })
    .eq('id', id)
    .select('import_id')
    .single()

  if (error) return { error: error.message }
  revalidate(String((updated as { import_id: string }).import_id))
  return { message: 'Fiche ignorée.' }
}

/**
 * Écrit une recette proposée dans `recipes` / `recipe_items`.
 *
 * Les lignes non chiffrables partent dans `recipe_missing_items` : la recette
 * est alors incomplète et son coût ne s'affiche pas. Une ligne dont l'unité
 * contredit celle de son ingrédient est traitée de la même façon : convertir
 * des grammes en millilitres serait une invention.
 */
export async function validateStagedRecipe(id: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  const { data: staged, error } = await supabase
    .from('recipe_import_recipes')
    .select('*, lines:recipe_import_lines(*)')
    .eq('id', id)
    .single()

  if (error) return { error: error.message }

  const row = staged as Record<string, unknown> & {
    lines: {
      id: string
      raw_label: string
      raw_quantity: string | null
      quantity: number | null
      base_unit: 'g' | 'ml' | 'unit' | null
      ingredient_id: string | null
    }[]
  }

  const importId = String(row.import_id)
  const portions = typeof row.portions === 'number' ? row.portions : null

  // Unité de chaque ingrédient : elle fait foi.
  const ingredientIds = [...new Set(row.lines.map((l) => l.ingredient_id).filter(Boolean))] as string[]
  const { data: ingredients } = ingredientIds.length
    ? await supabase.from('ingredients').select('id, base_unit').in('id', ingredientIds)
    : { data: [] as { id: string; base_unit: string }[] }
  const unitById = new Map(
    ((ingredients ?? []) as { id: string; base_unit: string }[]).map((i) => [i.id, i.base_unit])
  )

  const { chiffrables, misesDeCote } = splitLines(
    row.lines.map((line) => ({
      raw_label: line.raw_label,
      raw_quantity: line.raw_quantity,
      quantity: line.quantity,
      base_unit: line.base_unit,
    }))
  )
  const chiffrableLabels = new Set(chiffrables.map((line) => line.raw_label))

  const retenues = new Map<string, number>()
  const manquantes: { ingredient_id: string | null; raw_label: string; raw_quantity: string | null }[] = []

  for (const line of row.lines) {
    if (!line.ingredient_id) continue // ingrédient volontairement ignoré
    const unitOk = unitById.get(line.ingredient_id) === line.base_unit
    if (chiffrableLabels.has(line.raw_label) && unitOk && typeof line.quantity === 'number') {
      retenues.set(line.ingredient_id, (retenues.get(line.ingredient_id) ?? 0) + line.quantity)
    } else {
      manquantes.push({
        ingredient_id: line.ingredient_id,
        raw_label: line.raw_label,
        raw_quantity: line.raw_quantity ?? (unitOk ? null : 'unité incompatible avec l’ingrédient'),
      })
    }
  }
  void misesDeCote

  let recipeId = row.matched_recipe_id ? String(row.matched_recipe_id) : null

  if (recipeId) {
    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        portions: portions ?? 1,
        portions_confirmed: portions !== null,
      })
      .eq('id', recipeId)
    if (updateError) return { error: updateError.message }
  } else {
    const { data: created, error: insertError } = await supabase
      .from('recipes')
      .insert({
        name: String(row.raw_name),
        portions: portions ?? 1,
        portions_confirmed: portions !== null,
      })
      .select('id')
      .single()

    if (insertError) {
      return {
        error: insertError.code === '23505'
          ? `Une recette porte déjà le nom « ${String(row.raw_name)} ». Rattache la fiche à celle-là ou renomme-la.`
          : insertError.message,
      }
    }
    recipeId = String((created as { id: string }).id)
  }

  for (const [ingredientId, quantity] of retenues) {
    const { error: itemError } = await supabase
      .from('recipe_items')
      .upsert({ recipe_id: recipeId, ingredient_id: ingredientId, quantity }, { onConflict: 'recipe_id,ingredient_id' })
    if (itemError) return { error: itemError.message }
  }

  if (manquantes.length > 0) {
    const { error: missingError } = await supabase
      .from('recipe_missing_items')
      .insert(manquantes.map((item) => ({ ...item, recipe_id: recipeId })))
    if (missingError) return { error: missingError.message }
  }

  await supabase.from('recipe_import_recipes').update({ status: 'validee' }).eq('id', id)

  const { data: restantes } = await supabase
    .from('recipe_import_recipes')
    .select('id')
    .eq('import_id', importId)
    .eq('status', 'a_valider')

  if ((restantes ?? []).length === 0) {
    await supabase
      .from('recipe_imports')
      .update({ status: 'terminee', validated_at: new Date().toISOString() })
      .eq('id', importId)
  }

  revalidate(importId)
  return {
    message:
      manquantes.length > 0
        ? `Recette écrite, ${manquantes.length} ligne(s) laissée(s) de côté.`
        : 'Recette écrite.',
  }
}

export async function validateAllStagedRecipes(importId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  const { data: staged, error } = await supabase
    .from('recipe_import_recipes')
    .select('id')
    .eq('import_id', importId)
    .eq('status', 'a_valider')
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }

  let ecrites = 0
  const echecs: string[] = []
  for (const row of (staged ?? []) as { id: string }[]) {
    const result = await validateStagedRecipe(row.id)
    if (result.error) echecs.push(result.error)
    else ecrites += 1
  }

  revalidate(importId)
  if (ecrites === 0 && echecs.length > 0) return { error: echecs[0] }
  return {
    message: `${ecrites} recette${ecrites > 1 ? 's' : ''} écrite${ecrites > 1 ? 's' : ''}${echecs.length > 0 ? `, ${echecs.length} en attente` : ''}.`,
  }
}

export async function deleteRecipeImport(importId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  const { data: files } = await supabase
    .from('recipe_import_files')
    .select('file_path')
    .eq('import_id', importId)

  const paths = (files ?? []).map((row) => (row as { file_path: string }).file_path)
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths)

  const { error } = await supabase.from('recipe_imports').delete().eq('id', importId)
  if (error) return { error: error.message }

  revalidate()
  return { message: 'Lot supprimé.' }
}

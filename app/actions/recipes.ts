'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardInterface } from '@/lib/interface/auth'

type ActionResult = { error?: string; message?: string }

const recipeSchema = z.object({
  name: z.string().trim().min(2, 'Le nom fait au moins deux caractères.').max(120),
  /** Rattachement optionnel au catalogue : chaîne vide = non rattachée. */
  product_id: z.string().uuid().nullable(),
  portions: z.number().int().positive('Le nombre de portions vaut au moins 1.'),
  notes: z.string().trim().max(1000).nullable(),
})

function revalidate() {
  revalidatePath('/interface/recettes')
}

function uniqueNameError(error: { code?: string; message: string }): string | null {
  if (error.code === '23505' || error.message.includes('recipes_name_unique')) {
    return 'Une recette porte déjà ce nom.'
  }
  return null
}

export async function createRecipe(input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = recipeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('recipes').insert(parsed.data)

  if (error) return { error: uniqueNameError(error) ?? error.message }

  revalidate()
  return { message: `${parsed.data.name} créée.` }
}

export async function updateRecipe(recipeId: string, input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = recipeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('recipes').update(parsed.data).eq('id', recipeId)

  if (error) return { error: uniqueNameError(error) ?? error.message }

  revalidate()
  return { message: `${parsed.data.name} mise à jour.` }
}

/** Retire la recette de la liste. Ses lignes restent en base. */
export async function deactivateRecipe(recipeId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('recipes')
    .update({ is_active: false })
    .eq('id', recipeId)

  if (error) return { error: error.message }

  revalidate()
  return { message: 'Recette retirée de la liste.' }
}

const recipeItemSchema = z.object({
  recipe_id: z.string().uuid(),
  ingredient_id: z.string().uuid(),
  /** Quantité pour la recette entière, dans l'unité de base de l'ingrédient. */
  quantity: z.number().finite().positive('La quantité doit être supérieure à zéro.'),
})

/**
 * Ajoute un ingrédient à une recette, ou met à jour sa quantité s'il y est
 * déjà : la contrainte `UNIQUE (recipe_id, ingredient_id)` interdit qu'un même
 * ingrédient apparaisse deux fois dans une recette, ce qui doublerait son coût.
 */
export async function upsertRecipeItem(input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = recipeItemSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('recipe_items')
    .upsert(parsed.data, { onConflict: 'recipe_id,ingredient_id' })

  if (error) return { error: error.message }

  revalidate()
  return { message: 'Ingrédient enregistré dans la recette.' }
}

export async function removeRecipeItem(itemId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()
  const { error } = await supabase.from('recipe_items').delete().eq('id', itemId)

  if (error) return { error: error.message }

  revalidate()
  return { message: 'Ingrédient retiré de la recette.' }
}

const fromProductsSchema = z.object({
  product_ids: z.array(z.string().uuid()).min(1, 'Choisis au moins un produit.').max(300),
})

/**
 * Crée les recettes manquantes depuis les produits du catalogue.
 *
 * Une recette porte le nom du produit et lui est rattachée d'emblée : c'est
 * le rattachement qui permettra la marge et la déduction du stock par les
 * ventes. Les produits dont le nom est déjà pris par une recette existante
 * sont ignorés et signalés — plutôt que de faire échouer tout le lot, ou de
 * créer un doublon silencieux.
 */
export async function createRecipesFromProducts(input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = fromProductsSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()

  const [products, existing] = await Promise.all([
    supabase.from('products').select('id, name').in('id', parsed.data.product_ids),
    supabase.from('recipes').select('name, product_id'),
  ])

  if (products.error) return { error: products.error.message }
  if (existing.error) return { error: existing.error.message }

  const takenNames = new Set(
    (existing.data ?? []).map((row) =>
      String((row as { name: string }).name).toLowerCase()
    )
  )
  const coveredProducts = new Set(
    (existing.data ?? [])
      .map((row) => (row as { product_id: string | null }).product_id)
      .filter((id): id is string => Boolean(id))
  )

  const skipped: string[] = []
  const toInsert: { name: string; product_id: string; portions: number }[] = []

  for (const row of products.data ?? []) {
    const product = row as { id: string; name: string }
    if (coveredProducts.has(product.id)) continue
    if (takenNames.has(product.name.toLowerCase())) {
      skipped.push(product.name)
      continue
    }
    toInsert.push({ name: product.name, product_id: product.id, portions: 1 })
  }

  if (toInsert.length === 0) {
    return {
      error:
        skipped.length > 0
          ? `Rien à créer : une recette porte déjà ce nom (${skipped.join(', ')}).`
          : 'Rien à créer : ces produits ont déjà une recette.',
    }
  }

  const { error } = await supabase.from('recipes').insert(toInsert)
  if (error) return { error: error.message }

  revalidate()
  const created = `${toInsert.length} recette${toInsert.length > 1 ? 's' : ''} créée${toInsert.length > 1 ? 's' : ''}`
  return {
    message:
      skipped.length > 0
        ? `${created}. Ignoré${skipped.length > 1 ? 's' : ''} (nom déjà pris) : ${skipped.join(', ')}.`
        : `${created}.`,
  }
}

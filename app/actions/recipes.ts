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

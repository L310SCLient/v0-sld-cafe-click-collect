'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { guardInterface } from '@/lib/interface/auth'
import { inventoryDelta } from '@/lib/interface/cost'
import { formatQuantity } from '@/lib/interface/units'

/**
 * Écritures sur les ingrédients et le stock.
 *
 * Chaque action revérifie le cookie de session : une server action est un
 * endpoint HTTP public, le garde du layout ne la protège pas.
 */

type ActionResult = { error?: string; message?: string }

const unitSchema = z.enum(['g', 'ml', 'unit'])

const priceSchema = z
  .object({
    pack_quantity: z.number().finite().positive(),
    pack_price_cents: z.number().int().nonnegative(),
  })
  .nullable()

const ingredientSchema = z.object({
  name: z.string().trim().min(2, 'Le nom fait au moins deux caractères.').max(120),
  base_unit: unitSchema,
  price: priceSchema,
})

/** Le prix est un triplet indivisible : quantité + montant + provenance. */
function priceColumns(price: z.infer<typeof priceSchema>) {
  if (price === null) {
    return {
      pack_quantity: null,
      pack_price_cents: null,
      price_source: null,
      price_updated_at: null,
    }
  }
  return {
    pack_quantity: price.pack_quantity,
    pack_price_cents: price.pack_price_cents,
    // Tant que le lot Factures n'existe pas, un prix saisi ici est déclaratif
    // et doit être étiqueté comme tel à l'écran.
    price_source: 'manuelle' as const,
    price_updated_at: new Date().toISOString(),
  }
}

function revalidate() {
  revalidatePath('/interface/ingredients')
  revalidatePath('/interface/recettes')
}

export async function createIngredient(input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = ingredientSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('ingredients').insert({
    name: parsed.data.name,
    base_unit: parsed.data.base_unit,
    ...priceColumns(parsed.data.price),
  })

  if (error) {
    if (error.code === '23505' || error.message.includes('ingredients_name_unique')) {
      return { error: 'Un ingrédient porte déjà ce nom.' }
    }
    return { error: error.message }
  }

  revalidate()
  return { message: `${parsed.data.name} ajouté.` }
}

export async function updateIngredient(
  ingredientId: string,
  input: unknown
): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = ingredientSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const supabase = createAdminClient()

  // base_unit n'est pas modifiable : changer l'unité rendrait faux tout
  // l'historique de mouvements déjà enregistré dans l'ancienne unité.
  const { error } = await supabase
    .from('ingredients')
    .update({
      name: parsed.data.name,
      ...priceColumns(parsed.data.price),
    })
    .eq('id', ingredientId)

  if (error) {
    if (error.code === '23505' || error.message.includes('ingredients_name_unique')) {
      return { error: 'Un ingrédient porte déjà ce nom.' }
    }
    return { error: error.message }
  }

  revalidate()
  return { message: `${parsed.data.name} mis à jour.` }
}

/**
 * Retire un ingrédient de la liste sans effacer son historique.
 * Refusé s'il est utilisé dans une recette : le coût de cette recette
 * deviendrait faux en silence.
 */
export async function deactivateIngredient(ingredientId: string): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const supabase = createAdminClient()

  const { data: usedIn, error: usageError } = await supabase
    .from('recipe_items')
    .select('recipe:recipes(name)')
    .eq('ingredient_id', ingredientId)

  if (usageError) return { error: usageError.message }

  if (usedIn && usedIn.length > 0) {
    // PostgREST renvoie la relation imbriquée sous forme de tableau.
    const names = (usedIn as unknown as { recipe: { name: string }[] | { name: string } | null }[])
      .flatMap((row) => {
        if (!row.recipe) return []
        return Array.isArray(row.recipe) ? row.recipe.map((r) => r.name) : [row.recipe.name]
      })
      .filter((name): name is string => Boolean(name))
    return {
      error: `Utilisé dans ${usedIn.length} recette${usedIn.length > 1 ? 's' : ''} : ${names.join(', ')}. Retire-le de ces recettes d'abord.`,
    }
  }

  const { error } = await supabase
    .from('ingredients')
    .update({ is_active: false })
    .eq('id', ingredientId)

  if (error) return { error: error.message }

  revalidate()
  return { message: 'Ingrédient retiré de la liste.' }
}

const movementSchema = z.object({
  ingredient_id: z.string().uuid(),
  /** Toujours positive : le sens est porté par le type de mouvement. */
  quantity: z.number().finite().positive('La quantité doit être supérieure à zéro.'),
  type: z.enum(['reception', 'consommation', 'perte']),
  note: z.string().trim().max(280).optional(),
})

/**
 * Réception, consommation ou perte. Le signe est déduit du type : une
 * consommation saisie en positif ne peut pas augmenter le stock par erreur.
 */
export async function recordStockMovement(input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = movementSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const { ingredient_id, quantity, type, note } = parsed.data
  const signed = type === 'reception' ? quantity : -quantity

  const supabase = createAdminClient()
  const { error } = await supabase.from('stock_movements').insert({
    ingredient_id,
    quantity: signed,
    type,
    note: note && note.length > 0 ? note : null,
  })

  if (error) return { error: error.message }

  revalidate()
  return { message: 'Mouvement enregistré.' }
}

const inventorySchema = z.object({
  ingredient_id: z.string().uuid(),
  /** Quantité réellement comptée, dans l'unité de base. */
  counted: z.number().finite().nonnegative('Un comptage ne peut pas être négatif.'),
  note: z.string().trim().max(280).optional(),
})

/**
 * Comptage physique. N'écrit pas la valeur comptée mais l'ÉCART avec le
 * théorique, pour que le stock reste toujours SUM(quantity) — et pour que
 * cet écart, qui est la perte réelle, reste lisible au lot suivant.
 */
export async function recordInventoryCount(input: unknown): Promise<ActionResult> {
  const denied = await guardInterface()
  if (denied) return denied

  const parsed = inventorySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Saisie invalide.' }
  }

  const { ingredient_id, counted, note } = parsed.data
  const supabase = createAdminClient()

  const { data: ingredient, error: ingredientError } = await supabase
    .from('ingredients')
    .select('base_unit')
    .eq('id', ingredient_id)
    .single()

  if (ingredientError) return { error: ingredientError.message }

  // Le théorique est relu ici, au moment de l'écriture : entre l'ouverture du
  // formulaire et la validation, un autre poste a pu enregistrer un mouvement.
  const { data: stockRow, error: stockError } = await supabase
    .from('ingredient_stock')
    .select('stock')
    .eq('ingredient_id', ingredient_id)
    .single()

  if (stockError) return { error: stockError.message }

  const theoretical = Number((stockRow as { stock: unknown }).stock)
  const delta = inventoryDelta(theoretical, counted)
  const unit = (ingredient as { base_unit: 'g' | 'ml' | 'unit' }).base_unit

  if (delta === 0) {
    return { message: 'Comptage conforme au théorique : aucun écart à enregistrer.' }
  }

  const { error } = await supabase.from('stock_movements').insert({
    ingredient_id,
    quantity: delta,
    type: 'inventaire',
    note: note && note.length > 0 ? note : null,
  })

  if (error) return { error: error.message }

  revalidate()
  return {
    message: `Écart de ${delta < 0 ? '−' : '+'}${formatQuantity(Math.abs(delta), unit)} enregistré.`,
  }
}

import { createAdminClient } from '@/lib/supabase/admin'
import { assertInterfaceAuth } from './auth'
import type {
  IngredientWithStock,
  Product,
  RecipeWithItems,
  StockMovement,
} from '@/types'

/**
 * Lectures de l'interface cuisine.
 *
 * Ces tables sont en RLS sans policy : la clé anon ne peut rien lire. Tout
 * passe donc par le client service role, côté serveur, derrière
 * `assertInterfaceAuth`. En cas d'erreur on LÈVE : une liste vide se
 * confondrait avec « aucune donnée », ce qui serait un mensonge à l'écran.
 */

/** PostgREST peut sérialiser un `numeric` en chaîne selon la version : on force. */
function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function fetchIngredientsWithStock(): Promise<IngredientWithStock[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const [ingredients, stocks] = await Promise.all([
    supabase.from('ingredients').select('*').eq('is_active', true).order('name'),
    supabase.from('ingredient_stock').select('ingredient_id, stock'),
  ])

  if (ingredients.error) {
    throw new Error(`Lecture des ingrédients impossible : ${ingredients.error.message}`)
  }
  if (stocks.error) {
    throw new Error(`Lecture des stocks impossible : ${stocks.error.message}`)
  }

  const stockByIngredient = new Map<string, number>(
    (stocks.data ?? []).map((row) => [
      String((row as { ingredient_id: string }).ingredient_id),
      toNumber((row as { stock: unknown }).stock),
    ])
  )

  return (ingredients.data ?? []).map((row) => {
    const ingredient = row as Record<string, unknown>
    return {
      id: String(ingredient.id),
      name: String(ingredient.name),
      base_unit: ingredient.base_unit as IngredientWithStock['base_unit'],
      pack_quantity: toNullableNumber(ingredient.pack_quantity),
      pack_price_cents: toNullableNumber(ingredient.pack_price_cents),
      price_source: (ingredient.price_source ?? null) as IngredientWithStock['price_source'],
      price_updated_at: (ingredient.price_updated_at ?? null) as string | null,
      low_stock_threshold: toNullableNumber(ingredient.low_stock_threshold),
      category: (ingredient.category ?? null) as IngredientWithStock['category'],
      is_active: Boolean(ingredient.is_active),
      created_at: String(ingredient.created_at),
      stock: stockByIngredient.get(String(ingredient.id)) ?? 0,
    }
  })
}

export async function fetchRecipes(): Promise<RecipeWithItems[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('recipes')
    .select(
      `*,
       items:recipe_items(*, ingredient:ingredients(*)),
       product:products(id, name, price)`
    )
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error(`Lecture des recettes impossible : ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const recipe = row as Record<string, unknown>
    const items = (recipe.items ?? []) as Record<string, unknown>[]

    return {
      id: String(recipe.id),
      name: String(recipe.name),
      product_id: (recipe.product_id ?? null) as string | null,
      portions: toNumber(recipe.portions),
      notes: (recipe.notes ?? null) as string | null,
      is_active: Boolean(recipe.is_active),
      created_at: String(recipe.created_at),
      product: (recipe.product ?? null) as RecipeWithItems['product'],
      items: items
        .map((item) => {
          const ingredient = item.ingredient as Record<string, unknown>
          return {
            id: String(item.id),
            recipe_id: String(item.recipe_id),
            ingredient_id: String(item.ingredient_id),
            quantity: toNumber(item.quantity),
            created_at: String(item.created_at),
            ingredient: {
              id: String(ingredient.id),
              name: String(ingredient.name),
              base_unit: ingredient.base_unit as IngredientWithStock['base_unit'],
              pack_quantity: toNullableNumber(ingredient.pack_quantity),
              pack_price_cents: toNullableNumber(ingredient.pack_price_cents),
              price_source: (ingredient.price_source ??
                null) as IngredientWithStock['price_source'],
              price_updated_at: (ingredient.price_updated_at ?? null) as string | null,
              low_stock_threshold: toNullableNumber(ingredient.low_stock_threshold),
              category: (ingredient.category ?? null) as IngredientWithStock['category'],
              is_active: Boolean(ingredient.is_active),
              created_at: String(ingredient.created_at),
            },
          }
        })
        .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, 'fr')),
    }
  })
}

/** Catalogue, pour rattacher une recette à un produit vendu. */
export async function fetchProductOptions(): Promise<Pick<Product, 'id' | 'name' | 'price'>[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, name, price')
    .order('name')

  if (error) {
    throw new Error(`Lecture du catalogue impossible : ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const product = row as Record<string, unknown>
    return {
      id: String(product.id),
      name: String(product.name),
      price: toNumber(product.price),
    }
  })
}

/**
 * Produits du catalogue qui n'ont encore aucune recette.
 * C'est la liste de départ : les recettes se créent depuis les produits
 * réellement en vente, pas en retapant leurs noms à la main.
 */
export async function fetchProductsWithoutRecipe(): Promise<
  Pick<Product, 'id' | 'name' | 'price'>[]
> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const [products, recipes] = await Promise.all([
    supabase.from('products').select('id, name, price').order('name'),
    supabase.from('recipes').select('product_id').not('product_id', 'is', null),
  ])

  if (products.error) {
    throw new Error(`Lecture du catalogue impossible : ${products.error.message}`)
  }
  if (recipes.error) {
    throw new Error(`Lecture des recettes impossible : ${recipes.error.message}`)
  }

  const alreadyCovered = new Set(
    (recipes.data ?? []).map((row) => String((row as { product_id: string }).product_id))
  )

  return (products.data ?? [])
    .map((row) => {
      const product = row as Record<string, unknown>
      return {
        id: String(product.id),
        name: String(product.name),
        price: toNumber(product.price),
      }
    })
    .filter((product) => !alreadyCovered.has(product.id))
}

/** Derniers mouvements d'un ingrédient, du plus récent au plus ancien. */
export async function fetchIngredientMovements(
  ingredientId: string,
  limit = 30
): Promise<StockMovement[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('ingredient_id', ingredientId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Lecture des mouvements impossible : ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const movement = row as Record<string, unknown>
    return {
      id: String(movement.id),
      ingredient_id: String(movement.ingredient_id),
      quantity: toNumber(movement.quantity),
      type: movement.type as StockMovement['type'],
      note: (movement.note ?? null) as string | null,
      occurred_at: String(movement.occurred_at),
      created_at: String(movement.created_at),
    }
  })
}

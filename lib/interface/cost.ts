import type { Ingredient, IngredientUnit, RecipeItemWithIngredient } from '@/types'
import { referenceUnitFactor } from './units'

/**
 * Calcul des coûts.
 *
 * Invariant du module : un ingrédient sans prix ne vaut PAS zéro. Le type de
 * retour de `computeRecipeCost` ne contient un total que dans la branche
 * `complete` — aucun chemin de code ne peut donc afficher un coût en traitant
 * un prix manquant comme nul. C'est le typage qui l'interdit, pas la vigilance.
 *
 * Les montants sont en centimes NON ARRONDIS (un gramme de farine vaut
 * 0,00178 c). L'arrondi n'a lieu qu'au formatage.
 */

type PricedFields = Pick<Ingredient, 'pack_quantity' | 'pack_price_cents'>

/** Coût en centimes d'UNE unité de base. `null` si le prix est inconnu. */
export function unitCostCents(ingredient: PricedFields): number | null {
  const { pack_quantity, pack_price_cents } = ingredient
  if (pack_quantity === null || pack_price_cents === null) return null
  if (pack_quantity <= 0) return null
  return pack_price_cents / pack_quantity
}

/**
 * Prix ramené à l'unité de référence (kg / L / pièce), pour affichage.
 * `null` si le prix est inconnu.
 */
export function referencePriceCents(
  ingredient: PricedFields & { base_unit: IngredientUnit }
): number | null {
  const unitCost = unitCostCents(ingredient)
  if (unitCost === null) return null
  return unitCost * referenceUnitFactor(ingredient.base_unit)
}

export interface CostLine {
  ingredientId: string
  name: string
  quantity: number
  unit: IngredientUnit
  /** Coût de la ligne en centimes, ou `null` si l'ingrédient n'a pas de prix. */
  lineCents: number | null
}

export interface MissingPrice {
  ingredientId: string
  name: string
}

export type RecipeCost =
  | {
      status: 'complete'
      lines: CostLine[]
      /** Coût de la recette entière, en centimes non arrondis. */
      totalCents: number
      perPortionCents: number
    }
  | {
      status: 'incomplete'
      lines: CostLine[]
      missing: MissingPrice[]
    }
  | {
      status: 'empty'
      lines: []
    }

/**
 * Coût d'une recette. Trois issues seulement :
 *  - `empty`      : aucun ingrédient, il n'y a rien à chiffrer
 *  - `incomplete` : au moins un ingrédient sans prix -> pas de total, la liste
 *                   des manquants à la place
 *  - `complete`   : tous les prix sont connus
 */
export function computeRecipeCost(
  items: RecipeItemWithIngredient[],
  portions: number
): RecipeCost {
  if (items.length === 0) {
    return { status: 'empty', lines: [] }
  }

  const lines: CostLine[] = items.map((item) => {
    const unitCost = unitCostCents(item.ingredient)
    return {
      ingredientId: item.ingredient_id,
      name: item.ingredient.name,
      quantity: item.quantity,
      unit: item.ingredient.base_unit,
      lineCents: unitCost === null ? null : unitCost * item.quantity,
    }
  })

  const missing: MissingPrice[] = lines
    .filter((line) => line.lineCents === null)
    .map((line) => ({ ingredientId: line.ingredientId, name: line.name }))

  if (missing.length > 0) {
    return { status: 'incomplete', lines, missing }
  }

  const totalCents = lines.reduce((sum, line) => sum + (line.lineCents ?? 0), 0)
  const safePortions = portions > 0 ? portions : 1

  return {
    status: 'complete',
    lines,
    totalCents,
    perPortionCents: totalCents / safePortions,
  }
}

export interface Margin {
  /** Marge en centimes : prix de vente − coût d'une portion. */
  amountCents: number
  /** Marge en part du prix de vente (0,62 = 62 %). */
  ratio: number
}

/**
 * Marge d'une portion face à son prix de vente catalogue.
 * `null` si le prix de vente est nul ou absent : on ne divise pas par zéro
 * et on n'invente pas de pourcentage.
 */
export function computeMargin(
  sellPriceCents: number | null | undefined,
  costPerPortionCents: number
): Margin | null {
  if (sellPriceCents === null || sellPriceCents === undefined) return null
  if (sellPriceCents <= 0) return null
  const amountCents = sellPriceCents - costPerPortionCents
  return { amountCents, ratio: amountCents / sellPriceCents }
}

/**
 * Écart d'un comptage physique : ce qu'on écrit en mouvement de stock.
 * Un inventaire n'enregistre pas une valeur absolue mais la correction à
 * appliquer, pour que le stock reste toujours SUM(quantity).
 */
export function inventoryDelta(theoreticalStock: number, countedStock: number): number {
  return countedStock - theoreticalStock
}

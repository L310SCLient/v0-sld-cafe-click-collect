import type { IngredientUnit } from '@/types'

/**
 * Alerte de stock bas.
 *
 * Sans seuil défini, l'alerte se déclenche à zéro — c'est-à-dire trop tard,
 * au moment où on a besoin du produit. Un seuil permet de prévenir pendant
 * qu'il est encore temps de commander. Le champ reste facultatif pour ne pas
 * bloquer la saisie d'un ingrédient.
 */

export type StockLevel = 'rupture' | 'bas' | 'ok'

export interface StockAlertInput {
  stock: number
  low_stock_threshold: number | null
  base_unit: IngredientUnit
}

export function stockLevel(ingredient: StockAlertInput): StockLevel {
  if (ingredient.stock <= 0) return 'rupture'
  if (ingredient.low_stock_threshold === null) return 'ok'
  return ingredient.stock <= ingredient.low_stock_threshold ? 'bas' : 'ok'
}

export function isLowStock(ingredient: StockAlertInput): boolean {
  return stockLevel(ingredient) !== 'ok'
}

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = {
  rupture: 'rupture',
  bas: 'stock bas',
  ok: '',
}

/**
 * Ingrédients à réapprovisionner, les ruptures d'abord.
 * Les ingrédients sans seuil et au stock positif n'y figurent pas : on ne
 * peut pas décider à la place de l'utilisateur qu'un stock est « bas ».
 */
export function needsRestocking<T extends StockAlertInput & { name: string }>(
  ingredients: T[]
): T[] {
  return ingredients
    .filter(isLowStock)
    .sort((a, b) => {
      const levelA = stockLevel(a)
      const levelB = stockLevel(b)
      if (levelA !== levelB) return levelA === 'rupture' ? -1 : 1
      return a.name.localeCompare(b.name, 'fr')
    })
}

import { describe, expect, it } from 'vitest'
import type { Ingredient, RecipeItemWithIngredient } from '@/types'
import {
  computeMargin,
  computeRecipeCost,
  inventoryDelta,
  referencePriceCents,
  unitCostCents,
} from './cost'

function ingredient(overrides: Partial<Ingredient> & { name: string }): Ingredient {
  return {
    id: `id-${overrides.name}`,
    base_unit: 'g',
    pack_quantity: null,
    pack_price_cents: null,
    price_source: null,
    price_updated_at: null,
    low_stock_threshold: null,
    category: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function item(ing: Ingredient, quantity: number): RecipeItemWithIngredient {
  return {
    id: `item-${ing.id}`,
    recipe_id: 'recipe-1',
    ingredient_id: ing.id,
    quantity,
    created_at: '2026-01-01T00:00:00Z',
    ingredient: ing,
  }
}

const farine = ingredient({
  name: 'Farine T65',
  base_unit: 'g',
  pack_quantity: 5000,
  pack_price_cents: 890,
  price_source: 'facture',
})

const huile = ingredient({
  name: 'Huile olive',
  base_unit: 'ml',
  pack_quantity: 5000,
  pack_price_cents: 4200,
  price_source: 'facture',
})

const oeuf = ingredient({
  name: 'Oeuf',
  base_unit: 'unit',
  pack_quantity: 30,
  pack_price_cents: 900,
  price_source: 'manuelle',
})

const sansPrix = ingredient({ name: 'Sel', base_unit: 'g' })

describe('unitCostCents', () => {
  it('calcule le coût d une unité de base sans arrondir', () => {
    // 8,90 € les 5000 g -> 0,178 centime le gramme
    expect(unitCostCents(farine)).toBeCloseTo(0.178, 10)
  })

  it('renvoie null quand le prix est inconnu', () => {
    expect(unitCostCents(sansPrix)).toBeNull()
  })

  it('renvoie null plutôt que d exploser sur un conditionnement à zéro', () => {
    expect(unitCostCents({ pack_quantity: 0, pack_price_cents: 500 })).toBeNull()
  })
})

describe('referencePriceCents', () => {
  it('ramène au kg', () => {
    // 5 kg à 8,90 € -> 1,78 €/kg
    expect(referencePriceCents(farine)).toBeCloseTo(178, 10)
  })

  it('ramène au litre', () => {
    // 5 L à 42,00 € -> 8,40 €/L
    expect(referencePriceCents(huile)).toBeCloseTo(840, 10)
  })

  it('ne multiplie pas les pièces', () => {
    expect(referencePriceCents(oeuf)).toBeCloseTo(30, 10)
  })
})

describe('computeRecipeCost', () => {
  it('signale une recette vide au lieu de renvoyer un total de 0', () => {
    const cost = computeRecipeCost([], 1)
    expect(cost.status).toBe('empty')
  })

  it('additionne les lignes quand tous les prix sont connus', () => {
    const cost = computeRecipeCost([item(farine, 500), item(huile, 20)], 1)
    expect(cost.status).toBe('complete')
    if (cost.status !== 'complete') return
    // 500 g de farine = 89 c ; 20 ml d huile = 16,8 c
    expect(cost.totalCents).toBeCloseTo(105.8, 6)
    expect(cost.perPortionCents).toBeCloseTo(105.8, 6)
  })

  it('divise par le nombre de portions', () => {
    const cost = computeRecipeCost([item(farine, 5000)], 10)
    expect(cost.status).toBe('complete')
    if (cost.status !== 'complete') return
    expect(cost.totalCents).toBeCloseTo(890, 6)
    expect(cost.perPortionCents).toBeCloseTo(89, 6)
  })

  it('ne produit AUCUN total si un ingrédient n a pas de prix', () => {
    const cost = computeRecipeCost([item(farine, 500), item(sansPrix, 5)], 1)
    expect(cost.status).toBe('incomplete')
    if (cost.status !== 'incomplete') return
    expect(cost.missing).toEqual([{ ingredientId: sansPrix.id, name: 'Sel' }])
    expect(cost).not.toHaveProperty('totalCents')
  })

  it('conserve les lignes chiffrables même quand la recette est incomplète', () => {
    const cost = computeRecipeCost([item(farine, 500), item(sansPrix, 5)], 1)
    expect(cost.lines).toHaveLength(2)
    expect(cost.lines[0].lineCents).toBeCloseTo(89, 6)
    expect(cost.lines[1].lineCents).toBeNull()
  })

  it('liste tous les ingrédients sans prix, pas seulement le premier', () => {
    const poivre = ingredient({ name: 'Poivre' })
    const cost = computeRecipeCost([item(sansPrix, 5), item(poivre, 2)], 1)
    if (cost.status !== 'incomplete') throw new Error('devrait être incomplete')
    expect(cost.missing.map((m) => m.name)).toEqual(['Sel', 'Poivre'])
  })

  it('se protège d un nombre de portions invalide', () => {
    const cost = computeRecipeCost([item(farine, 1000)], 0)
    if (cost.status !== 'complete') throw new Error('devrait être complete')
    expect(cost.perPortionCents).toBeCloseTo(178, 6)
  })
})

describe('computeMargin', () => {
  it('calcule la marge en centimes et en part du prix de vente', () => {
    const margin = computeMargin(510, 178)
    expect(margin).not.toBeNull()
    expect(margin!.amountCents).toBeCloseTo(332, 6)
    expect(margin!.ratio).toBeCloseTo(0.651, 3)
  })

  it('rend une marge négative quand la recette coûte plus que son prix', () => {
    const margin = computeMargin(300, 450)
    expect(margin!.amountCents).toBeCloseTo(-150, 6)
  })

  it('renvoie null sans prix de vente exploitable', () => {
    expect(computeMargin(null, 100)).toBeNull()
    expect(computeMargin(undefined, 100)).toBeNull()
    expect(computeMargin(0, 100)).toBeNull()
  })
})

describe('inventoryDelta', () => {
  it('rend l écart à écrire en mouvement, pas la valeur comptée', () => {
    expect(inventoryDelta(4500, 4200)).toBe(-300)
    expect(inventoryDelta(4500, 4800)).toBe(300)
    expect(inventoryDelta(4500, 4500)).toBe(0)
  })
})

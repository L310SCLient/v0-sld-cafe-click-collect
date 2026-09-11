import { describe, expect, it } from 'vitest'
import {
  type PriceObservation,
  compareSuppliers,
  computePriceChange,
  pricePerBaseUnit,
  rankSuppliers,
} from './prices'

function obs(
  supplier: string,
  price: number,
  date: string,
  packQuantity = 1000,
  packPriceCents = price * 1000
): PriceObservation {
  return {
    supplierId: `sup-${supplier}`,
    supplierName: supplier,
    pricePerBaseUnit: price,
    packQuantity,
    packPriceCents,
    observedOn: date,
  }
}

describe('pricePerBaseUnit', () => {
  it('ramène un conditionnement au prix unitaire', () => {
    // 8,90 € les 5000 g -> 0,178 centime le gramme
    expect(pricePerBaseUnit(890, 5000)).toBeCloseTo(0.178, 10)
  })

  it('refuse un conditionnement nul plutôt que de diviser par zéro', () => {
    expect(pricePerBaseUnit(890, 0)).toBeNull()
  })
})

describe('compareSuppliers', () => {
  it('renvoie null sans aucun prix', () => {
    expect(compareSuppliers([])).toBeNull()
  })

  it('ne prétend pas qu un fournisseur unique est le moins cher', () => {
    const comparison = compareSuppliers([obs('Metro', 0.2, '2026-09-01')])
    expect(comparison!.cheapest.supplierName).toBe('Metro')
    expect(comparison!.others).toEqual([])
    expect(comparison!.savingsPerBaseUnit).toBeNull()
    expect(comparison!.spreadRatio).toBeNull()
  })

  it('désigne le moins cher et chiffre l écart', () => {
    const comparison = compareSuppliers([
      obs('Metro', 0.2, '2026-09-01'),
      obs('Promocash', 0.15, '2026-09-02'),
      obs('Transgourmet', 0.25, '2026-09-03'),
    ])!
    expect(comparison.cheapest.supplierName).toBe('Promocash')
    expect(comparison.others.map((o) => o.supplierName)).toEqual(['Metro', 'Transgourmet'])
    // 0,25 -> 0,15 : 0,10 d économie, soit 40 % du plus cher
    expect(comparison.savingsPerBaseUnit).toBeCloseTo(0.1, 10)
    expect(comparison.spreadRatio).toBeCloseTo(0.4, 10)
  })

  it('ne garde que le dernier prix de chaque fournisseur', () => {
    const comparison = compareSuppliers([
      obs('Metro', 0.1, '2026-01-01'),
      obs('Metro', 0.3, '2026-09-01'),
      obs('Promocash', 0.2, '2026-09-01'),
    ])!
    // L ancien prix Metro de 0,10 ne doit pas le faire gagner.
    expect(comparison.cheapest.supplierName).toBe('Promocash')
    expect(comparison.others).toHaveLength(1)
  })

  it('à prix égal, préfère le relevé le plus récent', () => {
    const comparison = compareSuppliers([
      obs('Ancien', 0.2, '2026-01-01'),
      obs('Recent', 0.2, '2026-09-01'),
    ])!
    expect(comparison.cheapest.supplierName).toBe('Recent')
  })
})

describe('computePriceChange', () => {
  it('renvoie null avec un seul relevé', () => {
    expect(computePriceChange([obs('Metro', 0.2, '2026-09-01')])).toBeNull()
  })

  it('renvoie null si tous les relevés sont du même jour', () => {
    expect(
      computePriceChange([obs('Metro', 0.2, '2026-09-01'), obs('Metro', 0.3, '2026-09-01')])
    ).toBeNull()
  })

  it('chiffre une hausse', () => {
    const change = computePriceChange([
      obs('Metro', 0.2, '2026-03-01'),
      obs('Metro', 0.25, '2026-09-01'),
    ])!
    expect(change.deltaPerBaseUnit).toBeCloseTo(0.05, 10)
    expect(change.ratio).toBeCloseTo(0.25, 10)
    expect(change.previous.observedOn).toBe('2026-03-01')
    expect(change.latest.observedOn).toBe('2026-09-01')
  })

  it('chiffre une baisse', () => {
    const change = computePriceChange([
      obs('Metro', 0.25, '2026-03-01'),
      obs('Metro', 0.2, '2026-09-01'),
    ])!
    expect(change.deltaPerBaseUnit).toBeCloseTo(-0.05, 10)
    expect(change.ratio).toBeCloseTo(-0.2, 10)
  })

  it('compare les deux dernières dates, pas la première et la dernière', () => {
    const change = computePriceChange([
      obs('Metro', 0.1, '2026-01-01'),
      obs('Metro', 0.2, '2026-05-01'),
      obs('Metro', 0.22, '2026-09-01'),
    ])!
    expect(change.previous.observedOn).toBe('2026-05-01')
    expect(change.ratio).toBeCloseTo(0.1, 10)
  })

  it('se moque de l ordre d arrivée des relevés', () => {
    const change = computePriceChange([
      obs('Metro', 0.22, '2026-09-01'),
      obs('Metro', 0.1, '2026-01-01'),
      obs('Metro', 0.2, '2026-05-01'),
    ])!
    expect(change.previous.observedOn).toBe('2026-05-01')
    expect(change.latest.observedOn).toBe('2026-09-01')
  })
})

describe('rankSuppliers', () => {
  it('ignore les ingrédients à fournisseur unique', () => {
    const ranking = rankSuppliers([
      { ingredientId: 'i1', observations: [obs('Metro', 0.2, '2026-09-01')] },
    ])
    expect(ranking).toEqual([])
  })

  it('compte les victoires sur les ingrédients réellement comparables', () => {
    const ranking = rankSuppliers([
      {
        ingredientId: 'tomate',
        observations: [obs('Metro', 0.3, '2026-09-01'), obs('Promocash', 0.2, '2026-09-01')],
      },
      {
        ingredientId: 'carotte',
        observations: [obs('Metro', 0.1, '2026-09-01'), obs('Promocash', 0.15, '2026-09-01')],
      },
      {
        ingredientId: 'poireau',
        observations: [obs('Metro', 0.4, '2026-09-01'), obs('Promocash', 0.25, '2026-09-01')],
      },
      // Fournisseur unique : ne compte pour personne.
      { ingredientId: 'navet', observations: [obs('Metro', 0.05, '2026-09-01')] },
    ])

    expect(ranking[0].supplierName).toBe('Promocash')
    expect(ranking[0].cheapestCount).toBe(2)
    expect(ranking[0].participatedCount).toBe(3)
    expect(ranking[1].supplierName).toBe('Metro')
    expect(ranking[1].cheapestCount).toBe(1)
    expect(ranking[1].participatedCount).toBe(3)
  })
})

import { describe, expect, it } from 'vitest'
import { isLowStock, needsRestocking, stockLevel } from './stock-alert'

function ing(name: string, stock: number, threshold: number | null = null) {
  return { name, stock, low_stock_threshold: threshold, base_unit: 'g' as const }
}

describe('stockLevel', () => {
  it('signale une rupture à zéro et en dessous', () => {
    expect(stockLevel(ing('Farine', 0))).toBe('rupture')
    expect(stockLevel(ing('Farine', -200))).toBe('rupture')
  })

  it('sans seuil, un stock positif reste ok', () => {
    expect(stockLevel(ing('Farine', 50))).toBe('ok')
  })

  it('avec seuil, alerte dès que le stock l atteint', () => {
    expect(stockLevel(ing('Farine', 600, 500))).toBe('ok')
    expect(stockLevel(ing('Farine', 500, 500))).toBe('bas')
    expect(stockLevel(ing('Farine', 200, 500))).toBe('bas')
  })

  it('la rupture prime sur le seuil', () => {
    expect(stockLevel(ing('Farine', 0, 500))).toBe('rupture')
  })
})

describe('isLowStock', () => {
  it('couvre rupture et stock bas', () => {
    expect(isLowStock(ing('a', 0))).toBe(true)
    expect(isLowStock(ing('b', 100, 500))).toBe(true)
    expect(isLowStock(ing('c', 900, 500))).toBe(false)
  })
})

describe('needsRestocking', () => {
  it('met les ruptures en tête, puis l ordre alphabétique', () => {
    const list = needsRestocking([
      ing('Sel', 100, 500),
      ing('Beurre', 0),
      ing('Farine', 5000, 500),
      ing('Ail', 0, 200),
      ing('Poivre', 50, 100),
    ])
    expect(list.map((i) => i.name)).toEqual(['Ail', 'Beurre', 'Poivre', 'Sel'])
  })

  it('n invente pas d alerte sur un ingrédient sans seuil', () => {
    expect(needsRestocking([ing('Farine', 3)])).toEqual([])
  })
})

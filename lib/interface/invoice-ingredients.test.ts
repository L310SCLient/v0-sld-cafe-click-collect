import { describe, expect, it } from 'vitest'
import { cleanIngredientName, groupLinesForIngredients, type LinePourIngredient } from './invoice-ingredients'

function ligne(overrides: Partial<LinePourIngredient> & { id: string }): LinePourIngredient {
  return {
    raw_label: 'ARTICLE',
    ingredient_name: null,
    base_unit: 'unit',
    ...overrides,
  }
}

describe('nom d’ingrédient tiré d’une ligne de facture', () => {
  it('préfère le nom rangeable proposé par la lecture', () => {
    expect(
      cleanIngredientName({ ingredient_name: 'Baguette précuite 300 g', raw_label: "BAGUETTE L'ARTIGUETTE PRECUITE 300g" })
    ).toBe('Baguette précuite 300 g')
  })

  it('retombe sur le libellé de la facture quand la lecture ne propose rien', () => {
    expect(cleanIngredientName({ ingredient_name: null, raw_label: 'SEL FIN 1KG' })).toBe('SEL FIN 1KG')
  })

  it('resserre les espaces et coupe les blancs', () => {
    expect(cleanIngredientName({ ingredient_name: '  Farine   T65 ', raw_label: 'x' })).toBe('Farine T65')
  })

  it('renvoie null quand il ne reste rien de nommable', () => {
    expect(cleanIngredientName({ ingredient_name: '   ', raw_label: '  ' })).toBeNull()
  })
})

describe('regroupement des lignes par ingrédient', () => {
  it('ne crée qu’une entrée pour deux lignes du même nom, casse ignorée', () => {
    const groupes = groupLinesForIngredients([
      ligne({ id: 'l1', ingredient_name: 'Beurre doux' }),
      ligne({ id: 'l2', ingredient_name: 'BEURRE DOUX' }),
    ])
    expect(groupes).toHaveLength(1)
    expect(groupes[0]?.lineIds).toEqual(['l1', 'l2'])
  })

  it('garde le premier nom rencontré comme nom à créer', () => {
    const groupes = groupLinesForIngredients([
      ligne({ id: 'l1', ingredient_name: 'Beurre doux' }),
      ligne({ id: 'l2', ingredient_name: 'BEURRE DOUX' }),
    ])
    expect(groupes[0]?.name).toBe('Beurre doux')
  })

  it('écarte une ligne sans unité : un ingrédient sans unité n’a pas de stock', () => {
    const groupes = groupLinesForIngredients([
      ligne({ id: 'l1', ingredient_name: 'Sel', base_unit: null }),
      ligne({ id: 'l2', ingredient_name: 'Farine', base_unit: 'g' }),
    ])
    expect(groupes.map((g) => g.name)).toEqual(['Farine'])
  })

  it('écarte une ligne sans nom exploitable', () => {
    expect(groupLinesForIngredients([ligne({ id: 'l1', ingredient_name: '  ', raw_label: '   ' })])).toEqual([])
  })

  it('porte l’unité de la première ligne du groupe', () => {
    const groupes = groupLinesForIngredients([ligne({ id: 'l1', ingredient_name: 'Lait', base_unit: 'ml' })])
    expect(groupes[0]?.base_unit).toBe('ml')
  })
})

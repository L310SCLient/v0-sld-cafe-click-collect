import { describe, expect, it } from 'vitest'
import {
  buildIngredientDictionary,
  costIsDisplayable,
  findDuplicateNames,
  matchExistingRecipe,
  normalizeKey,
  splitLines,
  type ParsedLine,
} from './recipe-import'

function line(overrides: Partial<ParsedLine> & { raw_label: string }): ParsedLine {
  return {
    raw_quantity: null,
    quantity: null,
    base_unit: null,
    confidence: null,
    ...overrides,
  }
}

describe('normalisation des noms', () => {
  it('ignore la casse et les espaces superflus', () => {
    expect(normalizeKey('  Beurre   doux ')).toBe(normalizeKey('beurre doux'))
  })

  it('conserve les accents, car l’unicité en base porte sur lower(name)', () => {
    expect(normalizeKey('Crème')).not.toBe(normalizeKey('Creme'))
  })
})

describe('rattachement d’une fiche à une recette existante', () => {
  const existantes = [
    { id: 'r1', name: 'Croissant au beurre' },
    { id: 'r2', name: 'Brioche à tête' },
    { id: 'r3', name: 'Brioche' },
  ]

  it('retrouve la recette malgré la casse', () => {
    expect(matchExistingRecipe('CROISSANT AU BEURRE', existantes)).toBe('r1')
  })

  it('ne confond pas deux noms proches', () => {
    expect(matchExistingRecipe('Brioche', existantes)).toBe('r3')
  })

  it('renvoie null quand aucune recette ne correspond', () => {
    expect(matchExistingRecipe('Tarte aux pommes', existantes)).toBeNull()
  })
})

describe('doublons de noms dans un même lot', () => {
  it('signale deux fiches portant le même nom, casse ignorée', () => {
    expect(findDuplicateNames(['Brioche', 'Cookies', 'BRIOCHE'])).toEqual(['brioche'])
  })

  it('ne signale rien quand les noms sont distincts', () => {
    expect(findDuplicateNames(['Brioche', 'Cookies'])).toEqual([])
  })
})

describe('dictionnaire d’ingrédients du lot', () => {
  const fiches = [
    { lines: [line({ raw_label: 'Beurre', base_unit: 'g', quantity: 250 })] },
    {
      lines: [
        line({ raw_label: 'beurre', base_unit: 'g', quantity: 100 }),
        line({ raw_label: 'Farine T65', base_unit: 'g', quantity: 500 }),
      ],
    },
  ]

  it('dédoublonne les variantes de casse en une seule entrée', () => {
    const dictionnaire = buildIngredientDictionary(fiches, [])
    expect(dictionnaire).toHaveLength(2)
    expect(dictionnaire.map((entry) => entry.normalized_name)).toContain('beurre')
  })

  it('compte le nombre de fiches où le nom apparaît', () => {
    const beurre = buildIngredientDictionary(fiches, []).find((e) => e.normalized_name === 'beurre')
    expect(beurre?.occurrences).toBe(2)
  })

  it('trie par fréquence décroissante', () => {
    const dictionnaire = buildIngredientDictionary(fiches, [])
    expect(dictionnaire[0]?.normalized_name).toBe('beurre')
  })

  it('rattache à un ingrédient existant plutôt que d’en créer un', () => {
    const dictionnaire = buildIngredientDictionary(fiches, [
      { id: 'i1', name: 'Farine T65', base_unit: 'g' },
    ])
    const farine = dictionnaire.find((e) => e.normalized_name === 'farine t65')
    expect(farine?.decision).toBe('rattacher')
    expect(farine?.ingredient_id).toBe('i1')
  })

  it('propose l’unité majoritaire quand les fiches divergent', () => {
    const divergentes = [
      { lines: [line({ raw_label: 'Lait', base_unit: 'ml', quantity: 500 })] },
      { lines: [line({ raw_label: 'Lait', base_unit: 'ml', quantity: 250 })] },
      { lines: [line({ raw_label: 'Lait', base_unit: 'g', quantity: 250 })] },
    ]
    const lait = buildIngredientDictionary(divergentes, []).find((e) => e.normalized_name === 'lait')
    expect(lait?.base_unit).toBe('ml')
  })

  it('laisse l’unité à null quand aucune fiche ne la donne', () => {
    const sansUnite = [{ lines: [line({ raw_label: 'Sel', raw_quantity: 'une pincée' })] }]
    expect(buildIngredientDictionary(sansUnite, [])[0]?.base_unit).toBeNull()
  })
})

describe('lignes chiffrables et lignes mises de côté', () => {
  it('garde une ligne chiffrée', () => {
    const { chiffrables, misesDeCote } = splitLines([
      line({ raw_label: 'Farine', quantity: 500, base_unit: 'g' }),
    ])
    expect(chiffrables).toHaveLength(1)
    expect(misesDeCote).toHaveLength(0)
  })

  it('met de côté « une pincée de sel » en gardant le texte d’origine', () => {
    const { chiffrables, misesDeCote } = splitLines([
      line({ raw_label: 'Sel', raw_quantity: 'une pincée' }),
    ])
    expect(chiffrables).toHaveLength(0)
    expect(misesDeCote[0]?.raw_quantity).toBe('une pincée')
  })

  it('ne chiffre jamais une quantité nulle ou négative', () => {
    const { misesDeCote } = splitLines([
      line({ raw_label: 'Eau', quantity: 0, base_unit: 'ml' }),
      line({ raw_label: 'Levure', quantity: -5, base_unit: 'g' }),
    ])
    expect(misesDeCote).toHaveLength(2)
  })

  it('met de côté une quantité sans unité', () => {
    const { misesDeCote } = splitLines([line({ raw_label: 'Beurre', quantity: 250 })])
    expect(misesDeCote).toHaveLength(1)
  })
})

describe('affichage du coût', () => {
  it('masque le coût quand une ligne est restée de côté', () => {
    expect(costIsDisplayable({ missingItems: 1, portionsConfirmed: true })).toBe(false)
  })

  it('masque le coût quand le rendement n’est pas confirmé', () => {
    expect(costIsDisplayable({ missingItems: 0, portionsConfirmed: false })).toBe(false)
  })

  it('affiche le coût quand la recette est complète', () => {
    expect(costIsDisplayable({ missingItems: 0, portionsConfirmed: true })).toBe(true)
  })
})

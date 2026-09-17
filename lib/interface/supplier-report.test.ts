import { describe, expect, it } from 'vitest'
import type { PriceObservation } from './prices'
import {
  type EntreeRapport,
  type LigneRapport,
  construireRapport,
  debutPeriode,
  phraseRapport,
} from './supplier-report'

function obs(price: number, date: string): PriceObservation {
  return {
    supplierId: 'sup-metro',
    supplierName: 'Metro',
    pricePerBaseUnit: price,
    packQuantity: 1000,
    packPriceCents: price * 1000,
    observedOn: date,
  }
}

function entree(
  nom: string,
  observations: PriceObservation[],
  baseUnit: EntreeRapport['baseUnit'] = 'g'
): EntreeRapport {
  return { ingredientId: `ing-${nom}`, ingredientNom: nom, baseUnit, observations }
}

/** Les bornes se calculent en UTC : les dates de facture sont des dates nues. */
const LE_17_SEPTEMBRE = new Date('2026-09-17T10:00:00Z')

describe('debutPeriode', () => {
  it('ne borne rien pour la dernière facture', () => {
    expect(debutPeriode('derniere', LE_17_SEPTEMBRE)).toBeNull()
  })

  it('remonte au 1er du mois', () => {
    expect(debutPeriode('mois', LE_17_SEPTEMBRE)).toBe('2026-09-01')
    expect(debutPeriode('mois', new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01')
  })

  it('remonte au 1er jour du trimestre civil', () => {
    expect(debutPeriode('trimestre', new Date('2026-02-11T00:00:00Z'))).toBe('2026-01-01')
    expect(debutPeriode('trimestre', new Date('2026-05-31T00:00:00Z'))).toBe('2026-04-01')
    expect(debutPeriode('trimestre', LE_17_SEPTEMBRE)).toBe('2026-07-01')
    expect(debutPeriode('trimestre', new Date('2026-12-25T00:00:00Z'))).toBe('2026-10-01')
  })

  it('remonte au 1er janvier', () => {
    expect(debutPeriode('annee', LE_17_SEPTEMBRE)).toBe('2026-01-01')
  })
})

describe('construireRapport — dernière facture', () => {
  it('compare le dernier relevé à l avant-dernier', () => {
    const [ligne] = construireRapport(
      [entree('Beurre', [obs(0.7, '2026-01-10'), obs(0.795, '2026-03-03'), obs(0.89, '2026-09-12')])],
      'derniere',
      LE_17_SEPTEMBRE
    )
    expect(ligne.prixActuel).toBe(0.89)
    expect(ligne.dateActuelle).toBe('2026-09-12')
    expect(ligne.prixPrecedent).toBe(0.795)
    expect(ligne.datePrecedente).toBe('2026-03-03')
    expect(ligne.statut).toBe('hausse')
    expect(ligne.variationRatio).toBeCloseTo(0.1194968, 6)
  })

  it('n invente aucune variation sur un premier relevé', () => {
    const [ligne] = construireRapport(
      [entree('Farine', [obs(0.178, '2026-09-12')])],
      'derniere',
      LE_17_SEPTEMBRE
    )
    expect(ligne.statut).toBe('premier')
    expect(ligne.prixPrecedent).toBeNull()
    expect(ligne.datePrecedente).toBeNull()
    expect(ligne.variationRatio).toBeNull()
  })

  it('ignore un ingrédient sans aucun relevé', () => {
    expect(construireRapport([entree('Sel', [])], 'derniere', LE_17_SEPTEMBRE)).toEqual([])
  })

  it('ne tire pas une évolution de deux lignes du même jour', () => {
    const [ligne] = construireRapport(
      [entree('Lait', [obs(0.1, '2026-09-12'), obs(0.12, '2026-09-12')])],
      'derniere',
      LE_17_SEPTEMBRE
    )
    expect(ligne.statut).toBe('premier')
    expect(ligne.prixPrecedent).toBeNull()
  })
})

describe('construireRapport — périodes', () => {
  const beurre = entree('Beurre', [
    obs(0.6, '2025-11-04'), // année précédente
    obs(0.7, '2026-05-20'), // trimestre précédent
    obs(0.8, '2026-08-14'), // mois précédent, même trimestre
    obs(0.9, '2026-09-03'), // dans le mois
  ])

  it('compare le dernier relevé du mois au dernier relevé antérieur au mois', () => {
    const [ligne] = construireRapport([beurre], 'mois', LE_17_SEPTEMBRE)
    expect(ligne.dateActuelle).toBe('2026-09-03')
    expect(ligne.datePrecedente).toBe('2026-08-14')
    expect(ligne.variationRatio).toBeCloseTo(0.125, 6)
  })

  it('compare au dernier relevé antérieur au trimestre', () => {
    const [ligne] = construireRapport([beurre], 'trimestre', LE_17_SEPTEMBRE)
    expect(ligne.dateActuelle).toBe('2026-09-03')
    expect(ligne.datePrecedente).toBe('2026-05-20')
    expect(ligne.variationRatio).toBeCloseTo(0.2857142, 6)
  })

  it('compare au dernier relevé antérieur à l année', () => {
    const [ligne] = construireRapport([beurre], 'annee', LE_17_SEPTEMBRE)
    expect(ligne.dateActuelle).toBe('2026-09-03')
    expect(ligne.datePrecedente).toBe('2025-11-04')
    expect(ligne.variationRatio).toBeCloseTo(0.5, 6)
  })

  it('annonce un premier relevé quand rien ne précède la période', () => {
    const [ligne] = construireRapport(
      [entree('Farine', [obs(0.178, '2026-09-02'), obs(0.18, '2026-09-12')])],
      'annee',
      LE_17_SEPTEMBRE
    )
    expect(ligne.dateActuelle).toBe('2026-09-12')
    expect(ligne.statut).toBe('premier')
    expect(ligne.variationRatio).toBeNull()
  })

  it('écarte un ingrédient sans relevé dans la période plutôt que d afficher un vieux prix', () => {
    const rapport = construireRapport(
      [entree('Sel', [obs(0.05, '2026-03-01')])],
      'mois',
      LE_17_SEPTEMBRE
    )
    expect(rapport).toEqual([])
  })
})

describe('construireRapport — seuil de stabilité', () => {
  it('range une variation de 0,4 % dans les stables', () => {
    const [ligne] = construireRapport(
      [entree('Lait', [obs(1, '2026-09-01'), obs(1.004, '2026-09-12')])],
      'derniere',
      LE_17_SEPTEMBRE
    )
    expect(ligne.statut).toBe('stable')
  })

  it('compte une variation de 0,6 % comme une hausse', () => {
    const [ligne] = construireRapport(
      [entree('Lait', [obs(1, '2026-09-01'), obs(1.006, '2026-09-12')])],
      'derniere',
      LE_17_SEPTEMBRE
    )
    expect(ligne.statut).toBe('hausse')
  })

  it('compte une baisse de 0,6 % comme une baisse', () => {
    const [ligne] = construireRapport(
      [entree('Lait', [obs(1, '2026-09-01'), obs(0.994, '2026-09-12')])],
      'derniere',
      LE_17_SEPTEMBRE
    )
    expect(ligne.statut).toBe('baisse')
  })
})

describe('construireRapport — tri', () => {
  it('place les hausses en tête, de la plus forte à la plus faible, puis baisses, stables et premiers', () => {
    const rapport = construireRapport(
      [
        entree('Stable', [obs(1, '2026-09-01'), obs(1.001, '2026-09-12')]),
        entree('Premier', [obs(1, '2026-09-12')]),
        entree('Petite hausse', [obs(1, '2026-09-01'), obs(1.1, '2026-09-12')]),
        entree('Grosse baisse', [obs(1, '2026-09-01'), obs(0.5, '2026-09-12')]),
        entree('Grosse hausse', [obs(1, '2026-09-01'), obs(2, '2026-09-12')]),
        entree('Petite baisse', [obs(1, '2026-09-01'), obs(0.9, '2026-09-12')]),
      ],
      'derniere',
      LE_17_SEPTEMBRE
    )
    expect(rapport.map((ligne) => ligne.ingredientNom)).toEqual([
      'Grosse hausse',
      'Petite hausse',
      'Grosse baisse',
      'Petite baisse',
      'Stable',
      'Premier',
    ])
  })
})

describe('phraseRapport', () => {
  function ligne(patch: Partial<LigneRapport>): LigneRapport {
    return {
      ingredientId: 'ing-1',
      ingredientNom: 'Beurre doux',
      baseUnit: 'g',
      prixActuel: 0.89,
      dateActuelle: '2026-09-12',
      prixPrecedent: 0.795,
      datePrecedente: '2026-03-03',
      variationRatio: (0.89 - 0.795) / 0.795,
      statut: 'hausse',
      ...patch,
    }
  }

  it('écrit une hausse avec sa date et son ancien prix', () => {
    expect(phraseRapport(ligne({}))).toBe(
      'Beurre doux : 8,90 €/kg, +12 % depuis le 3 mars (7,95 €/kg)'
    )
  })

  it('écrit une baisse avec le signe moins', () => {
    expect(
      phraseRapport(
        ligne({ prixActuel: 0.7, prixPrecedent: 1, variationRatio: -0.3, statut: 'baisse' })
      )
    ).toBe('Beurre doux : 7,00 €/kg, −30 % depuis le 3 mars (10,00 €/kg)')
  })

  it('détaille les variations inférieures à 10 %', () => {
    expect(
      phraseRapport(ligne({ prixActuel: 1.006, prixPrecedent: 1, variationRatio: 0.006 }))
    ).toBe('Beurre doux : 10,06 €/kg, +0,6 % depuis le 3 mars (10,00 €/kg)')
  })

  it('dit « stable » plutôt qu un pourcentage nul', () => {
    expect(
      phraseRapport(
        ligne({ prixActuel: 1.001, prixPrecedent: 1, variationRatio: 0.001, statut: 'stable' })
      )
    ).toBe('Beurre doux : 10,01 €/kg, stable depuis le 3 mars (10,00 €/kg)')
  })

  it('assume l absence de comparaison sur un premier relevé', () => {
    expect(
      phraseRapport(
        ligne({
          ingredientNom: 'Farine T65',
          prixActuel: 0.178,
          prixPrecedent: null,
          datePrecedente: null,
          variationRatio: null,
          statut: 'premier',
        })
      )
    ).toBe('Farine T65 : 1,78 €/kg, premier relevé — rien à comparer')
  })

  it('précise l année quand le relevé précédent date d un autre exercice', () => {
    expect(
      phraseRapport(
        ligne({
          dateActuelle: '2026-01-10',
          datePrecedente: '2025-12-02',
          prixActuel: 1.1,
          prixPrecedent: 1,
          variationRatio: 0.1,
        })
      )
    ).toBe('Beurre doux : 11,00 €/kg, +10 % depuis le 2 décembre 2025 (10,00 €/kg)')
  })

  it('parle en pièces pour un ingrédient à l unité', () => {
    expect(
      phraseRapport(
        ligne({
          ingredientNom: 'Pain burger',
          baseUnit: 'unit',
          prixActuel: 45,
          prixPrecedent: null,
          datePrecedente: null,
          variationRatio: null,
          statut: 'premier',
        })
      )
    ).toBe('Pain burger : 0,45 €/u, premier relevé — rien à comparer')
  })
})

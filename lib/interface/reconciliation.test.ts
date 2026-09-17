import { describe, expect, it } from 'vitest'
import {
  type LignePourRapprochement,
  phraseEcart,
  rapprocher,
  resumeRapprochement,
} from './reconciliation'
import { formatCents } from './units'

/**
 * Ligne de document. Les valeurs par défaut décrivent le cas courant — un
 * colis de 1 kg à 8,90 € — pour que chaque test ne dise que ce qu'il teste.
 */
function ligne(partial: Partial<LignePourRapprochement> & { id: string }): LignePourRapprochement {
  return {
    raw_label: 'Beurre doux',
    ingredient_id: null,
    quantity: 1,
    pack_quantity: 1000,
    base_unit: 'g',
    pack_price_cents: 890,
    ...partial,
  }
}

describe('rapprocher', () => {
  it('rapproche par ingrédient même si les libellés des deux documents diffèrent', () => {
    const rapprochements = rapprocher(
      [ligne({ id: 'f1', raw_label: 'BEURRE DOUX PLAQ. 1KG', ingredient_id: 'ing-beurre', pack_price_cents: 920 })],
      [ligne({ id: 'b1', raw_label: 'Beurre 82% MG', ingredient_id: 'ing-beurre' })]
    )

    expect(rapprochements).toHaveLength(1)
    expect(rapprochements[0].ligneFacture?.id).toBe('f1')
    expect(rapprochements[0].ligneBon?.id).toBe('b1')
    expect(rapprochements[0].statut).toBe('ecart_prix')
  })

  it('se replie sur le libellé normalisé quand un côté n a pas d ingrédient', () => {
    const rapprochements = rapprocher(
      [ligne({ id: 'f1', raw_label: 'Beurre doux', ingredient_id: 'ing-beurre' })],
      [ligne({ id: 'b1', raw_label: '  BEURRE   DOUX ', ingredient_id: null })]
    )

    expect(rapprochements).toHaveLength(1)
    expect(rapprochements[0].ligneBon?.id).toBe('b1')
    expect(rapprochements[0].statut).toBe('identique')
  })

  it('ne rapproche pas par libellé deux lignes rattachées à des ingrédients différents', () => {
    // Le rattachement est un geste humain : deux ingrédients distincts sous le
    // même libellé ne sont pas le même produit.
    const rapprochements = rapprocher(
      [ligne({ id: 'f1', raw_label: 'Beurre', ingredient_id: 'ing-doux' })],
      [ligne({ id: 'b1', raw_label: 'Beurre', ingredient_id: 'ing-demi-sel' })]
    )

    expect(rapprochements.map((r) => r.statut)).toEqual(['seulement_facture', 'seulement_bon'])
  })

  it('chiffre l écart de prix ramené à l unité de base', () => {
    const [rapprochement] = rapprocher(
      [ligne({ id: 'f1', pack_price_cents: 920 })],
      [ligne({ id: 'b1', pack_price_cents: 890 })]
    )

    expect(rapprochement.statut).toBe('ecart_prix')
    // 9,20 € et 8,90 € le kilo : 0,03 centime d écart par gramme
    expect(rapprochement.ecartCentimesParUniteDeBase).toBeCloseTo(0.03, 10)
    expect(rapprochement.ecartRatio).toBeCloseTo(30 / 890, 10)
  })

  it('distingue un écart de quantité d un écart de prix', () => {
    const [rapprochement] = rapprocher(
      [ligne({ id: 'f1', quantity: 3 })],
      [ligne({ id: 'b1', quantity: 2 })]
    )

    expect(rapprochement.statut).toBe('ecart_quantite')
    expect(rapprochement.ecartCentimesParUniteDeBase).toBeCloseTo(0, 10)
  })

  it('signale une ligne facturée sans rien en face, et l inverse', () => {
    const rapprochements = rapprocher(
      [ligne({ id: 'f1', raw_label: 'Farine T65' })],
      [ligne({ id: 'b1', raw_label: 'Sucre semoule' })]
    )

    expect(rapprochements).toHaveLength(2)
    expect(rapprochements[0]).toMatchObject({ statut: 'seulement_facture', ligneBon: null })
    expect(rapprochements[0].ecartCentimesParUniteDeBase).toBeNull()
    expect(rapprochements[1]).toMatchObject({ statut: 'seulement_bon', ligneFacture: null })
  })

  it('tient un écart de moins de 0,5 % pour un arrondi de facturation', () => {
    const [tolere] = rapprocher(
      [ligne({ id: 'f1', pack_price_cents: 893 })],
      [ligne({ id: 'b1', pack_price_cents: 890 })]
    )
    expect(tolere.statut).toBe('identique')

    const [signale] = rapprocher(
      [ligne({ id: 'f2', pack_price_cents: 895 })],
      [ligne({ id: 'b2', pack_price_cents: 890 })]
    )
    expect(signale.statut).toBe('ecart_prix')
  })

  it('ne transforme jamais un prix manquant en écart', () => {
    const [sansPrix] = rapprocher(
      [ligne({ id: 'f1', pack_price_cents: null })],
      [ligne({ id: 'b1' })]
    )
    expect(sansPrix.statut).toBe('indeterminable')
    expect(sansPrix.ecartCentimesParUniteDeBase).toBeNull()
    expect(sansPrix.ecartRatio).toBeNull()

    const [sansConditionnement] = rapprocher(
      [ligne({ id: 'f2' })],
      [ligne({ id: 'b2', pack_quantity: null })]
    )
    expect(sansConditionnement.statut).toBe('indeterminable')
    expect(sansConditionnement.ecartCentimesParUniteDeBase).toBeNull()
  })
})

describe('resumeRapprochement', () => {
  const rapprochements = rapprocher(
    [
      ligne({ id: 'f-beurre', raw_label: 'Beurre doux', quantity: 3, pack_price_cents: 920 }),
      ligne({ id: 'f-huile', raw_label: 'Huile olive', quantity: 3, pack_price_cents: 500 }),
      ligne({ id: 'f-sel', raw_label: 'Sel fin', pack_price_cents: 200 }),
      ligne({ id: 'f-farine', raw_label: 'Farine T65' }),
      ligne({ id: 'f-poivre', raw_label: 'Poivre', pack_price_cents: null }),
    ],
    [
      ligne({ id: 'b-beurre', raw_label: 'Beurre doux', quantity: 3, pack_price_cents: 890 }),
      ligne({ id: 'b-huile', raw_label: 'Huile olive', quantity: 2, pack_price_cents: 500 }),
      ligne({ id: 'b-sel', raw_label: 'Sel fin', pack_price_cents: 200 }),
      ligne({ id: 'b-sucre', raw_label: 'Sucre semoule' }),
      ligne({ id: 'b-poivre', raw_label: 'Poivre' }),
    ]
  )

  it('compte chaque statut', () => {
    const resume = resumeRapprochement(rapprochements)

    expect(resume.total).toBe(6)
    expect(resume.identiques).toBe(1)
    expect(resume.ecartsPrix).toBe(1)
    expect(resume.ecartsQuantite).toBe(1)
    expect(resume.indeterminables).toBe(1)
    expect(resume.seulementFacture).toBe(1)
    expect(resume.seulementBon).toBe(1)
  })

  it('chiffre l écart total sur les seules lignes comparables des deux côtés', () => {
    // Beurre : 3 × 9,20 € contre 3 × 8,90 € -> +0,90 €
    // Huile : 3 colis facturés contre 2 livrés à 5,00 € -> +5,00 €
    expect(resumeRapprochement(rapprochements).ecartTotalCentimes).toBe(590)
  })

  it('ne chiffre rien quand aucune ligne n est comparable', () => {
    const orphelins = rapprocher([ligne({ id: 'f1', raw_label: 'Farine' })], [])
    expect(resumeRapprochement(orphelins).ecartTotalCentimes).toBeNull()
  })
})

describe('phraseEcart', () => {
  it('dit le prix des deux côtés et le sens de l écart', () => {
    const [rapprochement] = rapprocher(
      [ligne({ id: 'f1', raw_label: 'Beurre doux', pack_price_cents: 920 })],
      [ligne({ id: 'b1', raw_label: 'Beurre doux', pack_price_cents: 890 })]
    )
    const phrase = phraseEcart(rapprochement)

    expect(phrase.startsWith('Beurre doux :')).toBe(true)
    expect(phrase).toContain(`${formatCents(920)}/kg`)
    expect(phrase).toContain(`${formatCents(890)}/kg`)
    expect(phrase).toContain('+3,4 %')
  })

  it('dit les quantités quand c est la quantité qui diffère', () => {
    const [rapprochement] = rapprocher(
      [ligne({ id: 'f1', raw_label: 'Huile olive', quantity: 3 })],
      [ligne({ id: 'b1', raw_label: 'Huile olive', quantity: 2 })]
    )
    const phrase = phraseEcart(rapprochement)

    expect(phrase).toContain('3 colis facturés')
    expect(phrase).toContain('2 livrés')
  })

  it('nomme le document où le prix manque plutôt que d annoncer un écart', () => {
    const [rapprochement] = rapprocher(
      [ligne({ id: 'f1', raw_label: 'Poivre', pack_price_cents: null })],
      [ligne({ id: 'b1', raw_label: 'Poivre' })]
    )
    const phrase = phraseEcart(rapprochement)

    expect(phrase).toContain('facture')
    expect(phrase).toContain('rapprochement impossible')
  })

  it('dit l orphelin de chaque côté sans le chiffrer comme un écart', () => {
    const rapprochements = rapprocher(
      [ligne({ id: 'f1', raw_label: 'Farine T65' })],
      [ligne({ id: 'b1', raw_label: 'Sucre semoule' })]
    )

    expect(phraseEcart(rapprochements[0])).toContain('aucun bon de livraison')
    expect(phraseEcart(rapprochements[1])).toContain('absent de la facture')
  })

  it('dit la concordance quand les deux documents s accordent', () => {
    const [rapprochement] = rapprocher([ligne({ id: 'f1' })], [ligne({ id: 'b1' })])
    expect(phraseEcart(rapprochement)).toContain('concordent')
  })
})

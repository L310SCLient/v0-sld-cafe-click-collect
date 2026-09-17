import { describe, expect, it } from 'vitest'
import { bonsOrphelins, resumeRattachement } from './delivery-notes'

function bon(
  id: string,
  invoiceId: string | null,
  deliveryDate: string | null,
  createdAt = '2026-09-01T08:00:00.000Z'
) {
  return { id, invoice_id: invoiceId, delivery_date: deliveryDate, created_at: createdAt }
}

const AUJOURD_HUI = new Date('2026-09-17T10:00:00.000Z')

describe('bonsOrphelins', () => {
  it('ne garde que les bons sans facture rattachée', () => {
    const liste = bonsOrphelins([
      bon('a', 'f1', '2026-09-10'),
      bon('b', null, '2026-09-12'),
      bon('c', null, '2026-09-14'),
    ])
    expect(liste.map((b) => b.id)).toEqual(['b', 'c'])
  })

  it('conserve l ordre reçu', () => {
    const liste = bonsOrphelins([bon('c', null, '2026-09-14'), bon('b', null, '2026-09-12')])
    expect(liste.map((b) => b.id)).toEqual(['c', 'b'])
  })

  it('rend une liste vide quand tout est rattaché', () => {
    expect(bonsOrphelins([bon('a', 'f1', '2026-09-10')])).toEqual([])
  })
})

describe('resumeRattachement', () => {
  it('compte les rattachés et les orphelins', () => {
    const resume = resumeRattachement(
      [bon('a', 'f1', '2026-09-10'), bon('b', null, '2026-09-12'), bon('c', null, '2026-09-14')],
      AUJOURD_HUI
    )
    expect(resume.total).toBe(3)
    expect(resume.rattaches).toBe(1)
    expect(resume.orphelins).toBe(2)
  })

  it('sans orphelin, aucune attente à signaler', () => {
    const resume = resumeRattachement([bon('a', 'f1', '2026-09-10')], AUJOURD_HUI)
    expect(resume.orphelins).toBe(0)
    expect(resume.attenteJours).toBeNull()
  })

  it('mesure l attente sur le plus ancien orphelin, pas sur le dernier', () => {
    const resume = resumeRattachement(
      [bon('b', null, '2026-09-12'), bon('c', null, '2026-09-02'), bon('a', 'f1', '2026-01-01')],
      AUJOURD_HUI
    )
    expect(resume.attenteJours).toBe(15)
  })

  it('sans date de livraison, l attente part de la date d import', () => {
    const resume = resumeRattachement(
      [bon('b', null, null, '2026-09-07T19:30:00.000Z')],
      AUJOURD_HUI
    )
    expect(resume.attenteJours).toBe(10)
  })

  it('un bon daté dans le futur n attend pas depuis un nombre négatif de jours', () => {
    const resume = resumeRattachement([bon('b', null, '2026-09-30')], AUJOURD_HUI)
    expect(resume.attenteJours).toBe(0)
  })

  it('une liste vide ne raconte rien', () => {
    expect(resumeRattachement([], AUJOURD_HUI)).toEqual({
      total: 0,
      rattaches: 0,
      orphelins: 0,
      attenteJours: null,
    })
  })
})

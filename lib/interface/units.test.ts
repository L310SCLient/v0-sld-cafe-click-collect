import { describe, expect, it } from 'vitest'
import {
  baseUnitLabel,
  formatCents,
  formatCentsPrecise,
  formatQuantity,
  formatSignedQuantity,
  parseEurosToCents,
  parseQuantity,
  referenceUnitFactor,
  referenceUnitLabel,
} from './units'

describe('formatQuantity', () => {
  it('affiche les grammes en dessous de 1000', () => {
    expect(formatQuantity(250, 'g')).toBe('250 g')
  })

  it('bascule en kg à partir de 1000 g', () => {
    expect(formatQuantity(1000, 'g')).toBe('1 kg')
    expect(formatQuantity(4500, 'g')).toBe('4,5 kg')
  })

  it('bascule en L à partir de 1000 ml', () => {
    expect(formatQuantity(750, 'ml')).toBe('750 ml')
    expect(formatQuantity(1500, 'ml')).toBe('1,5 L')
  })

  it('ne convertit jamais les pièces', () => {
    expect(formatQuantity(12, 'unit')).toBe('12 u')
    expect(formatQuantity(2400, 'unit')).toBe('2\u202f400 u')
  })

  it('bascule aussi sur les quantités négatives', () => {
    expect(formatQuantity(-1500, 'g')).toBe('-1,5 kg')
  })
})

describe('formatSignedQuantity', () => {
  it('préfixe les entrées et les sorties', () => {
    expect(formatSignedQuantity(2000, 'g')).toBe('+2 kg')
    expect(formatSignedQuantity(-300, 'g')).toBe('−300 g')
  })
})

describe('parseQuantity', () => {
  it('accepte la virgule française et les espaces', () => {
    expect(parseQuantity('4,5')).toBe(4.5)
    expect(parseQuantity('1 250')).toBe(1250)
  })

  it('renvoie null sur une saisie vide ou invalide, jamais 0', () => {
    expect(parseQuantity('')).toBeNull()
    expect(parseQuantity('   ')).toBeNull()
    expect(parseQuantity('abc')).toBeNull()
  })

  it('conserve un vrai zéro saisi', () => {
    expect(parseQuantity('0')).toBe(0)
  })
})

describe('parseEurosToCents', () => {
  it('convertit en centimes entiers', () => {
    expect(parseEurosToCents('8,90')).toBe(890)
    expect(parseEurosToCents('21,4')).toBe(2140)
  })

  it('arrondit au centime le plus proche', () => {
    expect(parseEurosToCents('1,005')).toBe(101)
  })

  it('renvoie null sur une saisie invalide', () => {
    expect(parseEurosToCents('')).toBeNull()
  })
})

describe('formatage des montants', () => {
  it('affiche deux décimales', () => {
    expect(formatCents(890)).toBe('8,90 €')
  })

  it('passe à trois décimales sous le centime', () => {
    expect(formatCentsPrecise(0.4)).toBe('0,004 €')
    expect(formatCentsPrecise(0)).toBe('0,00 €')
    expect(formatCentsPrecise(150)).toBe('1,50 €')
  })
})

describe('unités de référence', () => {
  it('associe chaque unité de base à son unité lisible', () => {
    expect(referenceUnitLabel('g')).toBe('kg')
    expect(referenceUnitLabel('ml')).toBe('L')
    expect(referenceUnitLabel('unit')).toBe('u')
  })

  it('ne multiplie pas les pièces', () => {
    expect(referenceUnitFactor('g')).toBe(1000)
    expect(referenceUnitFactor('ml')).toBe(1000)
    expect(referenceUnitFactor('unit')).toBe(1)
  })

  it('abrège l unité de base', () => {
    expect(baseUnitLabel('g')).toBe('g')
    expect(baseUnitLabel('unit')).toBe('u')
  })
})

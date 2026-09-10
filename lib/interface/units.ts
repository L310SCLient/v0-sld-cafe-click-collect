import type { IngredientUnit } from '@/types'

/**
 * Unités et formatage.
 *
 * Règle du module : le stockage se fait toujours dans l'unité de base
 * (`g`, `ml`, `unit`). Les kg et les L n'existent qu'à l'affichage et à la
 * saisie — jamais en base, pour éviter toute dérive de virgule sur les
 * additions de stock.
 */

export const UNIT_OPTIONS: { value: IngredientUnit; label: string; short: string }[] = [
  { value: 'g', label: 'Poids (grammes)', short: 'g' },
  { value: 'ml', label: 'Volume (millilitres)', short: 'ml' },
  { value: 'unit', label: 'Pièce (unité)', short: 'u' },
]

/** Libellé court de l'unité de base. */
export function baseUnitLabel(unit: IngredientUnit): string {
  return unit === 'unit' ? 'u' : unit
}

/**
 * Unité de référence utilisée pour afficher un prix lisible
 * (8,90 €/kg plutôt que 0,0089 €/g).
 */
export function referenceUnitLabel(unit: IngredientUnit): string {
  switch (unit) {
    case 'g':
      return 'kg'
    case 'ml':
      return 'L'
    case 'unit':
      return 'u'
  }
}

/** Nombre d'unités de base dans une unité de référence. */
export function referenceUnitFactor(unit: IngredientUnit): number {
  return unit === 'unit' ? 1 : 1000
}

/** Formate un nombre à la française, sans zéros décimaux inutiles. */
export function formatNumber(value: number, maxDecimals = 2): string {
  const rounded = Number(value.toFixed(maxDecimals))
  return rounded.toLocaleString('fr-FR', { maximumFractionDigits: maxDecimals })
}

/**
 * Quantité lisible dans l'unité de base : 4500 g -> « 4,5 kg », 250 g -> « 250 g ».
 * Le passage à l'unité supérieure se fait à partir de 1000.
 */
export function formatQuantity(quantity: number, unit: IngredientUnit): string {
  if (unit === 'unit') {
    return `${formatNumber(quantity, 2)} u`
  }
  const abs = Math.abs(quantity)
  if (abs >= 1000) {
    return `${formatNumber(quantity / 1000, 2)} ${unit === 'g' ? 'kg' : 'L'}`
  }
  return `${formatNumber(quantity, 2)} ${unit}`
}

/** Quantité signée, pour un mouvement de stock : « +2 kg », « −300 g ». */
export function formatSignedQuantity(quantity: number, unit: IngredientUnit): string {
  const formatted = formatQuantity(Math.abs(quantity), unit)
  return `${quantity < 0 ? '−' : '+'}${formatted}`
}

/**
 * Lit une quantité saisie à la main. Accepte la virgule française et les
 * espaces. Renvoie `null` si la saisie n'est pas un nombre fini — jamais 0,
 * qui serait interprété comme une vraie valeur.
 */
export function parseQuantity(input: string): number | null {
  const cleaned = input.replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

/** Montant en centimes -> « 8,90 € ». */
export function formatCents(cents: number): string {
  return `${(cents / 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`
}

/**
 * Montant en centimes avec décimales fines, pour les coûts de ligne qui
 * peuvent valoir moins d'un centime (0,4 c de sel dans un sandwich).
 */
export function formatCentsPrecise(cents: number): string {
  if (cents !== 0 && Math.abs(cents) < 1) {
    return `${(cents / 100).toLocaleString('fr-FR', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} €`
  }
  return formatCents(cents)
}

/**
 * Lit un montant en euros saisi à la main -> centimes. `null` si invalide.
 *
 * L'arrondi se fait sur les chiffres décimaux en base 10, pas via
 * `Math.round(value * 100)` : en flottant, 1,005 × 100 vaut 100,4999… et
 * 1,005 € devenait 1,00 €.
 */
export function parseEurosToCents(input: string): number | null {
  const cleaned = input.replace(/\s/g, '').replace(',', '.')
  if (!/^-?\d+(\.\d*)?$|^-?\.\d+$/.test(cleaned)) return null

  const negative = cleaned.startsWith('-')
  const [integerPart = '', fractionPart = ''] = cleaned.replace('-', '').split('.')

  // Trois décimales suffisent pour décider de l'arrondi au centime.
  const fraction = `${fractionPart}000`.slice(0, 3)
  const total =
    Number(integerPart || '0') * 100 +
    Number(fraction.slice(0, 2)) +
    (Number(fraction[2]) >= 5 ? 1 : 0)

  return negative ? -total : total
}

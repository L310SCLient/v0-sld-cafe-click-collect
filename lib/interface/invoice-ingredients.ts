import type { IngredientUnit } from '@/types'
import { normalizeKey } from './recipe-import'

/**
 * Rattachement automatique des lignes de facture à des ingrédients.
 *
 * Deux règles tiennent ce module :
 *
 *  1. **Un ingrédient créé ici n'a jamais de prix.** Le prix n'entre qu'à la
 *     validation de la facture, avec sa date et sa provenance. Créer
 *     l'ingrédient est un geste de rangement, pas une affirmation de coût.
 *  2. **Pas d'unité, pas d'ingrédient.** Un ingrédient sans unité de base
 *     n'a ni stock ni prix au kilo : la ligne reste alors non rattachée
 *     plutôt que de créer une fiche inutilisable.
 */

export type LinePourIngredient = {
  id: string
  raw_label: string
  /** Nom rangeable proposé par la lecture, sans le conditionnement. */
  ingredient_name: string | null
  base_unit: IngredientUnit | null
}

export type GroupeIngredient = {
  name: string
  normalized: string
  base_unit: IngredientUnit
  lineIds: string[]
}

/** Nom à donner à l'ingrédient : celui de la lecture, sinon le libellé brut. */
export function cleanIngredientName(input: {
  ingredient_name: string | null
  raw_label: string
}): string | null {
  for (const candidat of [input.ingredient_name, input.raw_label]) {
    const propre = (candidat ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
    if (propre !== '') return propre
  }
  return null
}

/**
 * Regroupe les lignes qui parlent du même ingrédient, pour n'en créer qu'un.
 * Le dédoublonnage suit l'unicité en base, qui porte sur `lower(name)`.
 */
export function groupLinesForIngredients(lines: LinePourIngredient[]): GroupeIngredient[] {
  const groupes = new Map<string, GroupeIngredient>()

  for (const line of lines) {
    if (!line.base_unit) continue
    const name = cleanIngredientName(line)
    if (!name) continue

    const normalized = normalizeKey(name)
    const existant = groupes.get(normalized)
    if (existant) existant.lineIds.push(line.id)
    else groupes.set(normalized, { name, normalized, base_unit: line.base_unit, lineIds: [line.id] })
  }

  return [...groupes.values()]
}

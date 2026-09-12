import type { IngredientUnit } from '@/types'

/**
 * Logique pure de l'import de recettes par fichier.
 *
 * Trois règles tiennent ce module :
 *
 *  1. **Le dédoublonnage suit la base.** L'unicité des ingrédients et des
 *     recettes porte sur `lower(name)` : « Beurre » et « beurre » sont donc le
 *     même ingrédient, mais « Crème » et « Creme » sont deux noms distincts.
 *     Retirer les accents ici créerait des rapprochements que la base refuse.
 *  2. **Une quantité qui n'est pas un nombre positif avec une unité n'est pas
 *     une quantité.** Elle part de côté avec son texte d'origine plutôt que
 *     d'être devinée : `recipe_items` exige une quantité strictement positive.
 *  3. **Un coût incomplet ne s'affiche pas.** Une recette à laquelle il manque
 *     une ligne, ou dont le rendement est inconnu, ne produit aucun total :
 *     un chiffre faussement complet est pire que pas de chiffre.
 */

export type ParsedLine = {
  /** Libellé tel qu'écrit sur la fiche. Jamais réécrit. */
  raw_label: string
  /** Ce que la fiche disait de la quantité : « une pincée », « 250 g ». */
  raw_quantity: string | null
  quantity: number | null
  base_unit: IngredientUnit | null
  confidence?: number | null
}

export type ParsedRecipe = { lines: ParsedLine[] }

export type ExistingIngredient = { id: string; name: string; base_unit: IngredientUnit }

export type DictionaryEntry = {
  /** Libellé proposé : la variante la plus fréquente dans les fichiers. */
  raw_name: string
  normalized_name: string
  base_unit: IngredientUnit | null
  /** Nombre de fiches où ce nom apparaît, pour trier par importance. */
  occurrences: number
  ingredient_id: string | null
  decision: 'creer' | 'rattacher' | 'ignorer'
}

/** Clé de dédoublonnage : casse et espaces ignorés, accents conservés. */
export function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Recette existante portant exactement ce nom, ou `null`. */
export function matchExistingRecipe(
  rawName: string,
  existing: { id: string; name: string }[]
): string | null {
  const key = normalizeKey(rawName)
  return existing.find((recipe) => normalizeKey(recipe.name) === key)?.id ?? null
}

/**
 * Noms apparaissant deux fois dans un même lot. La base refuse deux recettes
 * de même nom : mieux vaut le dire avant la validation qu'échouer pendant.
 */
export function findDuplicateNames(rawNames: string[]): string[] {
  const counts = new Map<string, number>()
  for (const name of rawNames) {
    const key = normalizeKey(name)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key)
}

/** Liste dédoublonnée des ingrédients de tout le lot : c'est l'écran 1. */
export function buildIngredientDictionary(
  recipes: ParsedRecipe[],
  existing: ExistingIngredient[]
): DictionaryEntry[] {
  const entries = new Map<
    string,
    { labels: Map<string, number>; units: Map<IngredientUnit, number>; occurrences: number }
  >()

  for (const recipe of recipes) {
    const seenInRecipe = new Set<string>()
    for (const line of recipe.lines) {
      const key = normalizeKey(line.raw_label)
      if (key === '') continue

      const entry = entries.get(key) ?? { labels: new Map(), units: new Map(), occurrences: 0 }
      const label = line.raw_label.trim()
      entry.labels.set(label, (entry.labels.get(label) ?? 0) + 1)
      if (line.base_unit) entry.units.set(line.base_unit, (entry.units.get(line.base_unit) ?? 0) + 1)
      if (!seenInRecipe.has(key)) {
        entry.occurrences += 1
        seenInRecipe.add(key)
      }
      entries.set(key, entry)
    }
  }

  const existingByKey = new Map(existing.map((item) => [normalizeKey(item.name), item]))

  return [...entries.entries()]
    .map(([key, entry]) => {
      const match = existingByKey.get(key) ?? null
      const label = [...entry.labels.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr')
      )[0]?.[0]
      const majorityUnit =
        [...entry.units.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      return {
        raw_name: label ?? key,
        normalized_name: key,
        // Un ingrédient existant impose son unité : c'est elle qui gouverne
        // déjà son stock et son prix.
        base_unit: match ? match.base_unit : majorityUnit,
        occurrences: entry.occurrences,
        ingredient_id: match?.id ?? null,
        decision: (match ? 'rattacher' : 'creer') as DictionaryEntry['decision'],
      }
    })
    .sort(
      (a, b) =>
        b.occurrences - a.occurrences || a.normalized_name.localeCompare(b.normalized_name, 'fr')
    )
}

/**
 * Sépare ce qui peut entrer dans `recipe_items` de ce qui part dans
 * `recipe_missing_items`. Une quantité sans unité n'est pas chiffrable : 250
 * de quoi ?
 */
export function splitLines(lines: ParsedLine[]): {
  chiffrables: ParsedLine[]
  misesDeCote: ParsedLine[]
} {
  const chiffrables: ParsedLine[] = []
  const misesDeCote: ParsedLine[] = []

  for (const line of lines) {
    const quantifiable =
      typeof line.quantity === 'number' &&
      Number.isFinite(line.quantity) &&
      line.quantity > 0 &&
      line.base_unit !== null
    if (quantifiable) chiffrables.push(line)
    else misesDeCote.push(line)
  }

  return { chiffrables, misesDeCote }
}

/** Le coût d'une recette ne s'affiche que si elle est complète et rendue. */
export function costIsDisplayable(input: {
  missingItems: number
  portionsConfirmed: boolean
}): boolean {
  return input.missingItems === 0 && input.portionsConfirmed
}

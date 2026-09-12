/**
 * Comparateurs de prix et calcul des hausses.
 *
 * Toute la logique est pure : la base ne fournit que des prix observés, datés
 * à la date de la facture. Deux règles d'honnêteté sont encodées ici plutôt
 * que laissées à la discipline de l'appelant :
 *
 *  1. « moins cher » n'a de sens qu'à partir de deux fournisseurs. Être le
 *     seul fournisseur d'un produit ne fait pas de toi le moins cher.
 *  2. une hausse demande deux relevés à des dates différentes. Un seul prix
 *     ne prouve aucune évolution.
 */

/** Un prix relevé sur une facture, ramené à l'unité de base. */
export interface PriceObservation {
  supplierId: string
  supplierName: string
  /** Centimes par unité de base (g, ml ou pièce), non arrondi. */
  pricePerBaseUnit: number
  packQuantity: number
  packPriceCents: number
  /** Date imprimée sur la facture, au format YYYY-MM-DD. */
  observedOn: string
}

/** Prix d'une unité de base à partir d'un conditionnement. */
export function pricePerBaseUnit(
  packPriceCents: number,
  packQuantity: number
): number | null {
  if (packQuantity <= 0) return null
  return packPriceCents / packQuantity
}

export interface SupplierComparison {
  cheapest: PriceObservation
  /** Les autres fournisseurs, du moins cher au plus cher. */
  others: PriceObservation[]
  /**
   * Économie par unité de base entre le moins cher et le plus cher.
   * `null` s'il n'y a qu'un seul fournisseur : il n'y a rien à comparer.
   */
  savingsPerBaseUnit: number | null
  /** Écart en part du prix le plus élevé (0,25 = 25 % plus cher). */
  spreadRatio: number | null
}

/**
 * Garde le dernier prix connu de chaque fournisseur, puis les classe.
 * `null` si aucun prix n'est connu.
 */
export function compareSuppliers(
  observations: PriceObservation[]
): SupplierComparison | null {
  const latestBySupplier = new Map<string, PriceObservation>()
  for (const observation of observations) {
    const current = latestBySupplier.get(observation.supplierId)
    if (!current || observation.observedOn >= current.observedOn) {
      latestBySupplier.set(observation.supplierId, observation)
    }
  }

  const ranked = [...latestBySupplier.values()].sort((a, b) => {
    if (a.pricePerBaseUnit !== b.pricePerBaseUnit) {
      return a.pricePerBaseUnit - b.pricePerBaseUnit
    }
    // À prix égal, le relevé le plus récent passe devant.
    return b.observedOn.localeCompare(a.observedOn)
  })

  if (ranked.length === 0) return null

  const cheapest = ranked[0]
  const others = ranked.slice(1)

  if (others.length === 0) {
    return { cheapest, others, savingsPerBaseUnit: null, spreadRatio: null }
  }

  const dearest = ranked[ranked.length - 1]
  const savings = dearest.pricePerBaseUnit - cheapest.pricePerBaseUnit

  return {
    cheapest,
    others,
    savingsPerBaseUnit: savings,
    spreadRatio: dearest.pricePerBaseUnit > 0 ? savings / dearest.pricePerBaseUnit : null,
  }
}

export interface PriceChange {
  previous: { pricePerBaseUnit: number; observedOn: string }
  latest: { pricePerBaseUnit: number; observedOn: string }
  /** Variation en centimes par unité de base. Négatif = baisse. */
  deltaPerBaseUnit: number
  /** Variation relative (0,12 = +12 %). */
  ratio: number
}

/**
 * Variation entre les deux derniers relevés de dates DIFFÉRENTES.
 * `null` s'il n'y a pas au moins deux dates : deux lignes du même jour ne
 * décrivent pas une évolution.
 */
export function computePriceChange(history: PriceObservation[]): PriceChange | null {
  const byDate = new Map<string, PriceObservation>()
  for (const observation of history) {
    byDate.set(observation.observedOn, observation)
  }

  const dates = [...byDate.keys()].sort()
  if (dates.length < 2) return null

  const previousDate = dates[dates.length - 2]
  const latestDate = dates[dates.length - 1]
  const previous = byDate.get(previousDate)!
  const latest = byDate.get(latestDate)!

  const delta = latest.pricePerBaseUnit - previous.pricePerBaseUnit

  return {
    previous: { pricePerBaseUnit: previous.pricePerBaseUnit, observedOn: previousDate },
    latest: { pricePerBaseUnit: latest.pricePerBaseUnit, observedOn: latestDate },
    deltaPerBaseUnit: delta,
    ratio: previous.pricePerBaseUnit > 0 ? delta / previous.pricePerBaseUnit : 0,
  }
}

export interface SupplierRanking {
  supplierId: string
  supplierName: string
  /** Ingrédients où ce fournisseur est le moins cher. */
  cheapestCount: number
  /** Ingrédients comparables auxquels il participe (2 fournisseurs minimum). */
  participatedCount: number
}

/**
 * Classe les fournisseurs sur un ensemble d'ingrédients — typiquement une
 * famille (« les légumes »).
 *
 * Seuls les ingrédients ayant AU MOINS DEUX fournisseurs entrent dans le
 * décompte : sinon un fournisseur unique gagnerait mécaniquement, et le
 * classement mentirait.
 */
export function rankSuppliers(
  items: { ingredientId: string; observations: PriceObservation[] }[]
): SupplierRanking[] {
  const rankings = new Map<string, SupplierRanking>()

  function entry(observation: PriceObservation): SupplierRanking {
    const existing = rankings.get(observation.supplierId)
    if (existing) return existing
    const created: SupplierRanking = {
      supplierId: observation.supplierId,
      supplierName: observation.supplierName,
      cheapestCount: 0,
      participatedCount: 0,
    }
    rankings.set(observation.supplierId, created)
    return created
  }

  for (const item of items) {
    const comparison = compareSuppliers(item.observations)
    if (!comparison || comparison.others.length === 0) continue

    entry(comparison.cheapest).cheapestCount += 1
    entry(comparison.cheapest).participatedCount += 1
    for (const other of comparison.others) {
      entry(other).participatedCount += 1
    }
  }

  return [...rankings.values()].sort(
    (a, b) => b.cheapestCount - a.cheapestCount || a.supplierName.localeCompare(b.supplierName, 'fr')
  )
}

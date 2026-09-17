import type { IngredientUnit } from '@/types'
import type { PriceObservation } from './prices'
import { formatCents, formatNumber, referenceUnitFactor, referenceUnitLabel } from './units'

/**
 * Rapport de prix pour UN fournisseur.
 *
 * Le comparateur existant répond à « qui est le moins cher ». Celui-ci répond
 * à l'autre question du patron : « qu'est-ce que Metro m'a augmenté ce
 * trimestre ». D'où deux partis pris :
 *
 *  1. le filtrage par fournisseur se fait AVANT l'appel : ce module ne voit
 *     que les relevés du fournisseur choisi, et ne peut donc pas mélanger
 *     par accident la hausse d'un fournisseur avec la baisse d'un autre.
 *  2. une variation demande un relevé antérieur. Sans lui, on dit « premier
 *     relevé » et on laisse `variationRatio` à `null` : un 0 % affiché
 *     ferait croire à un prix tenu, alors qu'on ne sait simplement rien.
 */

export type PeriodeRapport = 'derniere' | 'mois' | 'trimestre' | 'annee'

/** En dessous, la variation relève de l'arrondi de facture, pas d'un mouvement. */
const SEUIL_STABLE = 0.005

const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
]

/** Les relevés d'un ingrédient, déjà réduits au fournisseur choisi. */
export interface EntreeRapport {
  ingredientId: string
  ingredientNom: string
  baseUnit: IngredientUnit
  observations: PriceObservation[]
}

export interface LigneRapport {
  ingredientId: string
  ingredientNom: string
  baseUnit: IngredientUnit
  /** Centimes par unité de base, relevé de référence de la période. */
  prixActuel: number
  dateActuelle: string
  /** `null` quand rien ne précède : il n'y a alors aucune variation à écrire. */
  prixPrecedent: number | null
  datePrecedente: string | null
  /** 0,12 = +12 %. `null` si et seulement si le statut vaut « premier ». */
  variationRatio: number | null
  statut: 'hausse' | 'baisse' | 'stable' | 'premier'
}

/**
 * Premier jour de la période, au format des dates de facture.
 *
 * Le calcul se fait en UTC : `observed_on` est une date nue, sans heure ni
 * fuseau. Raisonner en heure locale ferait tomber le serveur et le navigateur
 * sur deux mois différents la nuit du changement de mois.
 */
export function debutPeriode(periode: PeriodeRapport, aujourdhui: Date): string | null {
  if (periode === 'derniere') return null

  const annee = aujourdhui.getUTCFullYear()
  const mois = aujourdhui.getUTCMonth()
  const moisDebut = periode === 'mois' ? mois : periode === 'trimestre' ? mois - (mois % 3) : 0

  return `${annee}-${String(moisDebut + 1).padStart(2, '0')}-01`
}

interface Releve {
  date: string
  prix: number
}

/**
 * Un relevé par date, du plus ancien au plus récent.
 *
 * Deux lignes du même jour — une facture en deux pages, une livraison
 * complémentaire — décrivent le même prix du jour, pas une évolution.
 */
function relevesParDate(observations: PriceObservation[]): Releve[] {
  const parDate = new Map<string, number>()
  for (const observation of observations) {
    parDate.set(observation.observedOn, observation.pricePerBaseUnit)
  }

  return [...parDate.entries()]
    .map(([date, prix]) => ({ date, prix }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function statutDe(ratio: number): LigneRapport['statut'] {
  if (Math.abs(ratio) < SEUIL_STABLE) return 'stable'
  return ratio > 0 ? 'hausse' : 'baisse'
}

const RANG_STATUT: Record<LigneRapport['statut'], number> = {
  hausse: 0,
  baisse: 1,
  stable: 2,
  premier: 3,
}

/**
 * Le rapport d'un fournisseur sur une période, trié par urgence : les hausses
 * d'abord, la plus forte en tête, puisque c'est ce qu'on vient chercher.
 *
 * Un ingrédient sans relevé DANS la période sort du rapport : afficher son
 * vieux prix sous un titre « ce mois » le ferait passer pour une facture du
 * mois.
 */
export function construireRapport(
  entrees: EntreeRapport[],
  periode: PeriodeRapport,
  aujourdhui: Date
): LigneRapport[] {
  const debut = debutPeriode(periode, aujourdhui)
  const lignes: LigneRapport[] = []

  for (const entree of entrees) {
    const releves = relevesParDate(entree.observations)
    if (releves.length === 0) continue

    let actuel: Releve
    let precedent: Releve | null

    if (debut === null) {
      actuel = releves[releves.length - 1]
      precedent = releves[releves.length - 2] ?? null
    } else {
      const dansPeriode = releves.filter((releve) => releve.date >= debut)
      if (dansPeriode.length === 0) continue
      const anterieurs = releves.filter((releve) => releve.date < debut)
      actuel = dansPeriode[dansPeriode.length - 1]
      precedent = anterieurs[anterieurs.length - 1] ?? null
    }

    // Un prix précédent nul ne permet aucun rapport : on le traite comme une
    // absence de référence plutôt que d'annoncer une hausse infinie.
    const comparable = precedent !== null && precedent.prix > 0 ? precedent : null
    const variationRatio =
      comparable === null ? null : (actuel.prix - comparable.prix) / comparable.prix

    lignes.push({
      ingredientId: entree.ingredientId,
      ingredientNom: entree.ingredientNom,
      baseUnit: entree.baseUnit,
      prixActuel: actuel.prix,
      dateActuelle: actuel.date,
      prixPrecedent: comparable?.prix ?? null,
      datePrecedente: comparable?.date ?? null,
      variationRatio,
      statut: variationRatio === null ? 'premier' : statutDe(variationRatio),
    })
  }

  return lignes.sort((a, b) => {
    const rang = RANG_STATUT[a.statut] - RANG_STATUT[b.statut]
    if (rang !== 0) return rang

    // Dans les hausses comme dans les baisses, le plus gros mouvement en tête.
    if (a.statut === 'hausse') return b.variationRatio! - a.variationRatio!
    if (a.statut === 'baisse') return a.variationRatio! - b.variationRatio!

    return a.ingredientNom.localeCompare(b.ingredientNom, 'fr')
  })
}

/** Prix par unité de base -> « 8,90 €/kg ». */
function prixLisible(pricePerBaseUnit: number, unit: IngredientUnit): string {
  return `${formatCents(pricePerBaseUnit * referenceUnitFactor(unit))}/${referenceUnitLabel(unit)}`
}

/**
 * « le 3 mars », ou « le 2 décembre 2025 » si le relevé précédent tombe sur un
 * autre exercice — un écart de prix sur quatorze mois ne se lit pas comme un
 * écart sur trois semaines.
 */
function dateLisible(iso: string, anneeReference: string): string {
  const [annee, mois, jour] = iso.split('-')
  const libelle = `${Number(jour)} ${MOIS_FR[Number(mois) - 1]}`
  return annee === anneeReference ? libelle : `${libelle} ${annee}`
}

/**
 * Variation en toutes lettres. Sous 10 %, l'arrondi à l'entier écraserait la
 * différence entre 0,6 % et 1,4 % : on garde une décimale.
 */
function variationLisible(ratio: number): string {
  const pourcentage = Math.abs(ratio) * 100
  const valeur = pourcentage >= 10 ? String(Math.round(pourcentage)) : formatNumber(pourcentage, 1)
  return `${ratio < 0 ? '−' : '+'}${valeur} %`
}

/** Une ligne de rapport en une phrase, prête à afficher. */
export function phraseRapport(ligne: LigneRapport): string {
  const prix = prixLisible(ligne.prixActuel, ligne.baseUnit)

  if (ligne.statut === 'premier' || ligne.prixPrecedent === null || ligne.datePrecedente === null) {
    return `${ligne.ingredientNom} : ${prix}, premier relevé — rien à comparer`
  }

  const depuis = dateLisible(ligne.datePrecedente, ligne.dateActuelle.slice(0, 4))
  const ancien = prixLisible(ligne.prixPrecedent, ligne.baseUnit)
  const variation =
    ligne.statut === 'stable' ? 'stable' : variationLisible(ligne.variationRatio ?? 0)

  return `${ligne.ingredientNom} : ${prix}, ${variation} depuis le ${depuis} (${ancien})`
}

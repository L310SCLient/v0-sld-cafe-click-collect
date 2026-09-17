import type { IngredientUnit } from '@/types'
import { pricePerBaseUnit } from './prices'
import { normalizeKey } from './recipe-import'
import { formatCents, formatNumber, referenceUnitFactor, referenceUnitLabel } from './units'

/**
 * Rapprochement d'une facture avec les bons de livraison qui lui sont
 * rattachés. Logique pure : rien n'est lu ni écrit en base ici.
 *
 * Trois règles d'honnêteté tiennent ce module :
 *
 *  1. **La facture fait autorité, le bon donne le prix provisoire.** L'écart
 *     est donc toujours orienté facture − bon : positif, il est en faveur du
 *     fournisseur.
 *  2. **Un prix manquant n'est pas un écart.** Sans les deux prix, le statut
 *     est `indeterminable` et le chiffre reste `null` : on ne comble pas un
 *     trou avec un zéro.
 *  3. **Un rapprochement se refuse plutôt que de se deviner.** Deux lignes
 *     rattachées à des ingrédients DIFFÉRENTS ne se rejoignent jamais par le
 *     libellé : le rattachement est un geste humain, il prime sur le texte.
 */

export type LignePourRapprochement = {
  id: string
  /** Libellé tel qu'écrit sur le document. */
  raw_label: string
  ingredient_id: string | null
  /** Nombre de conditionnements. */
  quantity: number | null
  /** Contenu d'un conditionnement, dans `base_unit`. */
  pack_quantity: number | null
  base_unit: IngredientUnit | null
  /** Prix d'UN conditionnement. */
  pack_price_cents: number | null
}

export type StatutRapprochement =
  | 'identique'
  | 'ecart_prix'
  | 'ecart_quantite'
  | 'indeterminable'
  | 'seulement_facture'
  | 'seulement_bon'

export interface Rapprochement {
  statut: StatutRapprochement
  ligneFacture: LignePourRapprochement | null
  ligneBon: LignePourRapprochement | null
  /** Facture − bon, en centimes par unité de base. `null` si non chiffrable. */
  ecartCentimesParUniteDeBase: number | null
  /** Écart rapporté au prix du bon (0,034 = +3,4 % sur la facture). */
  ecartRatio: number | null
}

/**
 * En deçà, l'écart vient de l'arrondi au centime du fournisseur, pas d'une
 * hausse : le signaler ferait passer chaque facture pour un litige.
 */
const TOLERANCE = 0.005

/** Prix d'une unité de base, ou `null` si le document ne le permet pas. */
function prixUnitaire(ligne: LignePourRapprochement): number | null {
  if (ligne.pack_price_cents === null || ligne.pack_quantity === null) return null
  return pricePerBaseUnit(ligne.pack_price_cents, ligne.pack_quantity)
}

/** Quantité livrée ou facturée, ramenée à l'unité de base. */
function quantiteTotale(ligne: LignePourRapprochement): number | null {
  if (ligne.quantity === null || ligne.pack_quantity === null) return null
  return ligne.quantity * ligne.pack_quantity
}

/** Montant de la ligne : ce que le document annonce pour elle. */
function montantLigne(ligne: LignePourRapprochement): number | null {
  if (ligne.quantity === null || ligne.pack_price_cents === null) return null
  return ligne.quantity * ligne.pack_price_cents
}

function orphelin(
  statut: 'seulement_facture' | 'seulement_bon',
  ligne: LignePourRapprochement
): Rapprochement {
  return {
    statut,
    ligneFacture: statut === 'seulement_facture' ? ligne : null,
    ligneBon: statut === 'seulement_bon' ? ligne : null,
    ecartCentimesParUniteDeBase: null,
    ecartRatio: null,
  }
}

function comparer(
  ligneFacture: LignePourRapprochement,
  ligneBon: LignePourRapprochement
): Rapprochement {
  const prixFacture = prixUnitaire(ligneFacture)
  const prixBon = prixUnitaire(ligneBon)

  if (prixFacture === null || prixBon === null) {
    return {
      statut: 'indeterminable',
      ligneFacture,
      ligneBon,
      ecartCentimesParUniteDeBase: null,
      ecartRatio: null,
    }
  }

  const ecart = prixFacture - prixBon
  // Un bon à prix nul ne donne aucune base de pourcentage : on compare alors
  // les prix bruts plutôt que d'inventer un ratio.
  const ratio = prixBon > 0 ? ecart / prixBon : null
  const memePrix = ratio !== null ? Math.abs(ratio) < TOLERANCE : ecart === 0

  const quantiteFacture = quantiteTotale(ligneFacture)
  const quantiteBon = quantiteTotale(ligneBon)
  const memeQuantite =
    quantiteFacture === null || quantiteBon === null || quantiteBon <= 0
      ? true
      : Math.abs(quantiteFacture - quantiteBon) / quantiteBon < TOLERANCE

  return {
    statut: !memePrix ? 'ecart_prix' : memeQuantite ? 'identique' : 'ecart_quantite',
    ligneFacture,
    ligneBon,
    ecartCentimesParUniteDeBase: ecart,
    ecartRatio: ratio,
  }
}

/**
 * Met en face les lignes de la facture et celles des bons rattachés.
 *
 * L'ingrédient passe en premier sur TOUTES les lignes avant que le libellé
 * n'entre en jeu : sinon une ligne sans ingrédient prendrait par son texte le
 * bon qu'une autre ligne revendique par son rattachement.
 */
export function rapprocher(
  lignesFacture: LignePourRapprochement[],
  lignesBons: LignePourRapprochement[]
): Rapprochement[] {
  const enFace = new Map<string, LignePourRapprochement>()
  const consommees = new Set<string>()

  for (const ligneFacture of lignesFacture) {
    if (ligneFacture.ingredient_id === null) continue
    const ligneBon = lignesBons.find(
      (candidate) =>
        !consommees.has(candidate.id) && candidate.ingredient_id === ligneFacture.ingredient_id
    )
    if (ligneBon) {
      enFace.set(ligneFacture.id, ligneBon)
      consommees.add(ligneBon.id)
    }
  }

  for (const ligneFacture of lignesFacture) {
    if (enFace.has(ligneFacture.id)) continue
    const cle = normalizeKey(ligneFacture.raw_label)
    const ligneBon = lignesBons.find(
      (candidate) =>
        !consommees.has(candidate.id) &&
        normalizeKey(candidate.raw_label) === cle &&
        (ligneFacture.ingredient_id === null || candidate.ingredient_id === null)
    )
    if (ligneBon) {
      enFace.set(ligneFacture.id, ligneBon)
      consommees.add(ligneBon.id)
    }
  }

  const rapprochements = lignesFacture.map((ligneFacture) => {
    const ligneBon = enFace.get(ligneFacture.id)
    return ligneBon ? comparer(ligneFacture, ligneBon) : orphelin('seulement_facture', ligneFacture)
  })

  for (const ligneBon of lignesBons) {
    if (!consommees.has(ligneBon.id)) rapprochements.push(orphelin('seulement_bon', ligneBon))
  }

  return rapprochements
}

export interface ResumeRapprochement {
  total: number
  identiques: number
  ecartsPrix: number
  ecartsQuantite: number
  indeterminables: number
  seulementFacture: number
  seulementBon: number
  /**
   * Somme des écarts facture − bon, en centimes, sur les SEULES lignes
   * comparables des deux côtés. `null` si aucune ne l'est. Un orphelin n'y
   * entre pas : l'absence d'un bon peut signifier une photo manquante, pas
   * une marchandise non livrée — le chiffrer serait une accusation.
   */
  ecartTotalCentimes: number | null
}

export function resumeRapprochement(rapprochements: Rapprochement[]): ResumeRapprochement {
  const resume: ResumeRapprochement = {
    total: rapprochements.length,
    identiques: 0,
    ecartsPrix: 0,
    ecartsQuantite: 0,
    indeterminables: 0,
    seulementFacture: 0,
    seulementBon: 0,
    ecartTotalCentimes: null,
  }

  for (const rapprochement of rapprochements) {
    switch (rapprochement.statut) {
      case 'identique':
        resume.identiques += 1
        break
      case 'ecart_prix':
        resume.ecartsPrix += 1
        break
      case 'ecart_quantite':
        resume.ecartsQuantite += 1
        break
      case 'indeterminable':
        resume.indeterminables += 1
        break
      case 'seulement_facture':
        resume.seulementFacture += 1
        break
      case 'seulement_bon':
        resume.seulementBon += 1
        break
    }

    const montant = montantEcart(rapprochement)
    if (montant !== null) {
      resume.ecartTotalCentimes = (resume.ecartTotalCentimes ?? 0) + montant
    }
  }

  return resume
}

/** Montant facturé moins montant livré, quand les deux sont connus. */
export function montantEcart(rapprochement: Rapprochement): number | null {
  const { ligneFacture, ligneBon } = rapprochement
  if (!ligneFacture || !ligneBon) return null

  const facture = montantLigne(ligneFacture)
  const bon = montantLigne(ligneBon)
  if (facture === null || bon === null) return null

  return facture - bon
}

/** Prix lisible : 0,92 centime le gramme s'affiche « 9,20 €/kg ». */
function prixLisible(prixParUniteDeBase: number, unite: IngredientUnit | null): string {
  const facteur = unite ? referenceUnitFactor(unite) : 1
  const label = unite ? referenceUnitLabel(unite) : 'unité'
  return `${formatCents(prixParUniteDeBase * facteur)}/${label}`
}

/** Montant de la ligne, précédé d'un espace, ou rien s'il est inconnu. */
function montantTexte(ligne: LignePourRapprochement | null): string {
  const montant = ligne ? montantLigne(ligne) : null
  return montant === null ? '' : ` ${formatCents(montant)}`
}

/**
 * Une phrase française prête à afficher. Elle dit toujours de quel côté
 * penche l'écart : « +3,4 % sur la facture » se lit sans mode d'emploi.
 */
export function phraseEcart(rapprochement: Rapprochement): string {
  const { statut, ligneFacture, ligneBon, ecartCentimesParUniteDeBase, ecartRatio } = rapprochement
  const libelle = (ligneFacture ?? ligneBon)?.raw_label ?? 'Ligne sans libellé'
  const unite = ligneFacture?.base_unit ?? ligneBon?.base_unit ?? null

  switch (statut) {
    case 'seulement_facture':
      return `${libelle} : facturé${montantTexte(ligneFacture)}, aucun bon de livraison ne le mentionne.`

    case 'seulement_bon':
      return `${libelle} : livré${montantTexte(ligneBon)}, absent de la facture.`

    case 'indeterminable': {
      const cotes: string[] = []
      if (!ligneFacture || prixUnitaire(ligneFacture) === null) cotes.push('la facture')
      if (!ligneBon || prixUnitaire(ligneBon) === null) cotes.push('le bon de livraison')
      return `${libelle} : prix manquant sur ${cotes.join(' et ')} — rapprochement impossible.`
    }

    case 'ecart_quantite': {
      const facture = ligneFacture?.quantity
      const bon = ligneBon?.quantity
      if (facture === null || facture === undefined || bon === null || bon === undefined) {
        return `${libelle} : les quantités diffèrent entre la facture et le bon, au même prix unitaire.`
      }
      return `${libelle} : ${formatNumber(facture, 2)} colis facturés contre ${formatNumber(bon, 2)} livrés, au même prix unitaire.`
    }

    case 'identique': {
      const prix = ligneFacture ? prixUnitaire(ligneFacture) : null
      const chiffre = prix === null ? '' : ` (${prixLisible(prix, unite)})`
      return `${libelle} : facture et bon concordent${chiffre}.`
    }

    case 'ecart_prix': {
      const prixFacture = ligneFacture ? prixUnitaire(ligneFacture) : null
      const prixBon = ligneBon ? prixUnitaire(ligneBon) : null
      if (prixFacture === null || prixBon === null) {
        return `${libelle} : les prix diffèrent entre la facture et le bon.`
      }
      const signe = (ecartCentimesParUniteDeBase ?? 0) >= 0 ? '+' : '−'
      const pourcentage =
        ecartRatio === null
          ? ''
          : ` — ${signe}${formatNumber(Math.abs(ecartRatio) * 100, 1)} % sur la facture`
      return `${libelle} : facturé ${prixLisible(prixFacture, unite)}, livré ${prixLisible(prixBon, unite)}${pourcentage}.`
    }
  }
}

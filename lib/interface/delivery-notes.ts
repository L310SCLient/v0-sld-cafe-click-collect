import type { IngredientUnit, Supplier } from '@/types'

/**
 * Bons de livraison.
 *
 * Ce que le restaurant photographie au quotidien, c'est le bon de livraison
 * valorisé ; la facture arrive plus tard. Le bon donne donc un prix
 * PROVISOIRE, la facture fait AUTORITÉ. Conséquence tenue partout dans le
 * lot : un bon n'écrit jamais dans `ingredient_prices`.
 *
 * Un bon sans facture rattachée est le cas NORMAL — pas une erreur de saisie.
 * Ce module sert à le rendre visible plutôt qu'à le corriger : c'est la durée
 * d'attente qui alerte, pas l'absence de rattachement en elle-même.
 */

export type DeliveryNoteStatus = 'a_lire' | 'lecture' | 'a_valider' | 'validee' | 'echec'

export interface DeliveryNote {
  id: string
  supplier_id: string | null
  /** NULL = bon pas encore rattaché à sa facture. Cas normal et attendu. */
  invoice_id: string | null
  delivery_date: string | null
  note_number: string | null
  image_path: string | null
  status: DeliveryNoteStatus
  parse_error: string | null
  parse_model: string | null
  parsed_at: string | null
  validated_at: string | null
  created_at: string
}

export interface DeliveryNoteLine {
  id: string
  delivery_note_id: string
  /** Libellé tel qu'écrit sur le bon. Jamais réécrit. */
  raw_label: string
  quantity: number | null
  pack_quantity: number | null
  base_unit: IngredientUnit | null
  /** Prix d'un conditionnement selon le bon. Provisoire tant que la facture manque. */
  pack_price_cents: number | null
  line_total_cents: number | null
  ingredient_id: string | null
  /** Confiance du parsing entre 0 et 1. `null` = saisie humaine. */
  confidence: number | null
  created_at: string
}

/** Facture réduite à ce qu'il faut pour la nommer à l'écran. */
export interface InvoiceRef {
  id: string
  invoice_number: string | null
  invoice_date: string | null
}

export interface DeliveryNoteWithLinks extends DeliveryNote {
  supplier: Supplier | null
  invoice: InvoiceRef | null
  lineCount: number
}

// ─── Rattachement ───────────────────────────────────────────────────────────

/** Le minimum pour juger d'un rattachement, sans dépendre du reste du bon. */
export type BonPourRattachement = {
  invoice_id: string | null
  delivery_date: string | null
  created_at: string
}

export function bonsOrphelins<T extends BonPourRattachement>(bons: T[]): T[] {
  return bons.filter((bon) => bon.invoice_id === null)
}

export interface ResumeRattachement {
  total: number
  rattaches: number
  orphelins: number
  /**
   * Jours écoulés depuis le plus ancien bon en attente, `null` s'il n'y en a
   * aucun. C'est ce chiffre qui alerte : un bon reçu hier est normal, un bon
   * qui attend depuis trois semaines dit qu'une facture manque.
   */
  attenteJours: number | null
}

const MS_PAR_JOUR = 24 * 60 * 60 * 1000

/**
 * Jour de référence d'un bon : la date de livraison imprimée dessus, sinon la
 * date d'import. Un bon dont la date n'a pas été lue attend quand même.
 */
function jourDeReference(bon: BonPourRattachement): string {
  return bon.delivery_date ?? bon.created_at.slice(0, 10)
}

/** Comparaison en jours calendaires : l'heure d'import ne doit rien décaler. */
function versJourUTC(jour: string): number {
  return Date.parse(`${jour}T00:00:00.000Z`)
}

export function resumeRattachement(
  bons: BonPourRattachement[],
  aujourdHui: Date = new Date()
): ResumeRattachement {
  const orphelins = bonsOrphelins(bons)

  let attenteJours: number | null = null
  if (orphelins.length > 0) {
    const jours = orphelins.map((bon) => versJourUTC(jourDeReference(bon)))
    const plusAncien = Math.min(...jours.filter((valeur) => Number.isFinite(valeur)))
    if (Number.isFinite(plusAncien)) {
      const ecoule = (versJourUTC(aujourdHui.toISOString().slice(0, 10)) - plusAncien) / MS_PAR_JOUR
      // Un bon daté de demain n'attend pas « depuis -1 jour » : il n'attend pas.
      attenteJours = Math.max(0, Math.round(ecoule))
    }
  }

  return {
    total: bons.length,
    rattaches: bons.length - orphelins.length,
    orphelins: orphelins.length,
    attenteJours,
  }
}

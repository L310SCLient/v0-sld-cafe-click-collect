'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import {
  type Rapprochement,
  montantEcart,
  phraseEcart,
  rapprocher,
  resumeRapprochement,
} from '@/lib/interface/reconciliation'
import { formatCents } from '@/lib/interface/units'
import type { DeliveryNote, DeliveryNoteLine } from '@/lib/interface/delivery-notes'
import type { InvoiceLine } from '@/types'
import { GhostButton } from './form-bits'

/** Rouge du dépôt : ce qui coûte de l'argent au restaurant. */
const DEFAVORABLE = '#B4302A'

/**
 * Rapprochement d'une facture avec ses bons de livraison.
 *
 * Le bon donne un prix provisoire, la facture fait autorité : tout l'écran
 * sert à voir où la facture s'écarte de ce qui a été livré. Ce qui penche en
 * faveur du fournisseur est en rouge — c'est la seule chose à regarder quand
 * on est pressé.
 */
export function ReconciliationView({
  lignesFacture,
  bons,
}: {
  lignesFacture: InvoiceLine[]
  bons: { note: DeliveryNote; lignes: DeliveryNoteLine[] }[]
}) {
  const [toutAfficher, setToutAfficher] = useState(false)

  const rapprochements = useMemo(
    () => rapprocher(lignesFacture, bons.flatMap((bon) => bon.lignes)),
    [lignesFacture, bons]
  )
  const resume = useMemo(() => resumeRapprochement(rapprochements), [rapprochements])

  const aSignaler = rapprochements.filter((item) => item.statut !== 'identique')
  const affichees = toutAfficher ? rapprochements : aSignaler

  return (
    <section className="mt-8">
      <h2 className="font-serif mb-1" style={{ fontSize: '18px', color: 'var(--espresso)' }}>
        Rapprochement avec les bons de livraison
      </h2>

      {bons.length === 0 ? (
        <p
          className="rounded-2xl px-3 py-3 mt-2"
          style={{
            fontSize: '13px',
            color: 'var(--espresso-60)',
            border: '1px dashed var(--espresso-20)',
            lineHeight: 1.45,
          }}
        >
          Aucun bon de livraison rattaché à cette facture. Rien n’est donc comparé : ses prix ne
          sont confrontés à aucune livraison. Le rattachement se fait depuis l’écran des bons.
        </p>
      ) : (
        <>
          <p className="mb-3" style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
            {bons.length} bon{bons.length > 1 ? 's' : ''} rattaché{bons.length > 1 ? 's' : ''} ·{' '}
            {rapprochements.length} ligne{rapprochements.length > 1 ? 's' : ''} confrontée
            {rapprochements.length > 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <Tuile
              valeur={resume.ecartsPrix}
              libelle={`Écart${resume.ecartsPrix > 1 ? 's' : ''} de prix`}
              alerte={resume.ecartsPrix > 0}
            />
            <Tuile
              valeur={resume.ecartsQuantite}
              libelle={`Écart${resume.ecartsQuantite > 1 ? 's' : ''} de quantité`}
              alerte={resume.ecartsQuantite > 0}
            />
            <Tuile
              valeur={resume.seulementFacture}
              libelle="Facturé sans bon en face"
              alerte={resume.seulementFacture > 0}
            />
            <Tuile
              valeur={resume.seulementBon}
              libelle="Livré sans ligne de facture"
              alerte={false}
            />
          </div>

          <p
            className="rounded-2xl px-3 py-2.5 mb-3"
            style={{
              fontSize: '13px',
              lineHeight: 1.45,
              backgroundColor: 'var(--creme-surface)',
              border: '1px solid var(--espresso-20)',
              color: 'var(--espresso-80)',
            }}
          >
            {resume.ecartTotalCentimes === null ? (
              <>
                Écart total non chiffrable : aucune ligne n’a de prix des deux côtés. Rien n’est
                affirmé ici tant que les deux documents ne se répondent pas.
              </>
            ) : (
              <>
                Écart total sur les lignes comparables :{' '}
                <strong
                  style={{
                    color:
                      resume.ecartTotalCentimes > 0 ? DEFAVORABLE : 'var(--espresso)',
                  }}
                >
                  {resume.ecartTotalCentimes > 0 ? '+' : ''}
                  {formatCents(resume.ecartTotalCentimes)}
                </strong>{' '}
                sur la facture. Les lignes sans équivalent en face n’y entrent pas.
              </>
            )}
          </p>

          {affichees.length === 0 ? (
            <p
              className="rounded-2xl px-3 py-3"
              style={{
                fontSize: '13px',
                color: '#2F6B4F',
                backgroundColor: '#2F6B4F14',
                lineHeight: 1.45,
              }}
            >
              Facture et bons concordent sur toutes les lignes comparables.
            </p>
          ) : (
            <ul className="space-y-2">
              {affichees.map((rapprochement, index) => (
                <LigneRapprochement
                  key={`${rapprochement.ligneFacture?.id ?? rapprochement.ligneBon?.id ?? index}`}
                  rapprochement={rapprochement}
                />
              ))}
            </ul>
          )}

          {resume.identiques > 0 && (
            <div className="flex flex-wrap items-center mt-3" style={{ minHeight: '44px' }}>
              <GhostButton onClick={() => setToutAfficher((valeur) => !valeur)}>
                {toutAfficher
                  ? 'Masquer les lignes qui concordent'
                  : `Voir aussi les ${resume.identiques} ligne${
                      resume.identiques > 1 ? 's qui concordent' : ' qui concorde'
                    }`}
              </GhostButton>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Tuile({
  valeur,
  libelle,
  alerte,
}: {
  valeur: number
  libelle: string
  alerte: boolean
}) {
  return (
    <div
      className="rounded-2xl px-3 py-2.5"
      style={{
        backgroundColor: 'var(--creme-surface)',
        border: `1px solid ${alerte ? `${DEFAVORABLE}40` : 'var(--espresso-20)'}`,
      }}
    >
      <p
        className="font-serif"
        style={{ fontSize: '20px', color: alerte ? DEFAVORABLE : 'var(--espresso)' }}
      >
        {valeur}
      </p>
      <p
        className="uppercase tracking-wider"
        style={{ fontSize: '10px', fontWeight: 600, color: 'var(--espresso-60)' }}
      >
        {libelle}
      </p>
    </div>
  )
}

function LigneRapprochement({ rapprochement }: { rapprochement: Rapprochement }) {
  const montant = montantEcart(rapprochement)
  // En faveur du fournisseur : la facture demande plus que ce que le bon dit.
  const defavorable =
    (rapprochement.statut === 'ecart_prix' || rapprochement.statut === 'ecart_quantite') &&
    ((montant !== null && montant > 0) ||
      (montant === null && (rapprochement.ecartCentimesParUniteDeBase ?? 0) > 0))

  const Icone =
    rapprochement.statut === 'identique'
      ? CheckCircle2
      : rapprochement.statut === 'indeterminable'
        ? HelpCircle
        : AlertTriangle

  const couleur = defavorable
    ? DEFAVORABLE
    : rapprochement.statut === 'identique'
      ? '#2F6B4F'
      : 'var(--espresso-80)'

  return (
    <li
      className="rounded-2xl p-3 flex items-start gap-2.5"
      style={{
        backgroundColor: 'var(--creme-surface)',
        border: `1px solid ${defavorable ? `${DEFAVORABLE}40` : 'var(--espresso-20)'}`,
      }}
    >
      <Icone className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.9} style={{ color: couleur }} />
      <p className="min-w-0" style={{ fontSize: '13px', lineHeight: 1.45, color: couleur }}>
        {phraseEcart(rapprochement)}
        {defavorable && montant !== null && montant !== 0 && (
          <span style={{ fontWeight: 600 }}> Soit {formatCents(montant)} de plus sur cette ligne.</span>
        )}
      </p>
    </li>
  )
}

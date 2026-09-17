'use client'

import { useMemo, useState } from 'react'
import {
  type EntreeRapport,
  type LigneRapport,
  type PeriodeRapport,
  construireRapport,
  phraseRapport,
} from '@/lib/interface/supplier-report'
import { GhostButton } from './form-bits'

const PERIODES: { valeur: PeriodeRapport; libelle: string }[] = [
  { valeur: 'derniere', libelle: 'Dernière facture' },
  { valeur: 'mois', libelle: 'Ce mois' },
  { valeur: 'trimestre', libelle: 'Ce trimestre' },
  { valeur: 'annee', libelle: 'Cette année' },
]

const GROUPES: { statut: LigneRapport['statut']; titre: string; couleur: string }[] = [
  { statut: 'hausse', titre: 'Hausses', couleur: '#B4302A' },
  { statut: 'baisse', titre: 'Baisses', couleur: '#2F6B4F' },
  { statut: 'stable', titre: 'Stables', couleur: 'var(--espresso-60)' },
  { statut: 'premier', titre: 'Premiers relevés', couleur: 'var(--espresso-40)' },
]

/** Pastille de filtre. 44 px : l'écran se manipule debout, au pouce. */
function Pastille({
  actif,
  onClick,
  children,
}: {
  actif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className="rounded-full px-4 active:scale-[0.98] transition-transform"
      style={{
        minHeight: '44px',
        border: `1px solid ${actif ? 'var(--terracotta)' : 'var(--espresso-20)'}`,
        backgroundColor: actif ? 'var(--terracotta)' : 'transparent',
        color: actif ? '#ffffff' : 'var(--espresso-80)',
        fontSize: '14px',
        fontWeight: actif ? 600 : 500,
      }}
    >
      {children}
    </button>
  )
}

function Bloc({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-3 sm:p-4"
      style={{ backgroundColor: 'var(--creme-surface)', border: '1px solid var(--espresso-20)' }}
    >
      {children}
    </div>
  )
}

function Titre() {
  return (
    <p
      className="uppercase tracking-wider mb-2"
      style={{ fontSize: '10px', fontWeight: 600, color: 'var(--espresso-60)' }}
    >
      Évolution dans le temps, par fournisseur
    </p>
  )
}

export function SupplierReportView({
  suppliers,
  entries,
}: {
  suppliers: { id: string; name: string }[]
  entries: EntreeRapport[]
}) {
  // Le premier fournisseur est sélectionné d'emblée : les périodes étaient
  // invisibles tant qu'on n'avait pas deviné qu'il fallait cliquer, ce qui
  // cachait précisément la fonction demandée.
  const [supplierId, setSupplierId] = useState<string | null>(suppliers[0]?.id ?? null)
  const [periode, setPeriode] = useState<PeriodeRapport>('derniere')

  // Le rapport ne voit que les relevés du fournisseur choisi : c'est ce
  // filtrage qui garantit qu'une hausse annoncée est bien la sienne.
  const entreesDuFournisseur = useMemo(() => {
    if (!supplierId) return []
    return entries
      .map((entree) => ({
        ...entree,
        observations: entree.observations.filter(
          (observation) => observation.supplierId === supplierId
        ),
      }))
      .filter((entree) => entree.observations.length > 0)
  }, [entries, supplierId])

  const rapport = useMemo(
    () => construireRapport(entreesDuFournisseur, periode, new Date()),
    [entreesDuFournisseur, periode]
  )

  const fournisseur = suppliers.find((supplier) => supplier.id === supplierId) ?? null

  if (suppliers.length === 0 || entries.length === 0) {
    return (
      <Bloc>
        <Titre />
        <p style={{ fontSize: '13px', color: 'var(--espresso-60)', lineHeight: 1.45 }}>
          Aucun prix relevé pour l’instant. Le rapport se remplit tout seul dès qu’une facture
          validée rattache une ligne à un ingrédient.
        </p>
      </Bloc>
    )
  }

  return (
    <Bloc>
      <Titre />

      <div className="flex flex-wrap gap-2">
        {suppliers.map((supplier) => (
          <Pastille
            key={supplier.id}
            actif={supplier.id === supplierId}
            onClick={() => setSupplierId(supplier.id)}
          >
            {supplier.name}
          </Pastille>
        ))}
      </div>

      {fournisseur && (
        <>
          <div className="flex flex-wrap gap-2 mt-3">
            {PERIODES.map((option) => (
              <Pastille
                key={option.valeur}
                actif={option.valeur === periode}
                onClick={() => setPeriode(option.valeur)}
              >
                {option.libelle}
              </Pastille>
            ))}
          </div>

          {rapport.length === 0 ? (
            <p
              className="mt-3"
              style={{ fontSize: '13px', color: 'var(--espresso-60)', lineHeight: 1.45 }}
            >
              {entreesDuFournisseur.length === 0
                ? `Aucun prix relevé chez ${fournisseur.name}.`
                : `Aucune facture de ${fournisseur.name} sur cette période.`}
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {GROUPES.map((groupe) => {
                const lignes = rapport.filter((ligne) => ligne.statut === groupe.statut)
                if (lignes.length === 0) return null

                return (
                  <div key={groupe.statut}>
                    <p
                      className="uppercase tracking-wider mb-1.5"
                      style={{ fontSize: '10px', fontWeight: 600, color: groupe.couleur }}
                    >
                      {groupe.titre} · {lignes.length}
                    </p>
                    <ul className="space-y-1.5">
                      {lignes.map((ligne) => (
                        <li
                          key={ligne.ingredientId}
                          className="pl-3"
                          style={{
                            borderLeft: `2px solid ${groupe.couleur}`,
                            fontSize: '13px',
                            color: 'var(--espresso)',
                            lineHeight: 1.45,
                          }}
                        >
                          {phraseRapport(ligne)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}

          {/* La règle du patron, écrite à l'écran : un fournisseur unique se
              compare à lui-même dans le temps. Le classement entre fournisseurs
              vit ailleurs, et ce rapport ne doit pas en avoir l'air. */}
          <p className="mt-3" style={{ fontSize: '11px', color: 'var(--espresso-40)', lineHeight: 1.4 }}>
            Lecture : chaque ingrédient est comparé à lui-même, d’une facture à l’autre — jamais à
            un autre fournisseur. Un ingrédient qui n’a qu’un seul fournisseur reste donc lisible
            ici.
          </p>

          <div className="mt-4">
            <GhostButton onClick={() => setSupplierId(null)}>Changer de fournisseur</GhostButton>
          </div>
        </>
      )}
    </Bloc>
  )
}

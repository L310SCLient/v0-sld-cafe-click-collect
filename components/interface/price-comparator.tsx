'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, FileText, Minus } from 'lucide-react'
import {
  type PriceObservation,
  compareSuppliers,
  computePriceChange,
  rankSuppliers,
} from '@/lib/interface/prices'
import type { EntreeRapport } from '@/lib/interface/supplier-report'
import { formatCents, referenceUnitLabel } from '@/lib/interface/units'
import type { IngredientCategory, IngredientWithStock } from '@/types'
import { inputStyle } from './form-bits'
import { SupplierReportView } from './supplier-report-view'

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  legume: 'Légumes',
  fruit: 'Fruits',
  viande: 'Viandes',
  poisson: 'Poissons',
  cremerie: 'Crémerie',
  boulangerie: 'Boulangerie',
  epicerie: 'Épicerie',
  boisson: 'Boissons',
  emballage: 'Emballages',
  autre: 'Autre',
}

/** Ramène un prix par unité de base à l'unité lisible (kg, L, pièce). */
function perReferenceUnit(pricePerBaseUnit: number, unit: IngredientWithStock['base_unit']) {
  return pricePerBaseUnit * (unit === 'unit' ? 1 : 1000)
}

export function PriceComparator({
  ingredients,
  observationsByIngredient,
  supplierReport,
}: {
  ingredients: IngredientWithStock[]
  observationsByIngredient: Record<string, PriceObservation[]>
  supplierReport: { suppliers: { id: string; name: string }[]; entries: EntreeRapport[] }
}) {
  const [category, setCategory] = useState<IngredientCategory | 'all'>('all')

  const withPrices = useMemo(
    () =>
      ingredients
        .map((ingredient) => ({
          ingredient,
          observations: observationsByIngredient[ingredient.id] ?? [],
        }))
        .filter((entry) => entry.observations.length > 0),
    [ingredients, observationsByIngredient]
  )

  const visible = useMemo(
    () =>
      category === 'all'
        ? withPrices
        : withPrices.filter((entry) => entry.ingredient.category === category),
    [withPrices, category]
  )

  const ranking = useMemo(
    () =>
      rankSuppliers(
        visible.map((entry) => ({
          ingredientId: entry.ingredient.id,
          observations: entry.observations,
        }))
      ),
    [visible]
  )

  const availableCategories = useMemo(() => {
    const present = new Set<IngredientCategory>()
    for (const entry of withPrices) {
      if (entry.ingredient.category) present.add(entry.ingredient.category)
    }
    return [...present].sort((a, b) => CATEGORY_LABEL[a].localeCompare(CATEGORY_LABEL[b], 'fr'))
  }, [withPrices])

  if (withPrices.length === 0) {
    return (
      <div>
        <h1 className="font-serif mb-1" style={{ fontSize: '24px', color: 'var(--espresso)' }}>
          Comparatif
        </h1>
        <div
          className="rounded-2xl px-5 py-10 text-center mt-4"
          style={{ border: '1px dashed var(--espresso-20)' }}
        >
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--espresso)' }}>
            Aucun prix en base
          </p>
          <p
            className="mt-1.5 mx-auto"
            style={{ fontSize: '13px', color: 'var(--espresso-60)', maxWidth: '400px', lineHeight: 1.45 }}
          >
            Les comparatifs se construisent à partir des factures validées. Importe et valide une
            facture : chaque ligne rattachée à un ingrédient produit un prix daté, et la
            comparaison devient possible dès qu’un même ingrédient vient de deux fournisseurs.
          </p>

          {/* L'écran demandait d'importer une facture sans donner le moyen de
              le faire : le bouton manquait là où naît le besoin. */}
          <Link
            href="/interface/factures"
            className="inline-flex items-center gap-1.5 rounded-full px-5 mt-5 active:scale-[0.98] transition-transform"
            style={{
              minHeight: '48px',
              backgroundColor: 'var(--terracotta)',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            <FileText className="h-4 w-4" strokeWidth={1.9} />
            Importer une facture
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-serif mb-1" style={{ fontSize: '24px', color: 'var(--espresso)' }}>
        Comparatif
      </h1>
      <p className="mb-4" style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
        {withPrices.length} ingrédient{withPrices.length > 1 ? 's' : ''} avec un prix connu
      </p>

      {availableCategories.length > 0 && (
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as IngredientCategory | 'all')}
          aria-label="Filtrer par famille"
          style={{ ...inputStyle, marginBottom: '16px' }}
        >
          <option value="all">Toutes les familles</option>
          {availableCategories.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABEL[value]}
            </option>
          ))}
        </select>
      )}

      {/* Classement des fournisseurs */}
      {ranking.length > 0 ? (
        <div
          className="rounded-2xl p-3 sm:p-4 mb-5"
          style={{ backgroundColor: 'var(--creme-surface)', border: '1px solid var(--espresso-20)' }}
        >
          <p
            className="uppercase tracking-wider mb-2"
            style={{ fontSize: '10px', fontWeight: 600, color: 'var(--espresso-60)' }}
          >
            Le moins cher, par fournisseur
          </p>
          <ul className="space-y-1.5">
            {ranking.map((entry) => (
              <li key={entry.supplierId} className="flex items-center gap-3">
                <span
                  className="flex-1 min-w-0 truncate"
                  style={{ fontSize: '14px', color: 'var(--espresso)' }}
                >
                  {entry.supplierName}
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--espresso-60)',
                  }}
                >
                  {entry.cheapestCount}/{entry.participatedCount}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2" style={{ fontSize: '11px', color: 'var(--espresso-40)', lineHeight: 1.4 }}>
            Lecture : moins cher sur N ingrédients, sur M réellement comparables. Un ingrédient
            qui n’a qu’un seul fournisseur n’entre pas dans le compte — être le seul ne rend pas
            moins cher.
          </p>
        </div>
      ) : (
        <p
          className="rounded-xl px-3 py-2.5 mb-5"
          style={{ fontSize: '12px', color: 'var(--espresso-60)', backgroundColor: 'var(--espresso-08)', lineHeight: 1.45 }}
        >
          Aucun ingrédient n’a encore deux fournisseurs : il n’y a rien à comparer. Les prix
          ci-dessous restent affichés, avec leur évolution.
        </p>
      )}

      {/* Le rapport répond à « qu'est-ce que CE fournisseur m'a augmenté »,
          quand le reste de l'écran répond à « qui est le moins cher ». Il a ses
          propres filtres : la famille choisie ci-dessus ne le concerne pas. */}
      <div className="mb-5">
        <SupplierReportView
          suppliers={supplierReport.suppliers}
          entries={supplierReport.entries}
        />
      </div>

      {/* Détail par ingrédient */}
      <p
        className="uppercase tracking-wider mb-2"
        style={{ fontSize: '10px', fontWeight: 600, color: 'var(--espresso-60)' }}
      >
        Détail par ingrédient
      </p>
      <ul className="space-y-2">
        {visible.map(({ ingredient, observations }) => {
          const comparison = compareSuppliers(observations)
          if (!comparison) return null

          const perSupplier = new Map<string, PriceObservation[]>()
          for (const observation of observations) {
            const list = perSupplier.get(observation.supplierId) ?? []
            list.push(observation)
            perSupplier.set(observation.supplierId, list)
          }
          const change = computePriceChange(
            perSupplier.get(comparison.cheapest.supplierId) ?? []
          )

          return (
            <li
              key={ingredient.id}
              className="rounded-2xl p-3 sm:p-4"
              style={{
                backgroundColor: 'var(--creme-surface)',
                border: '1px solid var(--espresso-20)',
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p
                    className="truncate"
                    style={{ fontSize: '15px', fontWeight: 600, color: 'var(--espresso)' }}
                  >
                    {ingredient.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
                    {ingredient.category ? CATEGORY_LABEL[ingredient.category] : 'non classé'}
                    {` · ${perSupplier.size} fournisseur${perSupplier.size > 1 ? 's' : ''}`}
                  </p>
                </div>
                {change && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 shrink-0"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      color: change.deltaPerBaseUnit > 0 ? '#B4302A' : change.deltaPerBaseUnit < 0 ? '#2F6B4F' : 'var(--espresso-60)',
                      backgroundColor:
                        change.deltaPerBaseUnit > 0
                          ? '#B4302A1A'
                          : change.deltaPerBaseUnit < 0
                            ? '#2F6B4F1A'
                            : 'var(--espresso-08)',
                    }}
                    title={`De ${change.previous.observedOn} à ${change.latest.observedOn}`}
                  >
                    {change.deltaPerBaseUnit > 0 ? (
                      <ArrowUp className="h-3 w-3" strokeWidth={2.4} />
                    ) : change.deltaPerBaseUnit < 0 ? (
                      <ArrowDown className="h-3 w-3" strokeWidth={2.4} />
                    ) : (
                      <Minus className="h-3 w-3" strokeWidth={2.4} />
                    )}
                    {Math.abs(Math.round(change.ratio * 100))} %
                  </span>
                )}
              </div>

              <ul className="mt-2.5 space-y-1">
                {[comparison.cheapest, ...comparison.others].map((observation, index) => (
                  <li key={observation.supplierId} className="flex items-center gap-3">
                    <span
                      className="flex-1 min-w-0 truncate"
                      style={{
                        fontSize: '13px',
                        color: index === 0 ? 'var(--espresso)' : 'var(--espresso-60)',
                        fontWeight: index === 0 ? 600 : 400,
                      }}
                    >
                      {observation.supplierName}
                      {index === 0 && comparison.others.length > 0 && (
                        <span style={{ color: '#2F6B4F', fontWeight: 600 }}> · le moins cher</span>
                      )}
                    </span>
                    <span
                      className="shrink-0"
                      style={{ fontSize: '11px', color: 'var(--espresso-40)', fontFamily: 'var(--font-mono)' }}
                    >
                      {observation.observedOn}
                    </span>
                    <span
                      className="shrink-0 text-right"
                      style={{
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono)',
                        minWidth: '92px',
                        color: index === 0 ? 'var(--espresso)' : 'var(--espresso-60)',
                      }}
                    >
                      {formatCents(perReferenceUnit(observation.pricePerBaseUnit, ingredient.base_unit))}
                      /{referenceUnitLabel(ingredient.base_unit)}
                    </span>
                  </li>
                ))}
              </ul>

              {comparison.savingsPerBaseUnit !== null && comparison.spreadRatio !== null && (
                <p
                  className="mt-2"
                  style={{ fontSize: '12px', color: '#2F6B4F', fontFamily: 'var(--font-mono)' }}
                >
                  économie {formatCents(perReferenceUnit(comparison.savingsPerBaseUnit, ingredient.base_unit))}
                  /{referenceUnitLabel(ingredient.base_unit)} ({Math.round(comparison.spreadRatio * 100)} %)
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

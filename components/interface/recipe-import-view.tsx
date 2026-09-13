'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, FileWarning, Trash2 } from 'lucide-react'
import {
  deleteRecipeImport,
  ignoreStagedRecipe,
  updateImportIngredient,
  updateStagedRecipe,
  validateAllStagedRecipes,
  validateImportIngredients,
  validateStagedRecipe,
} from '@/app/actions/recipe-imports'
import { baseUnitLabel, formatQuantity, UNIT_OPTIONS } from '@/lib/interface/units'
import type { IngredientWithStock, RecipeImportDetail, RecipeImportIngredient } from '@/types'
import { GhostButton, inputStyle } from './form-bits'

/**
 * Validation d'un lot d'import, en deux temps.
 *
 * Écran 1 : la liste dédoublonnée des ingrédients de tout le lot, validée une
 * seule fois. Écran 2 : les recettes proposées, fiche par fiche. Rien n'entre
 * dans `recipes` avant le clic de validation.
 */
export function RecipeImportView({
  detail,
  ingredients,
}: {
  detail: RecipeImportDetail
  ingredients: IngredientWithStock[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const etapeIngredients = detail.status === 'ingredients_a_valider'
  const enEchec = detail.status === 'echec'
  const fichiersEnEchec = detail.files.filter((file) => file.status === 'echec')
  const restantes = detail.recipes.filter((recipe) => recipe.status === 'a_valider')

  function run(action: () => Promise<{ error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await action()
      if (result.error) toast.error(result.error)
      else {
        toast.success(result.message ?? 'Fait.')
        router.refresh()
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/interface/recettes')}
        className="flex items-center gap-1.5 mb-4"
        style={{ fontSize: '13px', color: 'var(--espresso-60)' }}
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
        Recettes
      </button>

      <h1 className="font-serif" style={{ fontSize: '24px', color: 'var(--espresso)' }}>
        Import de fiches
      </h1>
      <p className="mt-1 mb-5" style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
        {detail.files.length} fichier{detail.files.length > 1 ? 's' : ''} ·{' '}
        {detail.recipes.length} fiche{detail.recipes.length > 1 ? 's' : ''} lue
        {detail.recipes.length > 1 ? 's' : ''} · {detail.ingredients.length} ingrédient
        {detail.ingredients.length > 1 ? 's' : ''} repéré{detail.ingredients.length > 1 ? 's' : ''}
      </p>

      {fichiersEnEchec.length > 0 && (
        <div
          className="rounded-xl p-3 mb-5"
          style={{ backgroundColor: 'rgba(180,48,42,0.08)', border: '1px solid rgba(180,48,42,0.25)' }}
        >
          <p className="flex items-center gap-1.5" style={{ fontSize: '13px', color: '#B4302A' }}>
            <FileWarning className="h-4 w-4" strokeWidth={1.8} />
            {fichiersEnEchec.length} fichier{fichiersEnEchec.length > 1 ? 's' : ''} illisible
            {fichiersEnEchec.length > 1 ? 's' : ''}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {fichiersEnEchec.map((file) => (
              <li key={file.id} style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
                {file.original_name} — {file.parse_error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {enEchec ? (
        <p style={{ fontSize: '13px', color: '#B4302A' }}>
          Aucun fichier de ce lot n’a pu être lu. {detail.parse_error}
        </p>
      ) : etapeIngredients ? (
        <IngredientStep
          entries={detail.ingredients}
          ingredients={ingredients}
          isPending={isPending}
          onUpdate={(id, input) => run(() => updateImportIngredient(id, input))}
          onValidate={() => run(() => validateImportIngredients(detail.id))}
        />
      ) : (
        <RecipeStep
          detail={detail}
          isPending={isPending}
          restantes={restantes.length}
          onUpdate={(id, input) => run(() => updateStagedRecipe(id, input))}
          onValidateOne={(id) => run(() => validateStagedRecipe(id))}
          onIgnore={(id) => run(() => ignoreStagedRecipe(id))}
          onValidateAll={() => run(() => validateAllStagedRecipes(detail.id))}
        />
      )}

      <div className="mt-8 pt-4" style={{ borderTop: '1px solid var(--espresso-20)' }}>
        <GhostButton
          onClick={() =>
            run(async () => {
              const result = await deleteRecipeImport(detail.id)
              if (!result.error) router.push('/interface/recettes')
              return result
            })
          }
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
          Supprimer ce lot
        </GhostButton>
      </div>
    </div>
  )
}

// ─── Écran 1 ────────────────────────────────────────────────────────────────

function IngredientStep({
  entries,
  ingredients,
  isPending,
  onUpdate,
  onValidate,
}: {
  entries: RecipeImportIngredient[]
  ingredients: IngredientWithStock[]
  isPending: boolean
  onUpdate: (id: string, input: Record<string, unknown>) => void
  onValidate: () => void
}) {
  const aCreer = entries.filter((entry) => entry.decision === 'creer').length
  const sansUnite = entries.filter((entry) => entry.decision === 'creer' && !entry.base_unit)

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--espresso)' }}>
        1. Les ingrédients du lot
      </h2>
      <p className="mt-1 mb-4" style={{ fontSize: '12px', color: 'var(--espresso-60)', lineHeight: 1.45 }}>
        Cette liste est dédoublonnée sur l’ensemble de tes fichiers. Tu la valides une seule fois :
        {' '}{aCreer} ingrédient{aCreer > 1 ? 's seront créés' : ' sera créé'}, sans prix — un prix ne
        vient que d’une facture validée.
      </p>

      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl p-3"
            style={{ backgroundColor: 'var(--creme-surface)', border: '1px solid var(--espresso-20)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--espresso)' }}>
                  {entry.raw_name}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--espresso-60)' }}>
                  {entry.occurrences} fiche{entry.occurrences > 1 ? 's' : ''}
                  {entry.decision === 'rattacher' && ' · rattaché à un ingrédient existant'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={entry.base_unit ?? ''}
                  disabled={isPending || entry.decision !== 'creer'}
                  onChange={(event) =>
                    onUpdate(entry.id, {
                      raw_name: entry.raw_name,
                      base_unit: event.target.value === '' ? null : event.target.value,
                      ingredient_id: entry.ingredient_id,
                      decision: entry.decision,
                    })
                  }
                  style={{ ...inputStyle, width: '100%', maxWidth: '120px', minHeight: '44px' }}
                >
                  <option value="">Unité…</option>
                  {UNIT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.short}
                    </option>
                  ))}
                </select>

                <select
                  value={entry.decision === 'rattacher' ? (entry.ingredient_id ?? '') : entry.decision}
                  disabled={isPending}
                  onChange={(event) => {
                    const value = event.target.value
                    onUpdate(entry.id, {
                      raw_name: entry.raw_name,
                      base_unit: entry.base_unit,
                      ingredient_id: value === 'creer' || value === 'ignorer' ? null : value,
                      decision: value === 'creer' || value === 'ignorer' ? value : 'rattacher',
                    })
                  }}
                  style={{ ...inputStyle, width: '100%', maxWidth: '220px', minHeight: '44px' }}
                >
                  <option value="creer">Créer cet ingrédient</option>
                  <option value="ignorer">Ignorer</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      Rattacher à {ingredient.name} ({baseUnitLabel(ingredient.base_unit)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {sansUnite.length > 0 && (
        <p className="mt-3" style={{ fontSize: '12px', color: '#B4302A' }}>
          {sansUnite.length} ingrédient{sansUnite.length > 1 ? 's' : ''} sans unité : choisis-la
          avant de valider.
        </p>
      )}

      <button
        type="button"
        onClick={onValidate}
        disabled={isPending || sansUnite.length > 0}
        className="mt-4 flex items-center gap-1.5 rounded-full px-5 disabled:opacity-50"
        style={{
          minHeight: '44px',
          backgroundColor: 'var(--terracotta)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        <CheckCircle2 className="h-4 w-4" strokeWidth={1.9} />
        Valider les ingrédients
      </button>
    </div>
  )
}

// ─── Écran 2 ────────────────────────────────────────────────────────────────

function RecipeStep({
  detail,
  isPending,
  restantes,
  onUpdate,
  onValidateOne,
  onIgnore,
  onValidateAll,
}: {
  detail: RecipeImportDetail
  isPending: boolean
  restantes: number
  onUpdate: (id: string, input: Record<string, unknown>) => void
  onValidateOne: (id: string) => void
  onIgnore: (id: string) => void
  onValidateAll: () => void
}) {
  const [portionsDraft, setPortionsDraft] = useState<Record<string, string>>({})

  const doublons = useMemo(() => {
    const counts = new Map<string, number>()
    for (const recipe of detail.recipes) {
      const key = recipe.raw_name.trim().toLowerCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([key]) => key))
  }, [detail.recipes])

  return (
    <div>
      <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--espresso)' }}>
        2. Les recettes
      </h2>
      <p className="mt-1 mb-4" style={{ fontSize: '12px', color: 'var(--espresso-60)', lineHeight: 1.45 }}>
        Une fiche rattachée remplit la recette existante ; sans rattachement, elle en crée une.
        Les lignes sans quantité chiffrable sont gardées à part : la recette sera marquée
        incomplète et son coût ne s’affichera pas.
      </p>

      <ul className="space-y-2">
        {detail.recipes.map((staged) => {
          const chiffrables = staged.lines.filter(
            (line) => line.quantity !== null && line.base_unit !== null && line.ingredient_id
          )
          const deCote = staged.lines.filter(
            (line) => line.ingredient_id && (line.quantity === null || line.base_unit === null)
          )
          const dejaTraitee = staged.status !== 'a_valider'

          return (
            <li
              key={staged.id}
              className="rounded-xl p-3"
              style={{
                backgroundColor: 'var(--creme-surface)',
                border: '1px solid var(--espresso-20)',
                opacity: dejaTraitee ? 0.55 : 1,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--espresso)' }}>
                    {staged.raw_name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--espresso-60)' }}>
                    {staged.matched_recipe
                      ? `remplit « ${staged.matched_recipe.name} »`
                      : 'nouvelle recette'}
                    {' · '}
                    {chiffrables.length} ligne{chiffrables.length > 1 ? 's' : ''}
                    {deCote.length > 0 && ` · ${deCote.length} sans quantité`}
                    {staged.status === 'validee' && ' · écrite'}
                    {staged.status === 'ignoree' && ' · ignorée'}
                  </p>
                  {!staged.portions_read && (
                    <p style={{ fontSize: '11px', color: '#B4302A' }}>
                      rendement absent de la fiche : précise-le, sinon la recette sera marquée
                      « à préciser »
                    </p>
                  )}
                  {doublons.has(staged.raw_name.trim().toLowerCase()) && (
                    <p style={{ fontSize: '11px', color: '#B4302A' }}>
                      deux fiches portent ce nom : la base n’en acceptera qu’une
                    </p>
                  )}
                </div>

                {!dejaTraitee && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      inputMode="numeric"
                      placeholder="portions"
                      value={portionsDraft[staged.id] ?? (staged.portions?.toString() ?? '')}
                      onChange={(event) =>
                        setPortionsDraft((draft) => ({ ...draft, [staged.id]: event.target.value }))
                      }
                      onBlur={(event) => {
                        const value = event.target.value.trim()
                        const portions = value === '' ? null : Number(value)
                        if (portions !== null && (!Number.isInteger(portions) || portions <= 0)) return
                        onUpdate(staged.id, {
                          raw_name: staged.raw_name,
                          portions,
                          matched_recipe_id: staged.matched_recipe_id,
                        })
                      }}
                      disabled={isPending}
                      style={{ ...inputStyle, width: '100%', maxWidth: '110px', minHeight: '44px' }}
                    />
                    <GhostButton onClick={() => onIgnore(staged.id)} disabled={isPending}>
                      Ignorer
                    </GhostButton>
                    <button
                      type="button"
                      onClick={() => onValidateOne(staged.id)}
                      disabled={isPending}
                      className="rounded-full px-4 disabled:opacity-50"
                      style={{
                        minHeight: '44px',
                        backgroundColor: 'var(--terracotta)',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      Écrire
                    </button>
                  </div>
                )}
              </div>

              {staged.lines.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {staged.lines.map((line) => (
                    <li key={line.id} style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
                      {line.raw_label} —{' '}
                      {line.quantity !== null && line.base_unit
                        ? formatQuantity(line.quantity, line.base_unit)
                        : (line.raw_quantity ?? 'quantité non lue')}
                      {!line.ingredient_id && ' · ingrédient ignoré'}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {restantes > 0 && (
        <button
          type="button"
          onClick={onValidateAll}
          disabled={isPending}
          className="mt-4 flex items-center gap-1.5 rounded-full px-5 disabled:opacity-50"
          style={{
            minHeight: '44px',
            backgroundColor: 'var(--terracotta)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={1.9} />
          Écrire les {restantes} recette{restantes > 1 ? 's' : ''} restantes
        </button>
      )}
    </div>
  )
}

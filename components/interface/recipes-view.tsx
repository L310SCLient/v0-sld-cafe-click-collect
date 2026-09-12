'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deactivateRecipe } from '@/app/actions/recipes'
import { computeMargin, computeRecipeCost } from '@/lib/interface/cost'
import { costIsDisplayable } from '@/lib/interface/recipe-import'
import { formatCents } from '@/lib/interface/units'
import type { IngredientWithStock, Product, RecipeWithItems } from '@/types'
import { GhostButton, inputStyle } from './form-bits'
import { RecipeDialog } from './recipe-dialog'
import { RecipeEditor } from './recipe-editor'
import { RecipeImportButton } from './recipe-import-button'

export function RecipesView({
  recipes,
  ingredients,
  products,
  importAvailable,
}: {
  recipes: RecipeWithItems[]
  ingredients: IngredientWithStock[]
  products: Pick<Product, 'id' | 'name' | 'price'>[]
  /** `false` = migration 006 non appliquée : l'import est hors service. */
  importAvailable: boolean
}) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState<RecipeWithItems | null>(null)
  const [removing, setRemoving] = useState<RecipeWithItems | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query === '') return recipes
    return recipes.filter((recipe) => recipe.name.toLowerCase().includes(query))
  }, [recipes, search])

  function confirmRemoval() {
    if (!removing) return
    const target = removing
    startTransition(async () => {
      const result = await deactivateRecipe(target.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message ?? 'Retirée.')
      }
      setRemoving(null)
    })
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="font-serif" style={{ fontSize: '24px', color: 'var(--espresso)' }}>
          Recettes
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <RecipeImportButton />
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 rounded-full px-4 active:scale-[0.98] transition-transform"
            style={{
              minHeight: '42px',
              backgroundColor: 'var(--terracotta)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            Ajouter
          </button>
        </div>
      </div>

      <p className="mb-4" style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
        {recipes.length} recette{recipes.length > 1 ? 's' : ''}
      </p>

      {!importAvailable && (
        <div
          className="rounded-xl p-3 mb-4"
          style={{
            backgroundColor: 'rgba(180,48,42,0.08)',
            border: '1px solid rgba(180,48,42,0.25)',
          }}
        >
          <p style={{ fontSize: '12px', color: '#B4302A', lineHeight: 1.45 }}>
            Import de fiches hors service : la migration 006 n’est pas appliquée dans Supabase.
            Les recettes ci-dessous restent justes, mais aucune ligne laissée de côté ne peut être
            affichée.
          </p>
        </div>
      )}

      <div className="relative mb-4">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: 'var(--espresso-40)' }}
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une recette"
          aria-label="Rechercher une recette"
          style={{ ...inputStyle, paddingLeft: '42px' }}
        />
      </div>

      {recipes.length === 0 ? (
        <div
          className="rounded-2xl px-5 py-10 text-center"
          style={{ border: '1px dashed var(--espresso-20)' }}
        >
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--espresso)' }}>
            Aucune recette
          </p>
          <p
            className="mt-1.5 mx-auto"
            style={{
              fontSize: '13px',
              color: 'var(--espresso-60)',
              maxWidth: '360px',
              lineHeight: 1.45,
            }}
          >
Importe tes fiches : le bouton « Importer des fiches » lit tes fichiers, te fait
            valider les ingrédients puis les recettes, et n’écrit rien avant.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((recipe) => {
            const cost = computeRecipeCost(recipe.items, recipe.portions)
            const margin =
              cost.status === 'complete'
                ? computeMargin(recipe.product?.price ?? null, cost.perPortionCents)
                : null
            const isOpen = expanded === recipe.id

            return (
              <li
                key={recipe.id}
                className="rounded-2xl p-3 sm:p-4"
                style={{
                  backgroundColor: 'var(--creme-surface)',
                  border: '1px solid var(--espresso-20)',
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p
                      className="truncate"
                      style={{ fontSize: '15px', fontWeight: 600, color: 'var(--espresso)' }}
                    >
                      {recipe.name}
                    </p>
                    <p className="mt-0.5" style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
                      {recipe.product ? recipe.product.name : 'Préparation interne'}
                      {' · '}
                      {recipe.items.length} ingrédient{recipe.items.length > 1 ? 's' : ''}
                      {recipe.portions > 1 && ` · ${recipe.portions} portions`}
                      {!recipe.portions_confirmed && (
                        <span style={{ color: '#B4302A' }}> · rendement à préciser</span>
                      )}
                      {recipe.missing.length > 0 && (
                        <span style={{ color: '#B4302A' }}>
                          {' · '}
                          {recipe.missing.length} ligne{recipe.missing.length > 1 ? 's' : ''} sans
                          quantité
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {cost.status === 'complete' &&
                    costIsDisplayable({
                      missingItems: recipe.missing.length,
                      portionsConfirmed: recipe.portions_confirmed,
                    }) ? (
                      <>
                        <p
                          style={{
                            fontSize: '14px',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--espresso)',
                          }}
                        >
                          {formatCents(cost.perPortionCents)}
                          <span style={{ color: 'var(--espresso-40)' }}> /portion</span>
                        </p>
                        {margin && (
                          <p
                            className="mt-0.5"
                            style={{
                              fontSize: '12px',
                              fontFamily: 'var(--font-mono)',
                              color: margin.amountCents >= 0 ? '#2F6B4F' : '#B4302A',
                            }}
                          >
                            marge {formatCents(margin.amountCents)} (
                            {Math.round(margin.ratio * 100)} %)
                          </p>
                        )}
                      </>
                    ) : cost.status === 'incomplete' ? (
                      <p style={{ fontSize: '12px', color: '#B4302A', lineHeight: 1.35 }}>
                        coût incomplet
                        <br />
                        {cost.missing.length} prix manquant
                        {cost.missing.length > 1 ? 's' : ''}
                      </p>
                    ) : (
                      <p style={{ fontSize: '12px', color: 'var(--espresso-40)' }}>
                        aucun ingrédient
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <GhostButton onClick={() => setExpanded(isOpen ? null : recipe.id)}>
                    <ChevronDown
                      className="h-3.5 w-3.5 transition-transform"
                      strokeWidth={1.8}
                      style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}
                    />
                    {isOpen ? 'Fermer' : 'Ingrédients'}
                  </GhostButton>
                  <GhostButton onClick={() => setEditing(recipe)} label="Modifier la recette">
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </GhostButton>
                  <GhostButton onClick={() => setRemoving(recipe)} label="Retirer la recette" danger>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </GhostButton>
                </div>

                {isOpen && <RecipeEditor recipe={recipe} ingredients={ingredients} />}
              </li>
            )
          })}
        </ul>
      )}

      {isCreating && (
        <RecipeDialog
          open
          onOpenChange={(open) => !open && setIsCreating(false)}
          recipe={null}
          products={products}
        />
      )}

      {editing && (
        <RecipeDialog
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          recipe={editing}
          products={products}
        />
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent style={{ backgroundColor: 'var(--creme-bg)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              Retirer {removing?.name} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La recette disparaît de la liste. Ses lignes restent en base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                confirmRemoval()
              }}
              disabled={isPending}
              style={{ backgroundColor: '#B4302A', color: '#ffffff' }}
            >
              {isPending ? 'Retrait…' : 'Retirer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ChevronDown, LayoutGrid, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { formatCents } from '@/lib/interface/units'
import type { IngredientWithStock, Product, RecipeWithItems } from '@/types'
import { GhostButton, inputStyle } from './form-bits'
import { RecipeDialog } from './recipe-dialog'
import { RecipeEditor } from './recipe-editor'
import { RecipesFromCatalogue } from './recipes-from-catalogue'

export function RecipesView({
  recipes,
  ingredients,
  products,
  productsWithoutRecipe,
}: {
  recipes: RecipeWithItems[]
  ingredients: IngredientWithStock[]
  products: Pick<Product, 'id' | 'name' | 'price'>[]
  /** Produits du site qui n'ont encore aucune recette. */
  productsWithoutRecipe: Pick<Product, 'id' | 'name' | 'price'>[]
}) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
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
          <button
            type="button"
            onClick={() => setIsImporting(true)}
            className="flex items-center gap-1.5 rounded-full px-4 active:scale-[0.98] transition-transform"
            style={{
              minHeight: '42px',
              border: '1px solid var(--espresso-20)',
              color: 'var(--espresso)',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <LayoutGrid className="h-4 w-4" strokeWidth={1.9} />
            Catalogue
            {productsWithoutRecipe.length > 0 && (
              <span
                className="rounded-full px-1.5"
                style={{
                  backgroundColor: 'var(--terracotta)',
                  color: '#ffffff',
                  fontSize: '11px',
                }}
              >
                {productsWithoutRecipe.length}
              </span>
            )}
          </button>
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
        {productsWithoutRecipe.length > 0 &&
          ` · ${productsWithoutRecipe.length} produit${productsWithoutRecipe.length > 1 ? 's' : ''} du site sans recette`}
      </p>

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
            Pars du catalogue : le bouton « Catalogue » crée les recettes des produits en vente
            sur le site, déjà rattachées. Tu n’ajoutes ensuite que leurs ingrédients.
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
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {cost.status === 'complete' ? (
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

      {isImporting && (
        <RecipesFromCatalogue
          open
          onOpenChange={(open) => !open && setIsImporting(false)}
          products={productsWithoutRecipe}
        />
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

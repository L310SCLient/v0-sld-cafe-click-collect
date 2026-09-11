'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, ArrowLeftRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { deactivateIngredient } from '@/app/actions/ingredients'
import { referencePriceCents } from '@/lib/interface/cost'
import { formatCents, formatQuantity, referenceUnitLabel } from '@/lib/interface/units'
import { needsRestocking, stockLevel } from '@/lib/interface/stock-alert'
import type { IngredientWithStock } from '@/types'
import { GhostButton, PriceBadge, inputStyle } from './form-bits'
import { IngredientDialog } from './ingredient-dialog'
import { StockMovementDialog } from './stock-movement-dialog'

export function IngredientsView({ ingredients }: { ingredients: IngredientWithStock[] }) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<IngredientWithStock | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [moving, setMoving] = useState<IngredientWithStock | null>(null)
  const [removing, setRemoving] = useState<IngredientWithStock | null>(null)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query === '') return ingredients
    return ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(query))
  }, [ingredients, search])

  const withoutPrice = ingredients.filter((ingredient) => ingredient.price_source === null).length
  const toRestock = useMemo(() => needsRestocking(ingredients), [ingredients])

  function confirmRemoval() {
    if (!removing) return
    const target = removing
    startTransition(async () => {
      const result = await deactivateIngredient(target.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message ?? 'Retiré.')
      }
      setRemoving(null)
    })
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="font-serif" style={{ fontSize: '24px', color: 'var(--espresso)' }}>
          Ingrédients
        </h1>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 rounded-full px-4 shrink-0 active:scale-[0.98] transition-transform"
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

      <p className="mb-4" style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
        {ingredients.length} ingrédient{ingredients.length > 1 ? 's' : ''}
        {withoutPrice > 0 && ` · ${withoutPrice} sans prix`}
      </p>

      {toRestock.length > 0 && (
        <div
          className="rounded-2xl px-3 py-3 mb-4"
          style={{ backgroundColor: '#B4302A14', border: '1px solid #B4302A40' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={2} style={{ color: '#B4302A' }} />
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#B4302A' }}>
              {toRestock.length} ingrédient{toRestock.length > 1 ? 's' : ''} à réapprovisionner
            </p>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {toRestock.map((ingredient) => (
              <li
                key={ingredient.id}
                style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#B4302A' }}
              >
                {ingredient.name} · {formatQuantity(ingredient.stock, ingredient.base_unit)}
                {stockLevel(ingredient) === 'rupture' ? ' (rupture)' : ''}
              </li>
            ))}
          </ul>
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
          placeholder="Rechercher un ingrédient"
          aria-label="Rechercher un ingrédient"
          style={{ ...inputStyle, paddingLeft: '42px' }}
        />
      </div>

      {ingredients.length === 0 ? (
        <EmptyState
          title="Aucun ingrédient"
          body="Ajoute tes ingrédients avec leur unité de stock. Le prix peut rester vide : il viendra des factures."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="Aucun résultat" body={`Rien ne correspond à « ${search.trim()} ».`} />
      ) : (
        <ul className="space-y-2">
          {filtered.map((ingredient) => {
            const price = referencePriceCents(ingredient)
            const level = stockLevel(ingredient)
            return (
              <li
                key={ingredient.id}
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
                      {ingredient.name}
                    </p>
                    <p
                      className="mt-0.5"
                      style={{
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono)',
                        color: level === 'ok' ? 'var(--espresso-60)' : '#B4302A',
                        fontWeight: level === 'ok' ? 400 : 600,
                      }}
                    >
                      stock {formatQuantity(ingredient.stock, ingredient.base_unit)}
                      {level === 'rupture' && ' · rupture'}
                      {level === 'bas' &&
                        ingredient.low_stock_threshold !== null &&
                        ` · sous le seuil de ${formatQuantity(ingredient.low_stock_threshold, ingredient.base_unit)}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      style={{
                        fontSize: '14px',
                        fontFamily: 'var(--font-mono)',
                        color: price === null ? 'var(--espresso-40)' : 'var(--espresso)',
                      }}
                    >
                      {price === null
                        ? `— /${referenceUnitLabel(ingredient.base_unit)}`
                        : `${formatCents(price)}/${referenceUnitLabel(ingredient.base_unit)}`}
                    </p>
                    <div className="mt-1">
                      <PriceBadge source={ingredient.price_source} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <GhostButton onClick={() => setMoving(ingredient)}>
                    <ArrowLeftRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Mouvement
                  </GhostButton>
                  <GhostButton onClick={() => setEditing(ingredient)} label="Modifier">
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </GhostButton>
                  <GhostButton
                    onClick={() => setRemoving(ingredient)}
                    label="Retirer de la liste"
                    danger
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </GhostButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {isCreating && (
        <IngredientDialog
          open
          onOpenChange={(open) => !open && setIsCreating(false)}
          ingredient={null}
        />
      )}

      {editing && (
        <IngredientDialog
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          ingredient={editing}
        />
      )}

      {moving && (
        <StockMovementDialog
          key={moving.id}
          open
          onOpenChange={(open) => !open && setMoving(null)}
          ingredient={moving}
        />
      )}

      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent style={{ backgroundColor: 'var(--creme-bg)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              Retirer {removing?.name} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              L’ingrédient disparaît de la liste. Son historique de mouvements est conservé en
              base, et l’opération est refusée s’il est encore utilisé dans une recette.
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

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-2xl px-5 py-10 text-center"
      style={{ border: '1px dashed var(--espresso-20)' }}
    >
      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--espresso)' }}>{title}</p>
      <p
        className="mt-1.5 mx-auto"
        style={{ fontSize: '13px', color: 'var(--espresso-60)', maxWidth: '340px', lineHeight: 1.45 }}
      >
        {body}
      </p>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { removeRecipeItem, upsertRecipeItem } from '@/app/actions/recipes'
import { computeRecipeCost } from '@/lib/interface/cost'
import {
  baseUnitLabel,
  formatCentsPrecise,
  formatQuantity,
  parseQuantity,
} from '@/lib/interface/units'
import type { IngredientWithStock, RecipeWithItems } from '@/types'
import { FieldLabel, inputStyle } from './form-bits'

/**
 * Lignes d'une recette : ingrédient + quantité + coût de la ligne.
 *
 * Une ligne dont l'ingrédient n'a pas de prix affiche « — », jamais 0 €.
 */
export function RecipeEditor({
  recipe,
  ingredients,
}: {
  recipe: RecipeWithItems
  ingredients: IngredientWithStock[]
}) {
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const cost = computeRecipeCost(recipe.items, recipe.portions)
  const selected = ingredients.find((item) => item.id === ingredientId) ?? null
  const alreadyIn = new Set(recipe.items.map((item) => item.ingredient_id))

  function addLine(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (ingredientId === '') {
      setError('Choisis un ingrédient.')
      return
    }
    const parsed = parseQuantity(quantity)
    if (parsed === null || parsed <= 0) {
      setError('La quantité doit être supérieure à zéro.')
      return
    }

    startTransition(async () => {
      const result = await upsertRecipeItem({
        recipe_id: recipe.id,
        ingredient_id: ingredientId,
        quantity: parsed,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success(result.message ?? 'Enregistré.')
      setIngredientId('')
      setQuantity('')
    })
  }

  function removeLine(itemId: string) {
    startTransition(async () => {
      const result = await removeRecipeItem(itemId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Retiré.')
    })
  }

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--espresso-20)' }}>
      {recipe.items.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--espresso-60)' }}>
          Aucun ingrédient dans cette recette.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {cost.lines.map((line) => {
            // Appariement par identifiant plutôt que par index : le tri des
            // lignes de coût ne peut pas désaligner le bouton de suppression.
            const item = recipe.items.find((entry) => entry.ingredient_id === line.ingredientId)
            if (!item) return null
            return (
              <li key={item.id} className="flex items-center gap-3">
                <span
                  className="flex-1 min-w-0 truncate"
                  style={{ fontSize: '14px', color: 'var(--espresso)' }}
                >
                  {line.name}
                </span>
                <span
                  className="shrink-0"
                  style={{
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--espresso-60)',
                  }}
                >
                  {formatQuantity(line.quantity, line.unit)}
                </span>
                <span
                  className="shrink-0 text-right"
                  style={{
                    fontSize: '13px',
                    fontFamily: 'var(--font-mono)',
                    minWidth: '68px',
                    color: line.lineCents === null ? '#B4302A' : 'var(--espresso)',
                  }}
                >
                  {line.lineCents === null ? '—' : formatCentsPrecise(line.lineCents)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(item.id)}
                  disabled={isPending}
                  aria-label={`Retirer ${line.name}`}
                  className="shrink-0 flex items-center justify-center rounded-full active:opacity-60 disabled:opacity-30"
                  style={{ width: '44px', height: '44px', color: 'var(--espresso-40)' }}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {cost.status === 'incomplete' && (
        <p
          className="mt-3 rounded-xl px-3 py-2"
          style={{
            fontSize: '12px',
            color: '#B4302A',
            backgroundColor: '#B4302A14',
            lineHeight: 1.4,
          }}
        >
          Coût impossible à calculer : {cost.missing.map((item) => item.name).join(', ')} sans prix.
        </p>
      )}

      <form onSubmit={addLine} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <FieldLabel htmlFor={`add-ingredient-${recipe.id}`}>Ingrédient</FieldLabel>
          <select
            id={`add-ingredient-${recipe.id}`}
            value={ingredientId}
            onChange={(event) => setIngredientId(event.target.value)}
            style={{ ...inputStyle, fontSize: '14px', minHeight: '42px' }}
          >
            <option value="">Choisir…</option>
            {ingredients.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
                {alreadyIn.has(ingredient.id) ? ' (déjà dans la recette)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: '120px' }}>
          <FieldLabel htmlFor={`add-quantity-${recipe.id}`}>
            Quantité{selected ? ` (${baseUnitLabel(selected.base_unit)})` : ''}
          </FieldLabel>
          <input
            id={`add-quantity-${recipe.id}`}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            style={{ ...inputStyle, fontSize: '14px', minHeight: '42px' }}
            inputMode="decimal"
            placeholder="80"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-full px-4 active:scale-[0.98] transition-transform disabled:opacity-40"
          style={{
            minHeight: '42px',
            border: '1px solid var(--espresso-20)',
            color: 'var(--espresso)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          {alreadyIn.has(ingredientId) ? 'Mettre à jour' : 'Ajouter'}
        </button>
      </form>

      {error && (
        <p className="mt-2" style={{ fontSize: '13px', color: '#B4302A' }}>
          {error}
        </p>
      )}
    </div>
  )
}

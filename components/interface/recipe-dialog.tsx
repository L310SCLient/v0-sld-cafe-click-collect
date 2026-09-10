'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createRecipe, updateRecipe } from '@/app/actions/recipes'
import { formatCents } from '@/lib/interface/units'
import type { Product, RecipeWithItems } from '@/types'
import { FieldLabel, PrimaryButton, inputStyle } from './form-bits'

/** Création et modification de l'en-tête d'une recette (pas de ses lignes). */
export function RecipeDialog({
  open,
  onOpenChange,
  recipe,
  products,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` = création. */
  recipe: RecipeWithItems | null
  products: Pick<Product, 'id' | 'name' | 'price'>[]
}) {
  const isEdit = recipe !== null

  const [name, setName] = useState(recipe?.name ?? '')
  const [productId, setProductId] = useState(recipe?.product_id ?? '')
  const [portions, setPortions] = useState(String(recipe?.portions ?? 1))
  const [notes, setNotes] = useState(recipe?.notes ?? '')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    const parsedPortions = Number(portions)
    if (!Number.isInteger(parsedPortions) || parsedPortions < 1) {
      setError('Le nombre de portions est un entier supérieur ou égal à 1.')
      return
    }

    const payload = {
      name: name.trim(),
      product_id: productId === '' ? null : productId,
      portions: parsedPortions,
      notes: notes.trim() === '' ? null : notes.trim(),
    }

    startTransition(async () => {
      const result = isEdit ? await updateRecipe(recipe.id, payload) : await createRecipe(payload)
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success(result.message ?? 'Enregistré.')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[440px]"
        style={{ backgroundColor: 'var(--creme-bg)', borderColor: 'var(--espresso-20)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-serif" style={{ color: 'var(--espresso)' }}>
            {isEdit ? recipe.name : 'Nouvelle recette'}
          </DialogTitle>
          <DialogDescription style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
            Les ingrédients s’ajoutent ensuite, dans la fiche de la recette.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <FieldLabel htmlFor="recipe-name">Nom</FieldLabel>
            <input
              id="recipe-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={inputStyle}
              placeholder="Le Végétarien"
              autoFocus
              required
            />
          </div>

          <div>
            <FieldLabel
              htmlFor="recipe-product"
              hint="Rattachée à un produit vendu, la recette pourra servir au calcul de marge et, plus tard, à la déduction du stock par les ventes."
            >
              Produit du catalogue
            </FieldLabel>
            <select
              id="recipe-product"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              style={inputStyle}
            >
              <option value="">Non rattachée (préparation interne)</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {formatCents(product.price)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel
              htmlFor="recipe-portions"
              hint="Les quantités d’ingrédients se saisissent pour la recette entière."
            >
              Portions produites
            </FieldLabel>
            <input
              id="recipe-portions"
              value={portions}
              onChange={(event) => setPortions(event.target.value)}
              style={inputStyle}
              inputMode="numeric"
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="recipe-notes">Notes (facultatif)</FieldLabel>
            <textarea
              id="recipe-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              placeholder="Montage, cuisson, remarques"
            />
          </div>

          {error && <p style={{ fontSize: '13px', color: '#B4302A' }}>{error}</p>}

          <DialogFooter>
            <PrimaryButton disabled={isPending}>
              {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

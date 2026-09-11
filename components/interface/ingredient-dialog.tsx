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
import { createIngredient, updateIngredient } from '@/app/actions/ingredients'
import {
  UNIT_OPTIONS,
  baseUnitLabel,
  formatCents,
  formatNumber,
  parseEurosToCents,
  parseQuantity,
  referenceUnitLabel,
} from '@/lib/interface/units'
import { referencePriceCents } from '@/lib/interface/cost'
import type { IngredientCategory, IngredientUnit, IngredientWithStock } from '@/types'
import { FieldLabel, PrimaryButton, inputStyle } from './form-bits'

const CATEGORY_OPTIONS: { value: IngredientCategory; label: string }[] = [
  { value: 'legume', label: 'Légumes' },
  { value: 'fruit', label: 'Fruits' },
  { value: 'viande', label: 'Viandes' },
  { value: 'poisson', label: 'Poissons' },
  { value: 'cremerie', label: 'Crémerie' },
  { value: 'boulangerie', label: 'Boulangerie' },
  { value: 'epicerie', label: 'Épicerie' },
  { value: 'boisson', label: 'Boissons' },
  { value: 'emballage', label: 'Emballages' },
  { value: 'autre', label: 'Autre' },
]

/**
 * Création et modification d'un ingrédient.
 *
 * Le prix est un triplet indivisible : conditionnement + montant + provenance.
 * Les deux champs sont donc remplis ensemble ou laissés vides ensemble — un
 * conditionnement sans prix ne produirait aucun coût, et un prix sans
 * conditionnement ne serait pas divisible.
 */
export function IngredientDialog({
  open,
  onOpenChange,
  ingredient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` = création. */
  ingredient: IngredientWithStock | null
}) {
  const isEdit = ingredient !== null

  const [name, setName] = useState(ingredient?.name ?? '')
  const [unit, setUnit] = useState<IngredientUnit>(ingredient?.base_unit ?? 'g')
  const [packQuantity, setPackQuantity] = useState(
    ingredient?.pack_quantity !== null && ingredient?.pack_quantity !== undefined
      ? formatNumber(ingredient.pack_quantity, 3)
      : ''
  )
  const [packPrice, setPackPrice] = useState(
    ingredient?.pack_price_cents !== null && ingredient?.pack_price_cents !== undefined
      ? (ingredient.pack_price_cents / 100).toFixed(2).replace('.', ',')
      : ''
  )
  const [threshold, setThreshold] = useState(
    ingredient?.low_stock_threshold !== null && ingredient?.low_stock_threshold !== undefined
      ? formatNumber(ingredient.low_stock_threshold, 3)
      : ''
  )
  const [category, setCategory] = useState<IngredientCategory | ''>(
    ingredient?.category ?? ''
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const parsedQuantity = parseQuantity(packQuantity)
  const parsedCents = parseEurosToCents(packPrice)
  const preview =
    parsedQuantity !== null && parsedQuantity > 0 && parsedCents !== null
      ? referencePriceCents({
          base_unit: unit,
          pack_quantity: parsedQuantity,
          pack_price_cents: parsedCents,
        })
      : null

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    const quantityFilled = packQuantity.trim() !== ''
    const priceFilled = packPrice.trim() !== ''

    if (quantityFilled !== priceFilled) {
      setError(
        'Conditionnement et prix vont ensemble : remplis les deux, ou laisse les deux vides.'
      )
      return
    }
    if (quantityFilled && (parsedQuantity === null || parsedQuantity <= 0)) {
      setError('Le conditionnement doit être un nombre supérieur à zéro.')
      return
    }
    if (priceFilled && (parsedCents === null || parsedCents < 0)) {
      setError('Le prix doit être un montant valide.')
      return
    }

    const parsedThreshold = threshold.trim() === '' ? null : parseQuantity(threshold)
    if (threshold.trim() !== '' && (parsedThreshold === null || parsedThreshold < 0)) {
      setError('Le seuil d’alerte doit être un nombre positif, ou rester vide.')
      return
    }

    const payload = {
      name: name.trim(),
      base_unit: unit,
      low_stock_threshold: parsedThreshold,
      category: category === '' ? null : category,
      price:
        quantityFilled && parsedQuantity !== null && parsedCents !== null
          ? { pack_quantity: parsedQuantity, pack_price_cents: parsedCents }
          : null,
    }

    startTransition(async () => {
      const result = isEdit
        ? await updateIngredient(ingredient.id, payload)
        : await createIngredient(payload)

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
            {isEdit ? ingredient.name : 'Nouvel ingrédient'}
          </DialogTitle>
          <DialogDescription style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
            {isEdit
              ? "L'unité n'est pas modifiable : tout l'historique de stock est enregistré dedans."
              : 'Le stock et les recettes seront exprimés dans l’unité choisie ici.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <FieldLabel htmlFor="ingredient-name">Nom</FieldLabel>
            <input
              id="ingredient-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={inputStyle}
              placeholder="Farine T65"
              autoFocus
              required
            />
          </div>

          <div>
            <FieldLabel htmlFor="ingredient-unit">Unité de stock</FieldLabel>
            <select
              id="ingredient-unit"
              value={unit}
              onChange={(event) => setUnit(event.target.value as IngredientUnit)}
              style={inputStyle}
              disabled={isEdit}
            >
              {UNIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="ingredient-category">Famille</FieldLabel>
              <select
                id="ingredient-category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as IngredientCategory | '')
                }
                style={inputStyle}
              >
                <option value="">Non classé</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel
                htmlFor="ingredient-threshold"
                hint="Vide : l’alerte ne se déclenche qu’à zéro, donc trop tard."
              >
                Alerte sous ({baseUnitLabel(unit)})
              </FieldLabel>
              <input
                id="ingredient-threshold"
                value={threshold}
                onChange={(event) => setThreshold(event.target.value)}
                style={inputStyle}
                inputMode="decimal"
                placeholder="500"
              />
            </div>
          </div>

          <div
            className="rounded-xl p-3 space-y-3"
            style={{ border: '1px dashed var(--espresso-20)' }}
          >
            <p style={{ fontSize: '11px', color: 'var(--espresso-60)', lineHeight: 1.4 }}>
              Prix d’achat — facultatif. Laissé vide, l’ingrédient est marqué{' '}
              <strong>prix manquant</strong> et les recettes qui l’utilisent n’affichent aucun coût.
              Un prix saisi ici est étiqueté <strong>saisi à la main</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="pack-quantity">
                  Conditionnement ({baseUnitLabel(unit)})
                </FieldLabel>
                <input
                  id="pack-quantity"
                  value={packQuantity}
                  onChange={(event) => setPackQuantity(event.target.value)}
                  style={inputStyle}
                  inputMode="decimal"
                  placeholder="5000"
                />
              </div>
              <div>
                <FieldLabel htmlFor="pack-price">Prix du conditionnement</FieldLabel>
                <input
                  id="pack-price"
                  value={packPrice}
                  onChange={(event) => setPackPrice(event.target.value)}
                  style={inputStyle}
                  inputMode="decimal"
                  placeholder="8,90"
                />
              </div>
            </div>

            <p
              style={{
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: preview === null ? 'var(--espresso-40)' : 'var(--espresso)',
              }}
            >
              {preview === null
                ? 'Soit — /' + referenceUnitLabel(unit)
                : `Soit ${formatCents(preview)}/${referenceUnitLabel(unit)}`}
            </p>
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#B4302A', lineHeight: 1.35 }}>{error}</p>
          )}

          <DialogFooter>
            <PrimaryButton disabled={isPending}>
              {isPending ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

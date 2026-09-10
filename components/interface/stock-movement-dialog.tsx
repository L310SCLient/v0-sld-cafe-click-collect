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
import { recordInventoryCount, recordStockMovement } from '@/app/actions/ingredients'
import { inventoryDelta } from '@/lib/interface/cost'
import { baseUnitLabel, formatQuantity, formatSignedQuantity, parseQuantity } from '@/lib/interface/units'
import type { IngredientWithStock, StockMovementType } from '@/types'
import { FieldLabel, PrimaryButton, inputStyle } from './form-bits'

const MOVEMENT_OPTIONS: { value: StockMovementType; label: string; help: string }[] = [
  { value: 'reception', label: 'Réception', help: 'Livraison entrée en stock.' },
  { value: 'consommation', label: 'Consommation', help: 'Quantité utilisée en production.' },
  { value: 'perte', label: 'Perte', help: 'Jeté, cassé, périmé.' },
  {
    value: 'inventaire',
    label: 'Comptage (inventaire)',
    help: 'Saisis la quantité réellement comptée : c’est l’écart avec le théorique qui est enregistré.',
  },
]

export function StockMovementDialog({
  open,
  onOpenChange,
  ingredient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient: IngredientWithStock
}) {
  const [type, setType] = useState<StockMovementType>('reception')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const parsed = parseQuantity(quantity)
  const option = MOVEMENT_OPTIONS.find((item) => item.value === type)!

  // Aperçu de l'effet réel sur le stock, avant validation.
  const delta =
    parsed === null
      ? null
      : type === 'inventaire'
        ? inventoryDelta(ingredient.stock, parsed)
        : type === 'reception'
          ? parsed
          : -parsed

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    if (parsed === null) {
      setError('Saisis une quantité.')
      return
    }
    if (type !== 'inventaire' && parsed <= 0) {
      setError('La quantité doit être supérieure à zéro.')
      return
    }
    if (type === 'inventaire' && parsed < 0) {
      setError('Un comptage ne peut pas être négatif.')
      return
    }

    startTransition(async () => {
      const result =
        type === 'inventaire'
          ? await recordInventoryCount({
              ingredient_id: ingredient.id,
              counted: parsed,
              note: note.trim() || undefined,
            })
          : await recordStockMovement({
              ingredient_id: ingredient.id,
              quantity: parsed,
              type,
              note: note.trim() || undefined,
            })

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
        className="max-w-[420px]"
        style={{ backgroundColor: 'var(--creme-bg)', borderColor: 'var(--espresso-20)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-serif" style={{ color: 'var(--espresso)' }}>
            {ingredient.name}
          </DialogTitle>
          <DialogDescription style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
            Stock actuel : {formatQuantity(ingredient.stock, ingredient.base_unit)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <FieldLabel htmlFor="movement-type">Type de mouvement</FieldLabel>
            <select
              id="movement-type"
              value={type}
              onChange={(event) => setType(event.target.value as StockMovementType)}
              style={inputStyle}
            >
              {MOVEMENT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5" style={{ fontSize: '11px', color: 'var(--espresso-60)', lineHeight: 1.4 }}>
              {option.help}
            </p>
          </div>

          <div>
            <FieldLabel htmlFor="movement-quantity">
              {type === 'inventaire' ? 'Quantité comptée' : 'Quantité'} (
              {baseUnitLabel(ingredient.base_unit)})
            </FieldLabel>
            <input
              id="movement-quantity"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              style={inputStyle}
              inputMode="decimal"
              placeholder={ingredient.base_unit === 'unit' ? '12' : '1500'}
              autoFocus
              required
            />
          </div>

          <div
            className="rounded-xl px-3 py-2.5"
            style={{ backgroundColor: 'var(--espresso-08)' }}
          >
            {delta === null ? (
              <p style={{ fontSize: '12px', color: 'var(--espresso-40)' }}>
                Effet sur le stock : —
              </p>
            ) : delta === 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
                Aucun écart : rien ne sera enregistré.
              </p>
            ) : (
              <p
                style={{
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--espresso)',
                }}
              >
                {formatSignedQuantity(delta, ingredient.base_unit)} → nouveau stock{' '}
                {formatQuantity(ingredient.stock + delta, ingredient.base_unit)}
              </p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="movement-note">Note (facultatif)</FieldLabel>
            <input
              id="movement-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              style={inputStyle}
              placeholder="Livraison Metro"
            />
          </div>

          {error && <p style={{ fontSize: '13px', color: '#B4302A' }}>{error}</p>}

          <DialogFooter>
            <PrimaryButton disabled={isPending}>
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

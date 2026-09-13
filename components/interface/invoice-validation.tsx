'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle2, Plus, ScanLine, Trash2, X } from 'lucide-react'
import {
  createIngredientFromLine,
  deleteInvoice,
  deleteInvoiceLine,
  parseInvoice,
  updateInvoiceHeader,
  updateInvoiceLine,
  validateInvoice,
} from '@/app/actions/invoices'
import { pricePerBaseUnit } from '@/lib/interface/prices'
import {
  baseUnitLabel,
  formatCents,
  formatNumber,
  parseEurosToCents,
  parseQuantity,
  referenceUnitLabel,
} from '@/lib/interface/units'
import type {
  IngredientUnit,
  IngredientWithStock,
  InvoiceLine,
  InvoiceWithLines,
  Supplier,
} from '@/types'
import { FieldLabel, GhostButton, PrimaryButton, inputStyle } from './form-bits'

/**
 * Écran de validation d'une facture.
 *
 * Tout y est modifiable jusqu'à la validation, et rien n'est enregistré comme
 * prix avant. Une ligne proposée par l'IA affiche sa confiance ; les moins
 * sûres sont remontées en tête par la couche de lecture.
 */
export function InvoiceValidation({
  invoice,
  suppliers,
  ingredients,
  imageUrl,
}: {
  invoice: InvoiceWithLines
  suppliers: Supplier[]
  ingredients: IngredientWithStock[]
  imageUrl: string | null
}) {
  const router = useRouter()
  const isValidated = invoice.status === 'validee'
  const [isPending, startTransition] = useTransition()

  const [supplierId, setSupplierId] = useState(invoice.supplier_id ?? '')
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoice_date ?? '')
  const [invoiceNumber, setInvoiceNumber] = useState(invoice.invoice_number ?? '')
  const [total, setTotal] = useState(
    invoice.total_cents !== null ? (invoice.total_cents / 100).toFixed(2).replace('.', ',') : ''
  )

  const usableLines = invoice.lines.filter(
    (line) =>
      line.ingredient_id !== null &&
      line.pack_quantity !== null &&
      line.pack_price_cents !== null
  ).length

  function saveHeader() {
    startTransition(async () => {
      const result = await updateInvoiceHeader(invoice.id, {
        supplier_id: supplierId === '' ? null : supplierId,
        invoice_date: invoiceDate === '' ? null : invoiceDate,
        invoice_number: invoiceNumber.trim() === '' ? null : invoiceNumber.trim(),
        total_cents: total.trim() === '' ? null : parseEurosToCents(total),
      })
      if (result.error) toast.error(result.error)
      else toast.success(result.message ?? 'Enregistré.')
    })
  }

  function relaunchParsing() {
    startTransition(async () => {
      const result = await parseInvoice(invoice.id)
      if (result.error) toast.error(result.error)
      else toast.success(result.message ?? 'Lecture relancée.')
    })
  }

  function confirm() {
    startTransition(async () => {
      const result = await validateInvoice(invoice.id)
      if (result.error) toast.error(result.error)
      else toast.success(result.message ?? 'Facture validée.')
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? 'Supprimée.')
      router.push('/interface/factures')
    })
  }

  return (
    <div>
      <Link
        href="/interface/factures"
        className="inline-flex items-center gap-1.5 mb-3"
        style={{ fontSize: '13px', color: 'var(--espresso-60)' }}
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.9} />
        Factures
      </Link>

      <h1 className="font-serif mb-1" style={{ fontSize: '22px', color: 'var(--espresso)' }}>
        {invoice.supplier?.name ?? 'Facture à renseigner'}
      </h1>
      <p className="mb-4" style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
        {invoice.lines.length} ligne{invoice.lines.length > 1 ? 's' : ''} ·{' '}
        {usableLines} exploitable{usableLines > 1 ? 's' : ''}
        {invoice.parse_model && ` · lue par ${invoice.parse_model}`}
      </p>

      {isValidated ? (
        <p
          className="rounded-xl px-3 py-2.5 mb-4 flex items-center gap-2"
          style={{ fontSize: '13px', color: '#2F6B4F', backgroundColor: '#2F6B4F14' }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
          Facture validée : ses prix sont enregistrés dans l’historique et ne sont plus
          modifiables ici.
        </p>
      ) : (
        <p
          className="rounded-xl px-3 py-2.5 mb-4"
          style={{
            fontSize: '12px',
            color: '#8A5A1B',
            backgroundColor: '#8A5A1B14',
            lineHeight: 1.45,
          }}
        >
          Ces lignes sont une <strong>proposition de lecture</strong>, pas une vérité. Vérifie-les,
          rattache chaque ligne à un ingrédient, puis valide : c’est la validation qui enregistre
          les prix.
        </p>
      )}

      {/* En-tête */}
      <div
        className="rounded-2xl p-3 sm:p-4 mb-4 space-y-3"
        style={{ backgroundColor: 'var(--creme-surface)', border: '1px solid var(--espresso-20)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="invoice-supplier">Fournisseur</FieldLabel>
            <select
              id="invoice-supplier"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              style={inputStyle}
              disabled={isValidated}
            >
              <option value="">À renseigner</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="invoice-date" hint="Celle imprimée sur la facture.">
              Date
            </FieldLabel>
            <input
              id="invoice-date"
              type="date"
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
              style={inputStyle}
              disabled={isValidated}
            />
          </div>
          <div>
            <FieldLabel htmlFor="invoice-number">Numéro</FieldLabel>
            <input
              id="invoice-number"
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              style={inputStyle}
              disabled={isValidated}
            />
          </div>
          <div>
            <FieldLabel htmlFor="invoice-total">Total facture</FieldLabel>
            <input
              id="invoice-total"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              style={inputStyle}
              inputMode="decimal"
              disabled={isValidated}
            />
          </div>
        </div>

        {!isValidated && (
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton onClick={saveHeader} disabled={isPending}>
              Enregistrer l’en-tête
            </GhostButton>
            <GhostButton onClick={relaunchParsing} disabled={isPending}>
              <ScanLine className="h-3.5 w-3.5" strokeWidth={1.9} />
              Relancer la lecture
            </GhostButton>
            <GhostButton onClick={remove} disabled={isPending} danger label="Supprimer la facture">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />
            </GhostButton>
          </div>
        )}
      </div>

      {imageUrl && (
        <details className="mb-4">
          <summary
            className="cursor-pointer"
            style={{ fontSize: '13px', color: 'var(--espresso-60)' }}
          >
            Voir la photo
          </summary>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Photo de la facture"
            className="mt-2 rounded-xl w-full"
            style={{ border: '1px solid var(--espresso-20)' }}
          />
        </details>
      )}

      {/* Lignes */}
      {invoice.lines.length === 0 ? (
        <div
          className="rounded-2xl px-5 py-8 text-center"
          style={{ border: '1px dashed var(--espresso-20)' }}
        >
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--espresso)' }}>
            Aucune ligne
          </p>
          <p
            className="mt-1.5 mx-auto"
            style={{ fontSize: '13px', color: 'var(--espresso-60)', maxWidth: '360px' }}
          >
            La lecture n’a rien reconnu, ou elle n’a pas encore été lancée.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {invoice.lines.map((line) => (
            <InvoiceLineRow
              key={line.id}
              line={line}
              ingredients={ingredients}
              readOnly={isValidated}
            />
          ))}
        </ul>
      )}

      {!isValidated && (
        <div className="mt-5">
          <PrimaryButton type="button" onClick={confirm} disabled={isPending}>
            {isPending ? 'Validation…' : `Valider et enregistrer ${usableLines} prix`}
          </PrimaryButton>
          <p className="mt-2" style={{ fontSize: '11px', color: 'var(--espresso-60)' }}>
            Seules les lignes avec un ingrédient rattaché, un conditionnement et un prix
            produisent un prix. Les autres sont ignorées et listées.
          </p>
        </div>
      )}
    </div>
  )
}

function InvoiceLineRow({
  line,
  ingredients,
  readOnly,
}: {
  line: InvoiceLine
  ingredients: IngredientWithStock[]
  readOnly: boolean
}) {
  const [packQuantity, setPackQuantity] = useState(
    line.pack_quantity !== null ? formatNumber(line.pack_quantity, 3) : ''
  )
  const [unit, setUnit] = useState<IngredientUnit | ''>(line.base_unit ?? '')
  const [price, setPrice] = useState(
    line.pack_price_cents !== null
      ? (line.pack_price_cents / 100).toFixed(2).replace('.', ',')
      : ''
  )
  const [ingredientId, setIngredientId] = useState(line.ingredient_id ?? '')
  const [isCreating, setIsCreating] = useState(false)
  const [isPending, startTransition] = useTransition()

  const parsedQuantity = parseQuantity(packQuantity)
  const parsedCents = parseEurosToCents(price)
  const unitCost =
    parsedQuantity !== null && parsedQuantity > 0 && parsedCents !== null
      ? pricePerBaseUnit(parsedCents, parsedQuantity)
      : null

  const lowConfidence = line.confidence !== null && line.confidence < 0.7

  function save() {
    startTransition(async () => {
      const result = await updateInvoiceLine(line.id, {
        pack_quantity: packQuantity.trim() === '' ? null : parsedQuantity,
        base_unit: unit === '' ? null : unit,
        pack_price_cents: price.trim() === '' ? null : parsedCents,
        ingredient_id: ingredientId === '' ? null : ingredientId,
      })
      if (result.error) toast.error(result.error)
      else toast.success(result.message ?? 'Ligne corrigée.')
    })
  }

  function removeLine() {
    startTransition(async () => {
      const result = await deleteInvoiceLine(line.id)
      if (result.error) toast.error(result.error)
      else toast.success(result.message ?? 'Ligne retirée.')
    })
  }

  return (
    <li
      className="rounded-2xl p-3"
      style={{
        backgroundColor: 'var(--creme-surface)',
        border: `1px solid ${lowConfidence ? '#B4302A40' : 'var(--espresso-20)'}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className="min-w-0"
          style={{ fontSize: '14px', fontWeight: 600, color: 'var(--espresso)' }}
        >
          {line.raw_label}
        </p>
        {line.confidence !== null && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5"
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: lowConfidence ? '#B4302A' : 'var(--espresso-60)',
              backgroundColor: lowConfidence ? '#B4302A1A' : 'var(--espresso-08)',
            }}
          >
            confiance {Math.round(line.confidence * 100)} %
          </span>
        )}
      </div>

      {!readOnly && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            <div>
              <FieldLabel htmlFor={`qty-${line.id}`}>Conditionnement</FieldLabel>
              <input
                id={`qty-${line.id}`}
                value={packQuantity}
                onChange={(event) => setPackQuantity(event.target.value)}
                style={{ ...inputStyle, fontSize: '14px', minHeight: '44px' }}
                inputMode="decimal"
              />
            </div>
            <div>
              <FieldLabel htmlFor={`unit-${line.id}`}>Unité</FieldLabel>
              <select
                id={`unit-${line.id}`}
                value={unit}
                onChange={(event) => setUnit(event.target.value as IngredientUnit | '')}
                style={{ ...inputStyle, fontSize: '14px', minHeight: '44px' }}
              >
                <option value="">—</option>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="unit">unité</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor={`price-${line.id}`}>Prix</FieldLabel>
              <input
                id={`price-${line.id}`}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                style={{ ...inputStyle, fontSize: '14px', minHeight: '44px' }}
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="mt-2">
            <FieldLabel htmlFor={`ing-${line.id}`}>Ingrédient rattaché</FieldLabel>
            <div className="flex items-center gap-2">
              <select
                id={`ing-${line.id}`}
                value={ingredientId}
                onChange={(event) => setIngredientId(event.target.value)}
                style={{ ...inputStyle, fontSize: '14px', minHeight: '44px' }}
              >
                <option value="">Non rattachée — aucun prix produit</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                aria-label="Créer un ingrédient depuis cette ligne"
                className="shrink-0 flex items-center justify-center rounded-full active:opacity-70"
                style={{
                  width: '44px',
                  height: '44px',
                  border: '1px solid var(--espresso-20)',
                  color: 'var(--espresso-80)',
                }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.1} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-3">
            <p
              style={{
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: unitCost === null ? 'var(--espresso-40)' : 'var(--espresso)',
              }}
            >
              {unitCost === null || unit === ''
                ? 'prix unitaire : —'
                : `${formatCents(unitCost * (unit === 'unit' ? 1 : 1000))}/${referenceUnitLabel(unit)}`}
            </p>
            <div className="flex items-center gap-2">
              <GhostButton onClick={save} disabled={isPending}>
                Enregistrer
              </GhostButton>
              <GhostButton onClick={removeLine} disabled={isPending} danger label="Retirer la ligne">
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </GhostButton>
            </div>
          </div>

          {isCreating && (
            <CreateIngredientFromLine
              lineId={line.id}
              rawLabel={line.raw_label}
              defaultUnit={unit === '' ? 'g' : unit}
              onDone={() => setIsCreating(false)}
            />
          )}
        </>
      )}

      {readOnly && (
        <p
          className="mt-2"
          style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--espresso-60)' }}
        >
          {line.pack_quantity !== null && line.base_unit
            ? `${formatNumber(line.pack_quantity, 2)} ${baseUnitLabel(line.base_unit)}`
            : '—'}
          {line.pack_price_cents !== null && ` · ${formatCents(line.pack_price_cents)}`}
        </p>
      )}
    </li>
  )
}

function CreateIngredientFromLine({
  lineId,
  rawLabel,
  defaultUnit,
  onDone,
}: {
  lineId: string
  rawLabel: string
  defaultUnit: IngredientUnit
  onDone: () => void
}) {
  const [name, setName] = useState(rawLabel)
  const [unit, setUnit] = useState<IngredientUnit>(defaultUnit)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError('')
    startTransition(async () => {
      const result = await createIngredientFromLine(lineId, {
        name: name.trim(),
        base_unit: unit,
        category: null,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success(result.message ?? 'Ingrédient créé.')
      onDone()
    })
  }

  return (
    <div
      className="mt-3 rounded-xl p-3"
      style={{ border: '1px dashed var(--espresso-20)' }}
    >
      <p className="mb-2" style={{ fontSize: '11px', color: 'var(--espresso-60)' }}>
        Nouvel ingrédient, créé depuis cette ligne. Son prix viendra de la validation de la
        facture, avec sa provenance et sa date.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="col-span-2">
          <FieldLabel htmlFor={`new-name-${lineId}`}>Nom</FieldLabel>
          <input
            id={`new-name-${lineId}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={{ ...inputStyle, fontSize: '14px', minHeight: '44px' }}
          />
        </div>
        <div>
          <FieldLabel htmlFor={`new-unit-${lineId}`}>Unité</FieldLabel>
          <select
            id={`new-unit-${lineId}`}
            value={unit}
            onChange={(event) => setUnit(event.target.value as IngredientUnit)}
            style={{ ...inputStyle, fontSize: '14px', minHeight: '44px' }}
          >
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="unit">unité</option>
          </select>
        </div>
      </div>
      {error && (
        <p className="mt-2" style={{ fontSize: '12px', color: '#B4302A' }}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 mt-3">
        <GhostButton onClick={submit} disabled={isPending}>
          {isPending ? 'Création…' : 'Créer et rattacher'}
        </GhostButton>
        <GhostButton onClick={onDone} disabled={isPending}>
          Annuler
        </GhostButton>
      </div>
    </div>
  )
}

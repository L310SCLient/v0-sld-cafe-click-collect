'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, Clock, FileText, Plus } from 'lucide-react'
import { createSupplier } from '@/app/actions/invoices'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCents } from '@/lib/interface/units'
import type { Invoice, InvoiceStatus, Supplier } from '@/types'
import { FieldLabel, PrimaryButton, inputStyle } from './form-bits'
import { InvoiceImport } from './invoice-import'

const STATUS_META: Record<
  InvoiceStatus,
  { label: string; color: string; background: string }
> = {
  a_lire: { label: 'à lire', color: '#8A5A1B', background: '#8A5A1B1A' },
  lecture: { label: 'lecture en cours', color: '#8A5A1B', background: '#8A5A1B1A' },
  a_valider: { label: 'à valider', color: '#8A5A1B', background: '#8A5A1B1A' },
  validee: { label: 'validée', color: '#2F6B4F', background: '#2F6B4F1A' },
  echec: { label: 'lecture échouée', color: '#B4302A', background: '#B4302A1A' },
}

function StatusIcon({ status }: { status: InvoiceStatus }) {
  if (status === 'validee') return <CheckCircle2 className="h-4 w-4" strokeWidth={1.9} />
  if (status === 'echec') return <AlertCircle className="h-4 w-4" strokeWidth={1.9} />
  return <Clock className="h-4 w-4" strokeWidth={1.9} />
}

export function InvoicesList({
  invoices,
  suppliers,
  parsingAvailable,
}: {
  invoices: (Invoice & { supplier: Supplier | null; lineCount: number })[]
  suppliers: Supplier[]
  /** Faux quand ANTHROPIC_API_KEY est absente côté serveur. */
  parsingAvailable: boolean
}) {
  const [isAddingSupplier, setIsAddingSupplier] = useState(false)

  const toValidate = invoices.filter((invoice) => invoice.status === 'a_valider').length

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="font-serif" style={{ fontSize: '24px', color: 'var(--espresso)' }}>
          Factures
        </h1>
      </div>

      <p className="mb-4" style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
        {invoices.length} facture{invoices.length > 1 ? 's' : ''}
        {toValidate > 0 && ` · ${toValidate} à valider`}
        {` · ${suppliers.length} fournisseur${suppliers.length > 1 ? 's' : ''}`}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <InvoiceImport />
        <button
          type="button"
          onClick={() => setIsAddingSupplier(true)}
          className="flex items-center gap-1.5 rounded-full px-4 active:opacity-70"
          style={{
            minHeight: '46px',
            border: '1px solid var(--espresso-20)',
            color: 'var(--espresso-80)',
            fontSize: '14px',
          }}
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Fournisseur
        </button>
      </div>

      {!parsingAvailable && (
        <p
          className="rounded-xl px-3 py-2.5 mb-4"
          style={{
            fontSize: '12px',
            color: '#8A5A1B',
            backgroundColor: '#8A5A1B14',
            lineHeight: 1.45,
          }}
        >
          <strong>Lecture automatique hors service</strong> — la clé ANTHROPIC_API_KEY n’est pas
          configurée sur le serveur. Les photos s’importent et se conservent, mais leurs lignes
          devront être saisies à la main.
        </p>
      )}

      {suppliers.length === 0 && (
        <p
          className="rounded-xl px-3 py-2.5 mb-4"
          style={{ fontSize: '12px', color: 'var(--espresso-60)', backgroundColor: 'var(--espresso-08)', lineHeight: 1.45 }}
        >
          Aucun fournisseur enregistré. Une facture ne peut pas être validée sans fournisseur :
          un prix sans fournisseur ne se compare pas.
        </p>
      )}

      {invoices.length === 0 ? (
        <div
          className="rounded-2xl px-5 py-10 text-center"
          style={{ border: '1px dashed var(--espresso-20)' }}
        >
          <FileText
            className="h-6 w-6 mx-auto mb-2"
            strokeWidth={1.5}
            style={{ color: 'var(--espresso-40)' }}
          />
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--espresso)' }}>
            Aucune facture
          </p>
          <p
            className="mt-1.5 mx-auto"
            style={{ fontSize: '13px', color: 'var(--espresso-60)', maxWidth: '380px', lineHeight: 1.45 }}
          >
            Photographie une facture. Ses lignes seront proposées, puis c’est toi qui valides —
            les prix n’entrent en base qu’après ta confirmation.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {invoices.map((invoice) => {
            const meta = STATUS_META[invoice.status]
            return (
              <li key={invoice.id}>
                <Link
                  href={`/interface/factures/${invoice.id}`}
                  className="block rounded-2xl p-3 sm:p-4 active:opacity-80"
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
                        {invoice.supplier?.name ?? 'Fournisseur à renseigner'}
                      </p>
                      <p
                        className="mt-0.5"
                        style={{ fontSize: '12px', color: 'var(--espresso-60)' }}
                      >
                        {invoice.invoice_date ?? 'date à renseigner'}
                        {invoice.invoice_number && ` · nº ${invoice.invoice_number}`}
                        {` · ${invoice.lineCount} ligne${invoice.lineCount > 1 ? 's' : ''}`}
                      </p>
                      {invoice.parse_error && (
                        <p
                          className="mt-1"
                          style={{ fontSize: '11px', color: '#B4302A', lineHeight: 1.35 }}
                        >
                          {invoice.parse_error}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      {invoice.total_cents !== null && (
                        <p
                          style={{
                            fontSize: '14px',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--espresso)',
                          }}
                        >
                          {formatCents(invoice.total_cents)}
                        </p>
                      )}
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 mt-1"
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: meta.color,
                          backgroundColor: meta.background,
                        }}
                      >
                        <StatusIcon status={invoice.status} />
                        {meta.label}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <SupplierDialog
        open={isAddingSupplier}
        onOpenChange={(open) => !open && setIsAddingSupplier(false)}
      />
    </div>
  )
}

function SupplierDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await createSupplier({ name, notes: null })
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success(result.message ?? 'Fournisseur ajouté.')
      setName('')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[380px]"
        style={{ backgroundColor: 'var(--creme-bg)', borderColor: 'var(--espresso-20)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-serif" style={{ color: 'var(--espresso)' }}>
            Nouveau fournisseur
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <FieldLabel htmlFor="supplier-name">Nom</FieldLabel>
            <input
              id="supplier-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={inputStyle}
              placeholder="Metro"
              autoFocus
              required
            />
          </div>
          {error && <p style={{ fontSize: '13px', color: '#B4302A' }}>{error}</p>}
          <DialogFooter>
            <PrimaryButton disabled={isPending}>
              {isPending ? 'Ajout…' : 'Ajouter'}
            </PrimaryButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

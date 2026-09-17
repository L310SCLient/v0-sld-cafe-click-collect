'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Camera, ImagePlus, Link2Off, PackageCheck, Trash2 } from 'lucide-react'
import {
  attachDeliveryNoteToInvoice,
  deleteDeliveryNote,
  detachDeliveryNote,
  importDeliveryNotePhotos,
  parseDeliveryNote,
} from '@/app/actions/delivery-notes'
import { resumeRattachement, type DeliveryNoteStatus, type DeliveryNoteWithLinks } from '@/lib/interface/delivery-notes'
import type { Invoice, Supplier } from '@/types'
import { GhostButton } from './form-bits'
import { reduireImage } from './invoice-import'

/**
 * Bons de livraison.
 *
 * Ce que le restaurant photographie au quotidien, c'est le bon ; la facture
 * arrive plus tard. L'écran assume donc qu'un bon non rattaché est normal — il
 * l'affiche comme une attente, pas comme une faute — et ne montre les prix du
 * bon nulle part comme acquis : ils restent provisoires jusqu'à la facture.
 */

const STATUS_META: Record<DeliveryNoteStatus, { label: string; color: string; background: string }> = {
  a_lire: { label: 'à lire', color: '#8A5A1B', background: '#8A5A1B1A' },
  lecture: { label: 'lecture en cours', color: '#8A5A1B', background: '#8A5A1B1A' },
  a_valider: { label: 'à vérifier', color: '#8A5A1B', background: '#8A5A1B1A' },
  validee: { label: 'vérifié', color: '#2F6B4F', background: '#2F6B4F1A' },
  echec: { label: 'lecture échouée', color: '#B4302A', background: '#B4302A1A' },
}

type InvoiceOption = Invoice & { supplier: Supplier | null }

function libelleFacture(invoice: InvoiceOption): string {
  const parts = [invoice.supplier?.name ?? 'Fournisseur à renseigner']
  if (invoice.invoice_date) parts.push(invoice.invoice_date)
  if (invoice.invoice_number) parts.push(`nº ${invoice.invoice_number}`)
  return parts.join(' · ')
}

export function DeliveryNotesList({
  notes,
  invoices,
  parsingAvailable,
}: {
  notes: DeliveryNoteWithLinks[]
  /** Factures proposées au rattachement. Toutes, y compris non validées. */
  invoices: InvoiceOption[]
  /** Faux quand ANTHROPIC_API_KEY est absente côté serveur. */
  parsingAvailable: boolean
}) {
  const resume = resumeRattachement(notes)

  return (
    <section className="mt-8">
      <h2 className="font-serif" style={{ fontSize: '19px', color: 'var(--espresso)' }}>
        Bons de livraison
      </h2>
      <p className="mt-1 mb-3" style={{ fontSize: '12px', color: 'var(--espresso-60)', lineHeight: 1.45 }}>
        {resume.total === 0
          ? 'Le bon donne un prix provisoire ; la facture le corrigera.'
          : `${resume.total} bon${resume.total > 1 ? 's' : ''} · ${resume.rattaches} rattaché${resume.rattaches > 1 ? 's' : ''} à une facture · ${resume.orphelins} en attente`}
      </p>

      <DeliveryNoteImport />

      {resume.orphelins > 0 && resume.attenteJours !== null && (
        <p
          className="rounded-xl px-3 py-2.5 mt-3"
          style={{ fontSize: '12px', color: '#8A5A1B', backgroundColor: '#8A5A1B14', lineHeight: 1.45 }}
        >
          <strong>
            {resume.orphelins} bon{resume.orphelins > 1 ? 's' : ''} sans facture
          </strong>{' '}
          — le plus ancien attend depuis {resume.attenteJours} jour
          {resume.attenteJours > 1 ? 's' : ''}. Leurs prix restent provisoires : seule la facture
          fait autorité.
        </p>
      )}

      {!parsingAvailable && notes.length > 0 && (
        <p className="mt-3" style={{ fontSize: '11px', color: 'var(--espresso-60)', lineHeight: 1.4 }}>
          Lecture automatique hors service : les bons s’importent et se conservent, mais leurs
          lignes ne sont pas lues.
        </p>
      )}

      {notes.length === 0 ? (
        <div
          className="rounded-2xl px-5 py-8 text-center mt-3"
          style={{ border: '1px dashed var(--espresso-20)' }}
        >
          <PackageCheck
            className="h-6 w-6 mx-auto mb-2"
            strokeWidth={1.5}
            style={{ color: 'var(--espresso-40)' }}
          />
          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--espresso)' }}>
            Aucun bon de livraison
          </p>
          <p
            className="mt-1.5 mx-auto"
            style={{ fontSize: '12px', color: 'var(--espresso-60)', maxWidth: '380px', lineHeight: 1.45 }}
          >
            Photographie les bons au fur et à mesure des livraisons. Tu les rattacheras à leur
            facture quand elle arrivera.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 mt-3">
          {notes.map((note) => (
            <DeliveryNoteCard key={note.id} note={note} invoices={invoices} />
          ))}
        </ul>
      )}
    </section>
  )
}

function DeliveryNoteCard({ note, invoices }: { note: DeliveryNoteWithLinks; invoices: InvoiceOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const meta = STATUS_META[note.status]

  function rattacher(invoiceId: string) {
    if (!invoiceId) return
    startTransition(async () => {
      const result = await attachDeliveryNoteToInvoice(note.id, invoiceId)
      if (result.error) toast.error(result.error)
      else toast.success(result.message ?? 'Bon rattaché.')
      router.refresh()
    })
  }

  function detacher() {
    startTransition(async () => {
      const result = await detachDeliveryNote(note.id)
      if (result.error) toast.error(result.error)
      else toast.success(result.message ?? 'Bon détaché.')
      router.refresh()
    })
  }

  function supprimer() {
    startTransition(async () => {
      const result = await deleteDeliveryNote(note.id)
      if (result.error) toast.error(result.error)
      else toast.success(result.message ?? 'Bon supprimé.')
      router.refresh()
    })
  }

  return (
    <li
      className="rounded-2xl p-3 sm:p-4"
      style={{ backgroundColor: 'var(--creme-surface)', border: '1px solid var(--espresso-20)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="truncate" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--espresso)' }}>
            {note.supplier?.name ?? 'Fournisseur à renseigner'}
          </p>
          <p className="mt-0.5" style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
            {note.delivery_date ?? 'date à renseigner'}
            {note.note_number && ` · nº ${note.note_number}`}
            {` · ${note.lineCount} ligne${note.lineCount > 1 ? 's' : ''}`}
          </p>
          {note.parse_error && (
            <p className="mt-1" style={{ fontSize: '11px', color: '#B4302A', lineHeight: 1.35 }}>
              {note.parse_error}
            </p>
          )}
        </div>

        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 shrink-0"
          style={{ fontSize: '10px', fontWeight: 600, color: meta.color, backgroundColor: meta.background }}
        >
          {meta.label}
        </span>
      </div>

      {note.invoice ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 items-center">
          <p style={{ fontSize: '12px', color: '#2F6B4F', lineHeight: 1.4 }}>
            Rattaché à la facture{' '}
            {note.invoice.invoice_number ? `nº ${note.invoice.invoice_number}` : 'sélectionnée'}
            {note.invoice.invoice_date && ` du ${note.invoice.invoice_date}`}.
          </p>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <GhostButton onClick={detacher} disabled={isPending} label="Détacher ce bon">
              <Link2Off className="h-4 w-4" strokeWidth={1.9} />
              Détacher
            </GhostButton>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p
            className="flex items-start gap-1.5"
            style={{ fontSize: '12px', color: '#8A5A1B', lineHeight: 1.4 }}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-px" strokeWidth={1.9} />
            <span>
              Aucune facture rattachée — les prix de ce bon sont provisoires.
            </span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <select
              defaultValue=""
              disabled={isPending || invoices.length === 0}
              onChange={(event) => rattacher(event.target.value)}
              aria-label="Rattacher à une facture"
              style={{
                fontSize: '13px',
                backgroundColor: 'var(--creme-bg)',
                border: '1px solid var(--espresso-20)',
                color: 'var(--espresso)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                width: '100%',
                minHeight: '44px',
              }}
            >
              <option value="">
                {invoices.length === 0 ? 'Aucune facture importée' : 'Rattacher à une facture…'}
              </option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {libelleFacture(invoice)}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <GhostButton onClick={supprimer} disabled={isPending} danger label="Supprimer ce bon">
                <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                Supprimer
              </GhostButton>
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

/**
 * Import d'un lot de bons. Les photos partent une par une : une seule illisible
 * ne doit pas faire perdre les autres, et l'avancement reste lisible pendant
 * que le lot passe.
 */
function DeliveryNoteImport() {
  const router = useRouter()
  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState('')

  function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    // Réinitialise pour que reprendre la même photo redéclenche l'événement.
    event.target.value = ''
    if (files.length === 0) return

    startTransition(async () => {
      const echecs: string[] = []
      let importes = 0

      for (const [index, file] of files.entries()) {
        const avancement = files.length > 1 ? ` (${index + 1} sur ${files.length})` : ''

        setStep(`Préparation${avancement}…`)
        const prete = await reduireImage(file)

        setStep(`Envoi${avancement}…`)
        const formData = new FormData()
        formData.append('photos', prete)

        const imported = await importDeliveryNotePhotos(formData)
        const noteId = imported.deliveryNoteIds?.[0]
        if (imported.error || !noteId) {
          echecs.push(`${file.name || 'photo'} : ${imported.error ?? 'import impossible'}`)
          continue
        }
        importes += 1

        setStep(`Lecture${avancement}…`)
        const parsed = await parseDeliveryNote(noteId)
        if (parsed.error) {
          // Le bon est enregistré, seule sa lecture a échoué : le dire sans le
          // faire passer pour perdu.
          echecs.push(`${file.name || 'photo'} : ${parsed.error}`)
        } else if (files.length === 1) {
          toast.success(parsed.message ?? 'Bon lu.')
        }
      }

      setStep('')

      if (echecs.length > 0) {
        toast.error(
          `${echecs.length} photo${echecs.length > 1 ? 's' : ''} en échec sur ${files.length} — ${echecs.join(' · ')}`
        )
      }
      if (importes > 0 && files.length > 1) {
        toast.success(`${importes} bon${importes > 1 ? 's' : ''} sur ${files.length} importé${importes > 1 ? 's' : ''}.`)
      }

      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFiles}
        hidden
      />
      <input ref={libraryInput} type="file" accept="image/*" multiple onChange={handleFiles} hidden />

      <button
        type="button"
        onClick={() => cameraInput.current?.click()}
        disabled={isPending}
        className="flex items-center gap-2 rounded-full px-4 active:scale-[0.98] transition-transform disabled:opacity-50"
        style={{
          minHeight: '44px',
          border: '1px solid var(--espresso-20)',
          color: 'var(--espresso-80)',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        <Camera className="h-4 w-4" strokeWidth={1.9} />
        {isPending ? step || 'Traitement…' : 'Photographier un bon'}
      </button>

      <button
        type="button"
        onClick={() => libraryInput.current?.click()}
        disabled={isPending}
        className="flex items-center gap-2 rounded-full px-4 active:opacity-70 disabled:opacity-50"
        style={{
          minHeight: '44px',
          border: '1px solid var(--espresso-20)',
          color: 'var(--espresso-80)',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        <ImagePlus className="h-4 w-4" strokeWidth={1.9} />
        Plusieurs fichiers
      </button>
    </div>
  )
}

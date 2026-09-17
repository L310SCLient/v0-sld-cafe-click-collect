import { createAdminClient } from '@/lib/supabase/admin'
import { assertInterfaceAuth } from './auth'
import type {
  DeliveryNote,
  DeliveryNoteLine,
  DeliveryNoteWithLinks,
  InvoiceRef,
} from './delivery-notes'
import type { Supplier } from '@/types'

/**
 * Lectures des bons de livraison.
 *
 * Même règle que `data.ts` : RLS sans policy, donc tout passe par la clé
 * service role derrière `assertInterfaceAuth`, et une erreur LÈVE plutôt que
 * de rendre une liste vide — un écran vide se lirait « aucun bon », ce qui
 * serait faux.
 */

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: String(row.id),
    name: String(row.name),
    notes: (row.notes ?? null) as string | null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
  }
}

function mapDeliveryNote(row: Record<string, unknown>): DeliveryNote {
  return {
    id: String(row.id),
    supplier_id: (row.supplier_id ?? null) as string | null,
    invoice_id: (row.invoice_id ?? null) as string | null,
    delivery_date: (row.delivery_date ?? null) as string | null,
    note_number: (row.note_number ?? null) as string | null,
    image_path: (row.image_path ?? null) as string | null,
    status: row.status as DeliveryNote['status'],
    parse_error: (row.parse_error ?? null) as string | null,
    parse_model: (row.parse_model ?? null) as string | null,
    parsed_at: (row.parsed_at ?? null) as string | null,
    validated_at: (row.validated_at ?? null) as string | null,
    created_at: String(row.created_at),
  }
}

export function mapDeliveryNoteLine(row: Record<string, unknown>): DeliveryNoteLine {
  return {
    id: String(row.id),
    delivery_note_id: String(row.delivery_note_id),
    raw_label: String(row.raw_label),
    quantity: toNullableNumber(row.quantity),
    pack_quantity: toNullableNumber(row.pack_quantity),
    base_unit: (row.base_unit ?? null) as DeliveryNoteLine['base_unit'],
    pack_price_cents: toNullableNumber(row.pack_price_cents),
    line_total_cents: toNullableNumber(row.line_total_cents),
    ingredient_id: (row.ingredient_id ?? null) as string | null,
    confidence: toNullableNumber(row.confidence),
    created_at: String(row.created_at),
  }
}

export async function fetchDeliveryNotes(): Promise<DeliveryNoteWithLinks[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('delivery_notes')
    .select(
      '*, supplier:suppliers(*), invoice:invoices(id, invoice_number, invoice_date), delivery_note_lines(id)'
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Lecture des bons de livraison impossible : ${error.message}`)

  return (data ?? []).map((row) => {
    const note = row as Record<string, unknown>
    const supplier = note.supplier as Record<string, unknown> | null
    const invoice = note.invoice as Record<string, unknown> | null
    const lines = (note.delivery_note_lines ?? []) as unknown[]

    return {
      ...mapDeliveryNote(note),
      supplier: supplier ? mapSupplier(supplier) : null,
      invoice: invoice
        ? ({
            id: String(invoice.id),
            invoice_number: (invoice.invoice_number ?? null) as string | null,
            invoice_date: (invoice.invoice_date ?? null) as string | null,
          } satisfies InvoiceRef)
        : null,
      lineCount: lines.length,
    }
  })
}

export async function fetchDeliveryNoteLines(noteId: string): Promise<DeliveryNoteLine[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('delivery_note_lines')
    .select('*')
    .eq('delivery_note_id', noteId)

  if (error) throw new Error(`Lecture des lignes du bon impossible : ${error.message}`)

  // Les lignes les moins sûres d'abord : c'est là que la relecture humaine a
  // le plus de valeur.
  return (data ?? [])
    .map((row) => mapDeliveryNoteLine(row as Record<string, unknown>))
    .sort((a, b) => (a.confidence ?? 1) - (b.confidence ?? 1))
}

/** URL signée et temporaire de la photo : le bucket est privé. */
export async function signDeliveryNoteImage(imagePath: string): Promise<string | null> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase.storage
    .from('delivery-notes')
    .createSignedUrl(imagePath, 60 * 10)

  if (error) return null
  return data?.signedUrl ?? null
}

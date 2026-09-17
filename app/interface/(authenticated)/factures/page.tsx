import { fetchInvoices, fetchSuppliers } from '@/lib/interface/data'
import { fetchDeliveryNotes } from '@/lib/interface/delivery-data'
import { InvoicesList } from '@/components/interface/invoices-list'

export const metadata = {
  title: 'Factures — Cuisine',
}

export default async function FacturesPage() {
  const [invoices, suppliers, deliveryNotes] = await Promise.all([
    fetchInvoices(),
    fetchSuppliers(),
    fetchDeliveryNotes(),
  ])

  return (
    <InvoicesList
      invoices={invoices}
      suppliers={suppliers}
      deliveryNotes={deliveryNotes}
      // Lu côté serveur : la clé ne doit jamais atteindre le navigateur,
      // seul le fait qu'elle existe est transmis.
      parsingAvailable={Boolean(process.env.ANTHROPIC_API_KEY)}
    />
  )
}

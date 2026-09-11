import { fetchInvoices, fetchSuppliers } from '@/lib/interface/data'
import { InvoicesList } from '@/components/interface/invoices-list'

export const metadata = {
  title: 'Factures — Cuisine',
}

export default async function FacturesPage() {
  const [invoices, suppliers] = await Promise.all([fetchInvoices(), fetchSuppliers()])

  return (
    <InvoicesList
      invoices={invoices}
      suppliers={suppliers}
      // Lu côté serveur : la clé ne doit jamais atteindre le navigateur,
      // seul le fait qu'elle existe est transmis.
      parsingAvailable={Boolean(process.env.ANTHROPIC_API_KEY)}
    />
  )
}

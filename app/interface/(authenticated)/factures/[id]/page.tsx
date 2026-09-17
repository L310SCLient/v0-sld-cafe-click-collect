import { notFound } from 'next/navigation'
import {
  fetchIngredientsWithStock,
  fetchInvoice,
  fetchSuppliers,
  signInvoiceImage,
} from '@/lib/interface/data'
import { fetchReconciliationLines } from '@/lib/interface/delivery-data'
import { InvoiceValidation } from '@/components/interface/invoice-validation'
import { ReconciliationView } from '@/components/interface/reconciliation-view'

export const metadata = {
  title: 'Facture — Cuisine',
}

export default async function FacturePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const invoice = await fetchInvoice(id)
  if (!invoice) notFound()

  const [suppliers, ingredients, imageUrl, rapprochement] = await Promise.all([
    fetchSuppliers(),
    fetchIngredientsWithStock(),
    invoice.image_path ? signInvoiceImage(invoice.image_path) : Promise.resolve(null),
    fetchReconciliationLines(id),
  ])

  return (
    <>
      <InvoiceValidation
        invoice={invoice}
        suppliers={suppliers}
        ingredients={ingredients}
        imageUrl={imageUrl}
      />
      <ReconciliationView
        lignesFacture={rapprochement.lignesFacture}
        bons={rapprochement.bons}
      />
    </>
  )
}

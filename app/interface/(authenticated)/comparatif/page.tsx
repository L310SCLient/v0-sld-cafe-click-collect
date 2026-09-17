import {
  fetchIngredientsWithStock,
  fetchPriceObservations,
  fetchSupplierPriceHistory,
} from '@/lib/interface/data'
import { PriceComparator } from '@/components/interface/price-comparator'

export const metadata = {
  title: 'Comparatif — Cuisine',
}

export default async function ComparatifPage() {
  const [ingredients, observations, supplierReport] = await Promise.all([
    fetchIngredientsWithStock(),
    fetchPriceObservations(),
    fetchSupplierPriceHistory(),
  ])

  return (
    <PriceComparator
      ingredients={ingredients}
      // Une Map ne traverse pas la frontière serveur/client : on passe un objet.
      observationsByIngredient={Object.fromEntries(observations)}
      supplierReport={supplierReport}
    />
  )
}

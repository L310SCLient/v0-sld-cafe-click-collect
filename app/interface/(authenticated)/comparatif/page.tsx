import { fetchIngredientsWithStock, fetchPriceObservations } from '@/lib/interface/data'
import { PriceComparator } from '@/components/interface/price-comparator'

export const metadata = {
  title: 'Comparatif — Cuisine',
}

export default async function ComparatifPage() {
  const [ingredients, observations] = await Promise.all([
    fetchIngredientsWithStock(),
    fetchPriceObservations(),
  ])

  return (
    <PriceComparator
      ingredients={ingredients}
      // Une Map ne traverse pas la frontière serveur/client : on passe un objet.
      observationsByIngredient={Object.fromEntries(observations)}
    />
  )
}

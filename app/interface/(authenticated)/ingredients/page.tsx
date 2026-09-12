import { fetchIngredientsWithStock } from '@/lib/interface/data'
import { IngredientsView } from '@/components/interface/ingredients-view'

export const metadata = {
  title: 'Ingrédients — Cuisine',
}

export default async function IngredientsPage() {
  const ingredients = await fetchIngredientsWithStock()
  return <IngredientsView ingredients={ingredients} />
}

import {
  fetchIngredientsWithStock,
  fetchProductOptions,
  fetchRecipes,
} from '@/lib/interface/data'
import { RecipesView } from '@/components/interface/recipes-view'

export const metadata = {
  title: 'Recettes — Cuisine',
}

export default async function RecettesPage() {
  const [recipes, ingredients, products] = await Promise.all([
    fetchRecipes(),
    fetchIngredientsWithStock(),
    fetchProductOptions(),
  ])

  return <RecipesView recipes={recipes} ingredients={ingredients} products={products} />
}

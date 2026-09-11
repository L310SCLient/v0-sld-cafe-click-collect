import {
  fetchIngredientsWithStock,
  fetchProductOptions,
  fetchProductsWithoutRecipe,
  fetchRecipes,
} from '@/lib/interface/data'
import { RecipesView } from '@/components/interface/recipes-view'

export const metadata = {
  title: 'Recettes — Cuisine',
}

export default async function RecettesPage() {
  const [recipes, ingredients, products, productsWithoutRecipe] = await Promise.all([
    fetchRecipes(),
    fetchIngredientsWithStock(),
    fetchProductOptions(),
    fetchProductsWithoutRecipe(),
  ])

  return (
    <RecipesView
      recipes={recipes}
      ingredients={ingredients}
      products={products}
      productsWithoutRecipe={productsWithoutRecipe}
    />
  )
}

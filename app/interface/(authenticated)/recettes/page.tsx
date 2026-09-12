import {
  fetchIngredientsWithStock,
  fetchProductOptions,
  fetchRecipeMissingItems,
  fetchRecipes,
} from '@/lib/interface/data'
import { RecipesView } from '@/components/interface/recipes-view'

export const metadata = {
  title: 'Recettes — Cuisine',
}

export default async function RecettesPage() {
  const [recipes, ingredients, products, missingByRecipe] = await Promise.all([
    fetchRecipes(),
    fetchIngredientsWithStock(),
    fetchProductOptions(),
    fetchRecipeMissingItems(),
  ])

  return (
    <RecipesView
      recipes={recipes.map((recipe) => ({
        ...recipe,
        missing: missingByRecipe?.get(recipe.id) ?? [],
      }))}
      ingredients={ingredients}
      products={products}
      // `null` = migration 006 non appliquée : l'écran le dit au lieu de
      // présenter des recettes faussement complètes.
      importAvailable={missingByRecipe !== null}
    />
  )
}

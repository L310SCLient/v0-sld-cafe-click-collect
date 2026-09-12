import { notFound } from 'next/navigation'
import { fetchIngredientsWithStock, fetchRecipeImport } from '@/lib/interface/data'
import { RecipeImportView } from '@/components/interface/recipe-import-view'

export const metadata = {
  title: 'Import de recettes — Cuisine',
}

export default async function RecipeImportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [detail, ingredients] = await Promise.all([
    fetchRecipeImport(id),
    fetchIngredientsWithStock(),
  ])

  // `null` = lot inexistant, ou migration 006 non appliquée : dans les deux
  // cas il n'y a rien à montrer ici.
  if (!detail) notFound()

  return <RecipeImportView detail={detail} ingredients={ingredients} />
}

import { createAdminClient } from '@/lib/supabase/admin'
import { assertInterfaceAuth } from './auth'
import type {
  IngredientWithStock,
  Invoice,
  InvoiceLine,
  InvoiceWithLines,
  Product,
  RecipeImportDetail,
  RecipeImportFile,
  RecipeImportIngredient,
  RecipeImportLine,
  RecipeImportRecipeWithLines,
  RecipeMissingItem,
  RecipeWithItems,
  StockMovement,
  Supplier,
} from '@/types'
import type { PriceObservation } from './prices'

/**
 * Lectures de l'interface cuisine.
 *
 * Ces tables sont en RLS sans policy : la clé anon ne peut rien lire. Tout
 * passe donc par le client service role, côté serveur, derrière
 * `assertInterfaceAuth`. En cas d'erreur on LÈVE : une liste vide se
 * confondrait avec « aucune donnée », ce qui serait un mensonge à l'écran.
 */

/** PostgREST peut sérialiser un `numeric` en chaîne selon la version : on force. */
function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function fetchIngredientsWithStock(): Promise<IngredientWithStock[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const [ingredients, stocks] = await Promise.all([
    supabase.from('ingredients').select('*').eq('is_active', true).order('name'),
    supabase.from('ingredient_stock').select('ingredient_id, stock'),
  ])

  if (ingredients.error) {
    throw new Error(`Lecture des ingrédients impossible : ${ingredients.error.message}`)
  }
  if (stocks.error) {
    throw new Error(`Lecture des stocks impossible : ${stocks.error.message}`)
  }

  const stockByIngredient = new Map<string, number>(
    (stocks.data ?? []).map((row) => [
      String((row as { ingredient_id: string }).ingredient_id),
      toNumber((row as { stock: unknown }).stock),
    ])
  )

  return (ingredients.data ?? []).map((row) => {
    const ingredient = row as Record<string, unknown>
    return {
      id: String(ingredient.id),
      name: String(ingredient.name),
      base_unit: ingredient.base_unit as IngredientWithStock['base_unit'],
      pack_quantity: toNullableNumber(ingredient.pack_quantity),
      pack_price_cents: toNullableNumber(ingredient.pack_price_cents),
      price_source: (ingredient.price_source ?? null) as IngredientWithStock['price_source'],
      price_updated_at: (ingredient.price_updated_at ?? null) as string | null,
      low_stock_threshold: toNullableNumber(ingredient.low_stock_threshold),
      category: (ingredient.category ?? null) as IngredientWithStock['category'],
      is_active: Boolean(ingredient.is_active),
      created_at: String(ingredient.created_at),
      stock: stockByIngredient.get(String(ingredient.id)) ?? 0,
    }
  })
}

export async function fetchRecipes(): Promise<RecipeWithItems[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('recipes')
    .select(
      `*,
       items:recipe_items(*, ingredient:ingredients(*)),
       product:products(id, name, price)`
    )
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error(`Lecture des recettes impossible : ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const recipe = row as Record<string, unknown>
    const items = (recipe.items ?? []) as Record<string, unknown>[]

    return {
      id: String(recipe.id),
      name: String(recipe.name),
      product_id: (recipe.product_id ?? null) as string | null,
      portions: toNumber(recipe.portions),
      // La colonne arrive avec la migration 006 : avant, une recette saisie à
      // la main a toujours un rendement assumé.
      portions_confirmed: recipe.portions_confirmed === undefined
        ? true
        : Boolean(recipe.portions_confirmed),
      notes: (recipe.notes ?? null) as string | null,
      is_active: Boolean(recipe.is_active),
      created_at: String(recipe.created_at),
      product: (recipe.product ?? null) as RecipeWithItems['product'],
      missing: [],
      items: items
        .map((item) => {
          const ingredient = item.ingredient as Record<string, unknown>
          return {
            id: String(item.id),
            recipe_id: String(item.recipe_id),
            ingredient_id: String(item.ingredient_id),
            quantity: toNumber(item.quantity),
            created_at: String(item.created_at),
            ingredient: {
              id: String(ingredient.id),
              name: String(ingredient.name),
              base_unit: ingredient.base_unit as IngredientWithStock['base_unit'],
              pack_quantity: toNullableNumber(ingredient.pack_quantity),
              pack_price_cents: toNullableNumber(ingredient.pack_price_cents),
              price_source: (ingredient.price_source ??
                null) as IngredientWithStock['price_source'],
              price_updated_at: (ingredient.price_updated_at ?? null) as string | null,
              low_stock_threshold: toNullableNumber(ingredient.low_stock_threshold),
              category: (ingredient.category ?? null) as IngredientWithStock['category'],
              is_active: Boolean(ingredient.is_active),
              created_at: String(ingredient.created_at),
            },
          }
        })
        .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name, 'fr')),
    }
  })
}

/** Catalogue, pour rattacher une recette à un produit vendu. */
export async function fetchProductOptions(): Promise<Pick<Product, 'id' | 'name' | 'price'>[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, name, price')
    .order('name')

  if (error) {
    throw new Error(`Lecture du catalogue impossible : ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const product = row as Record<string, unknown>
    return {
      id: String(product.id),
      name: String(product.name),
      price: toNumber(product.price),
    }
  })
}

/** Derniers mouvements d'un ingrédient, du plus récent au plus ancien. */
export async function fetchIngredientMovements(
  ingredientId: string,
  limit = 30
): Promise<StockMovement[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('ingredient_id', ingredientId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Lecture des mouvements impossible : ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const movement = row as Record<string, unknown>
    return {
      id: String(movement.id),
      ingredient_id: String(movement.ingredient_id),
      quantity: toNumber(movement.quantity),
      type: movement.type as StockMovement['type'],
      note: (movement.note ?? null) as string | null,
      occurred_at: String(movement.occurred_at),
      created_at: String(movement.created_at),
    }
  })
}

// ─── Factures et fournisseurs ───────────────────────────────────────────────

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: String(row.id),
    name: String(row.name),
    notes: (row.notes ?? null) as string | null,
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
  }
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: String(row.id),
    supplier_id: (row.supplier_id ?? null) as string | null,
    invoice_date: (row.invoice_date ?? null) as string | null,
    invoice_number: (row.invoice_number ?? null) as string | null,
    total_cents: toNullableNumber(row.total_cents),
    image_path: (row.image_path ?? null) as string | null,
    status: row.status as Invoice['status'],
    parse_error: (row.parse_error ?? null) as string | null,
    parse_model: (row.parse_model ?? null) as string | null,
    parsed_at: (row.parsed_at ?? null) as string | null,
    validated_at: (row.validated_at ?? null) as string | null,
    created_at: String(row.created_at),
  }
}

function mapInvoiceLine(row: Record<string, unknown>): InvoiceLine {
  return {
    id: String(row.id),
    invoice_id: String(row.invoice_id),
    raw_label: String(row.raw_label),
    quantity: toNullableNumber(row.quantity),
    pack_quantity: toNullableNumber(row.pack_quantity),
    base_unit: (row.base_unit ?? null) as InvoiceLine['base_unit'],
    pack_price_cents: toNullableNumber(row.pack_price_cents),
    line_total_cents: toNullableNumber(row.line_total_cents),
    ingredient_id: (row.ingredient_id ?? null) as string | null,
    confidence: toNullableNumber(row.confidence),
    created_at: String(row.created_at),
  }
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(`Lecture des fournisseurs impossible : ${error.message}`)
  return (data ?? []).map((row) => mapSupplier(row as Record<string, unknown>))
}

export async function fetchInvoices(): Promise<(Invoice & { supplier: Supplier | null; lineCount: number })[]> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*, supplier:suppliers(*), invoice_lines(id)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Lecture des factures impossible : ${error.message}`)

  return (data ?? []).map((row) => {
    const invoice = row as Record<string, unknown>
    const supplier = invoice.supplier as Record<string, unknown> | null
    const lines = (invoice.invoice_lines ?? []) as unknown[]
    return {
      ...mapInvoice(invoice),
      supplier: supplier ? mapSupplier(supplier) : null,
      lineCount: lines.length,
    }
  })
}

export async function fetchInvoice(invoiceId: string): Promise<InvoiceWithLines | null> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*, supplier:suppliers(*), lines:invoice_lines(*)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) throw new Error(`Lecture de la facture impossible : ${error.message}`)
  if (!data) return null

  const invoice = data as Record<string, unknown>
  const supplier = invoice.supplier as Record<string, unknown> | null
  const lines = (invoice.lines ?? []) as Record<string, unknown>[]

  return {
    ...mapInvoice(invoice),
    supplier: supplier ? mapSupplier(supplier) : null,
    // Les lignes les moins sûres d'abord : c'est là que la validation humaine
    // a le plus de valeur.
    lines: lines
      .map(mapInvoiceLine)
      .sort((a, b) => (a.confidence ?? 1) - (b.confidence ?? 1)),
  }
}

/** URL signée et temporaire de la photo : le bucket est privé. */
export async function signInvoiceImage(imagePath: string): Promise<string | null> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase.storage
    .from('invoices')
    .createSignedUrl(imagePath, 60 * 10)

  if (error) return null
  return data?.signedUrl ?? null
}

/**
 * Tous les prix observés, groupés par ingrédient — matière première des
 * comparateurs. Ne renvoie que ce qui vient de factures validées, puisque
 * c'est la seule chose qui écrit dans ingredient_prices.
 */
export async function fetchPriceObservations(): Promise<Map<string, PriceObservation[]>> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ingredient_prices')
    .select('ingredient_id, supplier_id, price_per_base_unit, pack_quantity, pack_price_cents, observed_on, supplier:suppliers(name)')
    .order('observed_on', { ascending: true })

  if (error) throw new Error(`Lecture des prix impossible : ${error.message}`)

  const byIngredient = new Map<string, PriceObservation[]>()

  for (const row of data ?? []) {
    const price = row as Record<string, unknown>
    const supplier = price.supplier as { name: string } | { name: string }[] | null
    const supplierName = Array.isArray(supplier)
      ? supplier[0]?.name ?? 'Fournisseur inconnu'
      : supplier?.name ?? 'Fournisseur inconnu'

    const ingredientId = String(price.ingredient_id)
    const observations = byIngredient.get(ingredientId) ?? []
    observations.push({
      supplierId: String(price.supplier_id),
      supplierName,
      pricePerBaseUnit: toNumber(price.price_per_base_unit),
      packQuantity: toNumber(price.pack_quantity),
      packPriceCents: toNumber(price.pack_price_cents),
      observedOn: String(price.observed_on),
    })
    byIngredient.set(ingredientId, observations)
  }

  return byIngredient
}

// ─── Import de recettes par fichier ─────────────────────────────────────────

/** Vrai si la migration 006 est passée : les tables d'import existent. */
function tableAbsente(message: string): boolean {
  return message.includes('Could not find the table') || message.includes('does not exist')
}

/**
 * Lignes laissées de côté, par recette.
 *
 * Renvoie `null` — et non une map vide — quand la migration 006 n'est pas
 * appliquée : l'écran doit pouvoir dire « fonction indisponible » plutôt que
 * d'afficher des recettes faussement complètes.
 */
export async function fetchRecipeMissingItems(): Promise<Map<string, RecipeMissingItem[]> | null> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('recipe_missing_items')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    if (tableAbsente(error.message)) return null
    throw new Error(`Lecture des lignes manquantes impossible : ${error.message}`)
  }

  const byRecipe = new Map<string, RecipeMissingItem[]>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const item: RecipeMissingItem = {
      id: String(row.id),
      recipe_id: String(row.recipe_id),
      ingredient_id: (row.ingredient_id ?? null) as string | null,
      raw_label: String(row.raw_label),
      raw_quantity: (row.raw_quantity ?? null) as string | null,
      created_at: String(row.created_at),
    }
    byRecipe.set(item.recipe_id, [...(byRecipe.get(item.recipe_id) ?? []), item])
  }
  return byRecipe
}

/** Lots d'import en cours ou terminés, du plus récent au plus ancien. */
export async function fetchRecipeImports(): Promise<
  { id: string; status: string; created_at: string; fileCount: number }[] | null
> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('recipe_imports')
    .select('id, status, created_at, recipe_import_files(id)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    if (tableAbsente(error.message)) return null
    throw new Error(`Lecture des imports impossible : ${error.message}`)
  }

  return (data ?? []).map((row) => {
    const item = row as Record<string, unknown>
    return {
      id: String(item.id),
      status: String(item.status),
      created_at: String(item.created_at),
      fileCount: ((item.recipe_import_files ?? []) as unknown[]).length,
    }
  })
}

/** Un lot avec ses fichiers, son dictionnaire d'ingrédients et ses recettes. */
export async function fetchRecipeImport(importId: string): Promise<RecipeImportDetail | null> {
  await assertInterfaceAuth()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('recipe_imports')
    .select(
      `*,
       files:recipe_import_files(*),
       ingredients:recipe_import_ingredients(*),
       recipes:recipe_import_recipes(*, lines:recipe_import_lines(*), matched_recipe:recipes(id, name))`
    )
    .eq('id', importId)
    .maybeSingle()

  if (error) {
    if (tableAbsente(error.message)) return null
    throw new Error(`Lecture du lot impossible : ${error.message}`)
  }
  if (!data) return null

  const row = data as Record<string, unknown>
  const files = ((row.files ?? []) as Record<string, unknown>[])
    .map((file) => ({
      id: String(file.id),
      import_id: String(file.import_id),
      file_path: String(file.file_path),
      original_name: String(file.original_name),
      media_type: String(file.media_type),
      status: file.status as RecipeImportFile['status'],
      parse_error: (file.parse_error ?? null) as string | null,
      parsed_at: (file.parsed_at ?? null) as string | null,
      created_at: String(file.created_at),
    }))
    .sort((a, b) => a.original_name.localeCompare(b.original_name, 'fr'))

  const ingredients = ((row.ingredients ?? []) as Record<string, unknown>[])
    .map((entry) => ({
      id: String(entry.id),
      import_id: String(entry.import_id),
      raw_name: String(entry.raw_name),
      normalized_name: String(entry.normalized_name),
      base_unit: (entry.base_unit ?? null) as RecipeImportIngredient['base_unit'],
      ingredient_id: (entry.ingredient_id ?? null) as string | null,
      decision: entry.decision as RecipeImportIngredient['decision'],
      occurrences: toNumber(entry.occurrences),
      created_at: String(entry.created_at),
    }))
    .sort((a, b) => b.occurrences - a.occurrences || a.raw_name.localeCompare(b.raw_name, 'fr'))

  const recipes = ((row.recipes ?? []) as Record<string, unknown>[])
    .map((staged) => ({
      id: String(staged.id),
      import_id: String(staged.import_id),
      file_id: (staged.file_id ?? null) as string | null,
      raw_name: String(staged.raw_name),
      matched_recipe_id: (staged.matched_recipe_id ?? null) as string | null,
      portions: toNullableNumber(staged.portions),
      portions_read: Boolean(staged.portions_read),
      notes: (staged.notes ?? null) as string | null,
      confidence: toNullableNumber(staged.confidence),
      status: staged.status as RecipeImportRecipeWithLines['status'],
      created_at: String(staged.created_at),
      matched_recipe: (staged.matched_recipe ?? null) as { id: string; name: string } | null,
      lines: ((staged.lines ?? []) as Record<string, unknown>[]).map((line) => ({
        id: String(line.id),
        staged_recipe_id: String(line.staged_recipe_id),
        raw_label: String(line.raw_label),
        raw_quantity: (line.raw_quantity ?? null) as string | null,
        quantity: toNullableNumber(line.quantity),
        base_unit: (line.base_unit ?? null) as RecipeImportLine['base_unit'],
        normalized_name: String(line.normalized_name),
        ingredient_id: (line.ingredient_id ?? null) as string | null,
        confidence: toNullableNumber(line.confidence),
        created_at: String(line.created_at),
      })),
    }))
    .sort((a, b) => a.raw_name.localeCompare(b.raw_name, 'fr'))

  return {
    id: String(row.id),
    status: row.status as RecipeImportDetail['status'],
    parse_error: (row.parse_error ?? null) as string | null,
    parse_model: (row.parse_model ?? null) as string | null,
    parsed_at: (row.parsed_at ?? null) as string | null,
    validated_at: (row.validated_at ?? null) as string | null,
    created_at: String(row.created_at),
    files,
    ingredients,
    recipes,
  }
}

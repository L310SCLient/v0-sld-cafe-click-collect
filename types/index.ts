export interface Product {
  id: string
  name: string
  price: number
  category: 'viennoiseries' | 'salades' | 'sandwichs' | 'chaud' | 'desserts' | 'boissons'
  image_url: string | null
  available: boolean
  display_order: number
  created_at: string
}

export interface OrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  customer_first_name: string
  customer_last_name: string
  customer_email: string | null
  customer_phone: string | null
  items: OrderItem[]
  total_cents: number
  pickup_time: string
  status: 'pending' | 'confirmed' | 'ready' | 'picked_up'
  created_at: string
}

export interface DailySpecial {
  id: string
  product_id: string | null
  date: string
  visible_from: string
  created_at: string
  custom_name: string | null
  custom_price: number | null
  custom_image_url: string | null
  product?: Product | null
}

export interface FormuleEtape {
  id: string
  formule_id: string
  label: string
  category: string
  choix_count: number
  display_order: number
}

export interface Formule {
  id: string
  name: string
  tagline: string
  price: number // cents
  image_url: string | null
  is_active: boolean
  display_order: number
  created_at: string
  etapes?: FormuleEtape[]
}

export interface FormuleChosenProduct {
  product_id: string
  name: string
  etape_label: string
}

export interface CartItem {
  id: string
  name: string
  price: number // cents
  quantity: number
  category: string
  image_url?: string | null
  formuleId?: string // if this is a formule line
  formuleDetails?: FormuleChosenProduct[] // products chosen for each step
}

// ─── Interface cuisine : ingrédients, recettes, stock ───────────────────────

/** Unité de stockage d'un ingrédient. Les volumes sont stockés en ml. */
export type IngredientUnit = 'g' | 'ml' | 'unit'

/** Provenance du prix d'achat. `null` sur l'ingrédient = aucun prix connu. */
export type PriceSource = 'facture' | 'manuelle'

export interface Ingredient {
  id: string
  name: string
  base_unit: IngredientUnit
  /** Quantité du conditionnement, exprimée en `base_unit`. */
  pack_quantity: number | null
  pack_price_cents: number | null
  price_source: PriceSource | null
  price_updated_at: string | null
  is_active: boolean
  created_at: string
}

export interface IngredientWithStock extends Ingredient {
  /** Somme des mouvements, exprimée en `base_unit`. */
  stock: number
}

export type StockMovementType = 'inventaire' | 'reception' | 'consommation' | 'perte'

export interface StockMovement {
  id: string
  ingredient_id: string
  /** Signée : + entrée, − sortie. Pour un inventaire, c'est l'écart constaté. */
  quantity: number
  type: StockMovementType
  note: string | null
  occurred_at: string
  created_at: string
}

export interface Recipe {
  id: string
  name: string
  product_id: string | null
  portions: number
  notes: string | null
  is_active: boolean
  created_at: string
}

export interface RecipeItem {
  id: string
  recipe_id: string
  ingredient_id: string
  /** Quantité pour la recette entière (donc pour `portions` portions). */
  quantity: number
  created_at: string
}

export interface RecipeItemWithIngredient extends RecipeItem {
  ingredient: Ingredient
}

export interface RecipeWithItems extends Recipe {
  items: RecipeItemWithIngredient[]
  product: Pick<Product, 'id' | 'name' | 'price'> | null
}

// ─── Journée : production, ventes, clôture ──────────────────────────────────

export interface ProductionEntry {
  id: string
  recipe_id: string
  service_date: string
  quantity: number
  created_at: string
}

/** Activité d'une recette sur une journée. */
export interface DailyActivity {
  service_date: string
  recipe_id: string
  produced: number
  /** Ventes saisies au comptoir (+1). */
  soldManual: number
  /** Ventes issues des commandes click & collect, cumulées automatiquement. */
  soldOnline: number
  /** Surproduction enregistrée à la clôture. `null` = journée non clôturée. */
  wasted: number | null
  /** Coût figé de la surproduction. `null` = inconnu (un prix manquait). */
  wastedCostCents: number | null
}

// ─── Factures et fournisseurs ───────────────────────────────────────────────

export type IngredientCategory =
  | 'legume' | 'fruit' | 'viande' | 'poisson' | 'cremerie'
  | 'boulangerie' | 'epicerie' | 'boisson' | 'emballage' | 'autre'

export interface Supplier {
  id: string
  name: string
  notes: string | null
  is_active: boolean
  created_at: string
}

export type InvoiceStatus = 'a_lire' | 'lecture' | 'a_valider' | 'validee' | 'echec'

export interface Invoice {
  id: string
  supplier_id: string | null
  invoice_date: string | null
  invoice_number: string | null
  total_cents: number | null
  image_path: string | null
  status: InvoiceStatus
  parse_error: string | null
  parse_model: string | null
  parsed_at: string | null
  validated_at: string | null
  created_at: string
}

export interface InvoiceLine {
  id: string
  invoice_id: string
  /** Libellé tel qu'écrit sur la facture. Jamais réécrit. */
  raw_label: string
  quantity: number | null
  pack_quantity: number | null
  base_unit: IngredientUnit | null
  pack_price_cents: number | null
  line_total_cents: number | null
  ingredient_id: string | null
  /** Confiance du parsing entre 0 et 1. `null` = saisie humaine. */
  confidence: number | null
  created_at: string
}

export interface InvoiceWithLines extends Invoice {
  supplier: Supplier | null
  lines: InvoiceLine[]
}

/** Un prix observé, daté à la date de la facture. */
export interface IngredientPrice {
  id: string
  ingredient_id: string
  supplier_id: string
  invoice_line_id: string | null
  /** Centimes par unité de base, non arrondi. */
  price_per_base_unit: number
  pack_quantity: number
  pack_price_cents: number
  observed_on: string
  created_at: string
}

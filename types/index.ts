export interface Product {
  id: string
  name: string
  price: number
  category: 'viennoiseries' | 'salades' | 'sandwichs' | 'chaud' | 'desserts'
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
  formuleId?: string // if this is a formule line
  formuleDetails?: FormuleChosenProduct[] // products chosen for each step
}

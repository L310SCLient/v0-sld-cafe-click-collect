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
  product_id: string
  date: string
  visible_from: string
  created_at: string
  product?: Product
}

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
}

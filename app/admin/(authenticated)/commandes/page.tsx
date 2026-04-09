import { createClient } from '@/lib/supabase/server'
import { OrdersBoard } from '@/components/admin/orders-board'
import type { Order } from '@/types'

export default async function CommandesPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['pending', 'confirmed', 'ready', 'picked_up'])
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold mb-6">Commandes</h1>
      <OrdersBoard initialOrders={(orders as Order[]) ?? []} />
    </div>
  )
}

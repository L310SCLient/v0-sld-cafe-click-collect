import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrdersBoard } from '@/components/admin/orders-board'
import { DashboardStats } from '@/components/admin/dashboard-stats'
import type { Order } from '@/types'

export const dynamic = 'force-dynamic'

function getPeriodBoundaries(now: Date = new Date()) {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = now.getDay() // 0 = Sunday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday,
  )
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return { startOfDay, startOfWeek, startOfMonth }
}

export default async function CommandesPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { startOfDay, startOfWeek, startOfMonth } = getPeriodBoundaries()

  const [{ data: orders }, { data: statsRows }] = await Promise.all([
    supabase
      .from('orders')
      .select('*')
      .in('status', ['pending', 'confirmed', 'ready', 'picked_up'])
      .order('created_at', { ascending: false }),
    admin
      .from('orders')
      .select('total_cents, status, created_at')
      .gte('created_at', startOfMonth.toISOString()),
  ])

  const rows = (statsRows ?? []) as Array<{
    total_cents: number
    status: Order['status']
    created_at: string
  }>

  let dayRevenueCents = 0
  let weekRevenueCents = 0
  let monthRevenueCents = 0
  let dayOrderCount = 0

  for (const row of rows) {
    const createdAt = new Date(row.created_at)
    const isNonPending = row.status !== 'pending'

    if (isNonPending) {
      monthRevenueCents += row.total_cents
      if (createdAt >= startOfWeek) weekRevenueCents += row.total_cents
      if (createdAt >= startOfDay) dayRevenueCents += row.total_cents
    }

    if (createdAt >= startOfDay) dayOrderCount += 1
  }

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold mb-6">Commandes</h1>
      <DashboardStats
        dayOrderCount={dayOrderCount}
        dayRevenueCents={dayRevenueCents}
        weekRevenueCents={weekRevenueCents}
        monthRevenueCents={monthRevenueCents}
      />
      <OrdersBoard initialOrders={(orders as Order[]) ?? []} />
    </div>
  )
}

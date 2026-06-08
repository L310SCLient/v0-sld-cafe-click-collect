import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrdersBoard } from '@/components/admin/orders-board'
import { DashboardStats } from '@/components/admin/dashboard-stats'
import { CommandesHeaderActions } from '@/components/admin/commandes-header-actions'
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

function formatServiceDate(): string {
  const now = new Date()
  return now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
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

  const serviceDate = formatServiceDate()

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p
            className="mb-1 capitalize"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--espresso-60)',
              letterSpacing: '0.06em',
            }}
          >
            {serviceDate} · service midi
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '40px',
              fontWeight: 500,
              color: 'var(--espresso)',
              lineHeight: 1.1,
            }}
          >
            Commandes du jour
          </h1>
        </div>

        <CommandesHeaderActions
          pendingCount={((orders as Order[]) ?? []).filter((o) => o.status === 'pending').length}
        />
      </div>

      {/* Stats */}
      <DashboardStats
        dayOrderCount={dayOrderCount}
        dayRevenueCents={dayRevenueCents}
        weekRevenueCents={weekRevenueCents}
        monthRevenueCents={monthRevenueCents}
      />

      {/* Kanban section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 500,
              color: 'var(--espresso)',
            }}
          >
            Tableau du service
          </h2>

          {/* Filter dropdown placeholder */}
          <select
            className="px-3 py-1.5 rounded-lg appearance-none"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              backgroundColor: 'var(--creme-surface)',
              border: '1px solid var(--espresso-20)',
              color: 'var(--espresso)',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <option>Tous les statuts</option>
            <option>En attente</option>
            <option>En préparation</option>
            <option>Prête</option>
            <option>Récupérée</option>
          </select>
        </div>

        <OrdersBoard initialOrders={(orders as Order[]) ?? []} />
      </div>
    </div>
  )
}

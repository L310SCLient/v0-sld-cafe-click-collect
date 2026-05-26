interface DashboardStatsProps {
  dayOrderCount: number
  dayRevenueCents: number
  weekRevenueCents: number
  monthRevenueCents: number
}

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

interface StatCardProps {
  label: string
  value: string
  hint?: string
  change?: string
}

function StatCard({ label, value, hint, change }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--creme-surface)',
        borderRadius: '14px',
        padding: '20px 22px',
        boxShadow: 'var(--shadow-xs)',
        border: '1px solid var(--sable-soft)',
      }}
    >
      <p
        className="uppercase tracking-wider mb-2"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--espresso-60)',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </p>

      <div className="flex items-end gap-3">
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '36px',
            fontWeight: 500,
            color: 'var(--espresso)',
            lineHeight: 1,
          }}
        >
          {value}
        </p>

        {change && (
          <span
            className="mb-0.5 px-2 py-0.5 rounded-full"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              backgroundColor: '#D9DFCF',
              color: 'var(--status-ready)',
            }}
          >
            {change}
          </span>
        )}
      </div>

      {hint && (
        <p
          className="mt-1.5"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--espresso-60)',
          }}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

export function DashboardStats({
  dayOrderCount,
  dayRevenueCents,
  weekRevenueCents,
  monthRevenueCents,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Commandes aujourd'hui"
        value={dayOrderCount.toLocaleString('fr-FR')}
        hint="commandes ce service"
      />
      <StatCard
        label="Chiffre du jour"
        value={formatPriceCents(dayRevenueCents)}
        hint="hors commandes annulées"
      />
      <StatCard
        label="Chiffre de la semaine"
        value={formatPriceCents(weekRevenueCents)}
      />
      <StatCard
        label="Chiffre du mois"
        value={formatPriceCents(monthRevenueCents)}
      />
    </div>
  )
}

import { formatPrice } from '@/lib/utils'

interface DashboardStatsProps {
  dayOrderCount: number
  dayRevenueCents: number
  weekRevenueCents: number
  monthRevenueCents: number
}

export function DashboardStats({
  dayOrderCount,
  dayRevenueCents,
  weekRevenueCents,
  monthRevenueCents,
}: DashboardStatsProps) {
  const items = [
    {
      label: "Commandes aujourd'hui",
      value: dayOrderCount.toLocaleString('fr-FR'),
    },
    {
      label: 'Chiffre du jour',
      value: formatPrice(dayRevenueCents),
    },
    {
      label: 'Chiffre de la semaine',
      value: formatPrice(weekRevenueCents),
    },
    {
      label: 'Chiffre du mois',
      value: formatPrice(monthRevenueCents),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl p-5 sm:p-6 bg-[#1C1C1C] text-white border border-white/5 shadow-sm"
        >
          <p className="text-xs uppercase tracking-wider text-white/60 font-medium">
            {label}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-semibold tabular-nums text-accent">
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

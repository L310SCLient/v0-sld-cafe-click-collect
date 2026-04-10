import { Card, CardContent } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import { Euro, CalendarDays, CalendarRange, ShoppingBag } from 'lucide-react'

interface DashboardStatsProps {
  dayRevenueCents: number
  weekRevenueCents: number
  monthRevenueCents: number
  dayOrderCount: number
}

export function DashboardStats({
  dayRevenueCents,
  weekRevenueCents,
  monthRevenueCents,
  dayOrderCount,
}: DashboardStatsProps) {
  const items = [
    {
      label: 'Chiffre du jour',
      value: formatPrice(dayRevenueCents),
      Icon: Euro,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Chiffre de la semaine',
      value: formatPrice(weekRevenueCents),
      Icon: CalendarDays,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Chiffre du mois',
      value: formatPrice(monthRevenueCents),
      Icon: CalendarRange,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Commandes du jour',
      value: dayOrderCount.toLocaleString('fr-FR'),
      Icon: ShoppingBag,
      color: 'text-stone-700 bg-stone-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {items.map(({ label, value, Icon, color }) => (
        <Card key={label} className="gap-2 py-4">
          <CardContent className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              <p className="text-lg sm:text-xl font-semibold tabular-nums truncate">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

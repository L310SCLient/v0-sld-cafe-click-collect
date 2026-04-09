'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateOrderStatus } from '@/app/actions/orders'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Clock, CheckCircle, ChefHat, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'

const COLUMNS = [
  { key: 'pending' as const, label: 'En attente', icon: Clock, color: 'bg-orange-100 text-orange-800' },
  { key: 'confirmed' as const, label: 'En preparation', icon: ChefHat, color: 'bg-blue-100 text-blue-800' },
  { key: 'ready' as const, label: 'Pretes', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { key: 'picked_up' as const, label: 'Recuperees', icon: ShoppingBag, color: 'bg-stone-100 text-stone-600' },
] as const

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "A l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  return `Il y a ${diffH}h${diffMin % 60 > 0 ? `${(diffMin % 60).toString().padStart(2, '0')}` : ''}`
}

function playBeep() {
  try {
    const ctx = new AudioContext()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gain.gain.value = 0.3
    oscillator.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    oscillator.stop(ctx.currentTime + 0.5)
  } catch {
    // Audio not available
  }
}

function OrderCard({
  order,
  onAction,
}: {
  order: Order
  onAction?: { label: string; status: Order['status']; color: string }
}) {
  const [loading, setLoading] = useState(false)

  async function handleAction() {
    if (!onAction) return
    setLoading(true)
    const result = await updateOrderStatus(order.id, onAction.status)
    if (result.error) {
      toast.error(result.error)
    }
    setLoading(false)
  }

  return (
    <Card className="gap-3 py-4">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">
              {order.customer_first_name} {order.customer_last_name}
            </p>
            <p className="text-lg font-bold text-stone-600 tabular-nums">
              {order.pickup_time}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo(order.created_at)}</span>
        </div>

        <ul className="space-y-1 text-sm text-muted-foreground">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>{item.quantity}x {item.name}</span>
              <span className="tabular-nums">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between pt-1 border-t">
          <span className="font-semibold text-sm">Total</span>
          <span className="font-semibold text-sm tabular-nums">{formatPrice(order.total_cents)}</span>
        </div>

        {onAction && (
          <Button
            onClick={handleAction}
            disabled={loading}
            className={`w-full ${onAction.color}`}
            size="sm"
          >
            {loading ? '...' : onAction.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function getAction(status: Order['status']) {
  switch (status) {
    case 'pending':
      return { label: 'Confirmer', status: 'confirmed' as const, color: 'bg-orange-500 hover:bg-orange-600 text-white' }
    case 'confirmed':
      return { label: "C'est pret !", status: 'ready' as const, color: 'bg-green-600 hover:bg-green-700 text-white' }
    case 'ready':
      return { label: 'Recuperee', status: 'picked_up' as const, color: 'bg-stone-500 hover:bg-stone-600 text-white' }
    default:
      return undefined
  }
}

interface OrdersBoardProps {
  initialOrders: Order[]
}

export function OrdersBoard({ initialOrders }: OrdersBoardProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const pendingIdsRef = useRef<Set<string>>(
    new Set(initialOrders.filter((o) => o.status === 'pending').map((o) => o.id))
  )

  const handleRealtimeChange = useCallback((payload: { eventType: string; new: Order; old: { id: string } }) => {
    if (payload.eventType === 'INSERT') {
      const newOrder = payload.new as Order
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev
        return [newOrder, ...prev]
      })
      if (newOrder.status === 'pending') {
        playBeep()
        toast.info('Nouvelle commande !', {
          description: `${newOrder.customer_first_name} ${newOrder.customer_last_name} - ${newOrder.pickup_time}`,
        })
      }
    } else if (payload.eventType === 'UPDATE') {
      const updated = payload.new as Order
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      // beep if a new pending order appeared
      if (updated.status === 'pending' && !pendingIdsRef.current.has(updated.id)) {
        playBeep()
      }
    } else if (payload.eventType === 'DELETE') {
      const deleted = payload.old as { id: string }
      setOrders((prev) => prev.filter((o) => o.id !== deleted.id))
    }
  }, [])

  useEffect(() => {
    pendingIdsRef.current = new Set(orders.filter((o) => o.status === 'pending').map((o) => o.id))
  }, [orders])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => handleRealtimeChange(payload)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [handleRealtimeChange])

  // Refresh time-ago every 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  const grouped = COLUMNS.map((col) => ({
    ...col,
    orders: orders
      .filter((o) => o.status === col.key)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
  }))

  return (
    <>
      {/* Desktop: columns */}
      <div className="hidden md:grid md:grid-cols-4 gap-4">
        {grouped.map((col) => (
          <div key={col.key} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={col.color}>{col.label}</Badge>
              <span className="text-sm text-muted-foreground">{col.orders.length}</span>
            </div>
            <div className="space-y-3">
              {col.orders.map((order) => (
                <OrderCard key={order.id} order={order} onAction={getAction(order.status)} />
              ))}
              {col.orders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune commande</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="pending">
          <TabsList className="w-full">
            {grouped.map((col) => (
              <TabsTrigger key={col.key} value={col.key} className="relative flex-1 text-xs">
                {col.label}
                {col.orders.length > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">({col.orders.length})</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {grouped.map((col) => (
            <TabsContent key={col.key} value={col.key} className="space-y-3 mt-4">
              {col.orders.map((order) => (
                <OrderCard key={order.id} order={order} onAction={getAction(order.status)} />
              ))}
              {col.orders.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune commande</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  )
}

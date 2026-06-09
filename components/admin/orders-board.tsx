'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateOrderStatus } from '@/app/actions/orders'
import { timeAgo } from '@/lib/utils'
import type { Order } from '@/types'
import { Printer } from 'lucide-react'
import { toast } from 'sonner'
import { createPortal } from 'react-dom'
import { PrintableTicket, triggerPrint } from '@/components/printable-ticket'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function shortOrderNumber(id: string): string {
  return `#${(parseInt(id.replace(/-/g, '').slice(0, 8), 16) % 10000)}`
}

// ─── audio ──────────────────────────────────────────────────────────────────

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

// ─── column config ───────────────────────────────────────────────────────────

const COLUMNS = [
  {
    key: 'pending' as const,
    label: 'En attente',
    dotColor: 'var(--status-pending)',
  },
  {
    key: 'confirmed' as const,
    label: 'En préparation',
    dotColor: 'var(--status-preparing)',
  },
  {
    key: 'ready' as const,
    label: 'Prête',
    dotColor: 'var(--status-ready)',
  },
  {
    key: 'picked_up' as const,
    label: 'Récupérée',
    dotColor: 'var(--status-picked)',
  },
] as const

// ─── action map ──────────────────────────────────────────────────────────────

function getAction(status: Order['status']): {
  label: string
  nextStatus: Order['status']
  variant: 'primary' | 'secondary'
} | null {
  switch (status) {
    case 'pending':
      return { label: 'Accepter', nextStatus: 'confirmed', variant: 'primary' }
    case 'confirmed':
      return { label: 'Marquer prête', nextStatus: 'ready', variant: 'primary' }
    case 'ready':
      return { label: 'Récupérée', nextStatus: 'picked_up', variant: 'secondary' }
    default:
      return null
  }
}

// ─── KanbanCard ──────────────────────────────────────────────────────────────

function KanbanCard({ order, isNew }: { order: Order; isNew: boolean }) {
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const action = getAction(order.status)
  const showPrint = order.status === 'ready' || order.status === 'picked_up'
  const isArchived = order.status === 'picked_up'

  async function handleAction() {
    if (!action) return
    setLoading(true)
    const result = await updateOrderStatus(order.id, action.nextStatus)
    if (result.error) toast.error(result.error)
    setLoading(false)
  }

  function handlePrint() {
    setPrinting(true)
    requestAnimationFrame(() => {
      triggerPrint()
      setTimeout(() => setPrinting(false), 500)
    })
  }

  return (
    <div
      className="relative"
      style={{
        backgroundColor: 'var(--creme-surface)',
        borderRadius: '12px',
        padding: '14px',
        boxShadow: 'var(--shadow-xs)',
        border: '1px solid var(--sable-soft)',
      }}
    >
      {/* New order pulse dot */}
      {isNew && (
        <span
          className="sld-pulse-dot absolute top-3 right-3"
          aria-label="Nouvelle commande"
        />
      )}

      {/* Header: order number + time ago */}
      <div className="flex items-center justify-between mb-2">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--terracotta)',
          }}
        >
          {shortOrderNumber(order.id)}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--espresso-60)',
          }}
        >
          {timeAgo(order.created_at)}
        </span>
      </div>

      {/* Customer name */}
      <p
        className="mb-0.5"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '17px',
          fontWeight: 500,
          color: 'var(--espresso)',
          lineHeight: 1.25,
        }}
      >
        {order.customer_first_name} {order.customer_last_name}
      </p>

      {/* Pickup time */}
      <p
        className="mb-3"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--espresso-60)',
        }}
      >
        Retrait à {order.pickup_time}
      </p>

      {/* Items */}
      <ul className="space-y-1 mb-3">
        {order.items.map((item, i) => (
          <li
            key={i}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--espresso-80)',
            }}
          >
            <span style={{ color: 'var(--terracotta)', fontWeight: 500 }}>
              {item.quantity}×
            </span>{' '}
            {item.name}
          </li>
        ))}
      </ul>

      {/* Footer: price + actions */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid var(--espresso-08)' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '17px',
            fontWeight: 500,
            color: 'var(--espresso)',
          }}
        >
          {formatPriceCents(order.total_cents)}
        </span>

        <div className="flex items-center gap-2">
          {/* Print button for ready/picked_up */}
          {showPrint && (
            <button
              onClick={handlePrint}
              title="Imprimer le ticket"
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--argile)',
                color: 'var(--espresso-60)',
                border: '1px solid var(--espresso-20)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile-deep)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile)'
              }}
            >
              <Printer className="h-4 w-4" />
            </button>
          )}

          {/* Status action button — always visible, bigger touch target */}
          {action && !isArchived && (
            <button
              onClick={handleAction}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 min-h-[40px] active:opacity-80"
              style={
                action.variant === 'primary'
                  ? {
                      backgroundColor: 'var(--terracotta)',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                    }
                  : {
                      backgroundColor: 'var(--argile)',
                      color: 'var(--espresso)',
                      border: '1px solid var(--espresso-20)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                    }
              }
              onMouseEnter={(e) => {
                if (action.variant === 'primary') {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta-hover)'
                } else {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile-deep)'
                }
              }}
              onMouseLeave={(e) => {
                if (action.variant === 'primary') {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta)'
                } else {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile)'
                }
              }}
            >
              {loading ? '…' : action.label}
            </button>
          )}

          {/* Archived badge */}
          {isArchived && (
            <span
              className="px-2.5 py-1 rounded-full text-xs"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                backgroundColor: 'var(--espresso-08)',
                color: 'var(--status-picked)',
              }}
            >
              archivée
            </span>
          )}
        </div>
      </div>

      {/* Print ticket portal */}
      {printing && createPortal(<PrintableTicket order={order} />, document.body)}
    </div>
  )
}

// ─── Column header ────────────────────────────────────────────────────────────

function ColumnHeader({
  label,
  dotColor,
  count,
}: {
  label: string
  dotColor: string
  count: number
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span
        className="inline-block rounded-full shrink-0"
        style={{ width: '8px', height: '8px', backgroundColor: dotColor }}
      />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--espresso)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--espresso-60)',
          marginLeft: '2px',
        }}
      >
        {count}
      </span>
    </div>
  )
}

// ─── OrdersBoard ─────────────────────────────────────────────────────────────

interface OrdersBoardProps {
  initialOrders: Order[]
}

export function OrdersBoard({ initialOrders }: OrdersBoardProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const pendingIdsRef = useRef<Set<string>>(
    new Set(initialOrders.filter((o) => o.status === 'pending').map((o) => o.id))
  )

  const handleRealtimeChange = useCallback(
    (payload: { eventType: string; new: Order; old: { id: string } }) => {
      if (payload.eventType === 'INSERT') {
        const newOrder = payload.new as Order
        setOrders((prev) => {
          if (prev.some((o) => o.id === newOrder.id)) return prev
          return [newOrder, ...prev]
        })
        if (newOrder.status === 'pending') {
          playBeep()
          setNewOrderIds((prev) => new Set([...prev, newOrder.id]))
          toast.info('Nouvelle commande !', {
            description: `${newOrder.customer_first_name} ${newOrder.customer_last_name} — ${newOrder.pickup_time}`,
          })
          // Remove pulse after 30s
          setTimeout(() => {
            setNewOrderIds((prev) => {
              const next = new Set(prev)
              next.delete(newOrder.id)
              return next
            })
          }, 30_000)
        }
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new as Order
        setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
        if (updated.status === 'pending' && !pendingIdsRef.current.has(updated.id)) {
          playBeep()
        }
      } else if (payload.eventType === 'DELETE') {
        const deleted = payload.old as { id: string }
        setOrders((prev) => prev.filter((o) => o.id !== deleted.id))
      }
    },
    []
  )

  useEffect(() => {
    pendingIdsRef.current = new Set(
      orders.filter((o) => o.status === 'pending').map((o) => o.id)
    )
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
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  const [activeTab, setActiveTab] = useState<string>('pending')

  const grouped = COLUMNS.map((col) => ({
    ...col,
    orders: orders
      .filter((o) => o.status === col.key)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
  }))

  return (
    <>
      {/* Desktop/Tablet landscape: 4-column Kanban; Tablet portrait: horizontal snap scroll */}
      <div className="hidden md:grid md:grid-cols-4 gap-4 lg:gap-5">
        {grouped.map((col) => (
          <div key={col.key}>
            <ColumnHeader
              label={col.label}
              dotColor={col.dotColor}
              count={col.orders.length}
            />
            <div className="space-y-3">
              {col.orders.map((order) => (
                <KanbanCard
                  key={order.id}
                  order={order}
                  isNew={newOrderIds.has(order.id)}
                />
              ))}
              {/* Empty state: no card, no price leakage — just empty space */}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: tabs */}
      <div className="md:hidden">
        {/* Tab bar */}
        <div
          className="flex rounded-xl p-1 mb-4 gap-1"
          style={{ backgroundColor: 'var(--argile)' }}
        >
          {grouped.map((col) => {
            const isActive = activeTab === col.key
            return (
              <button
                key={col.key}
                onClick={() => setActiveTab(col.key)}
                className="flex-1 py-2 rounded-lg text-center transition-colors relative"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? 'var(--creme-surface)' : 'transparent',
                  color: isActive ? 'var(--espresso)' : 'var(--espresso-60)',
                  boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {col.label}
                {col.orders.length > 0 && (
                  <span
                    className="ml-1"
                    style={{ color: isActive ? 'var(--terracotta)' : 'var(--espresso-40)' }}
                  >
                    {col.orders.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Active tab content */}
        {grouped
          .filter((col) => col.key === activeTab)
          .map((col) => (
            <div key={col.key} className="space-y-3">
              {col.orders.map((order) => (
                <KanbanCard
                  key={order.id}
                  order={order}
                  isNew={newOrderIds.has(order.id)}
                />
              ))}
              {col.orders.length === 0 && (
                <p
                  className="py-12 text-center"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--espresso-40)',
                  }}
                >
                  Aucune commande
                </p>
              )}
            </div>
          ))}
      </div>
    </>
  )
}

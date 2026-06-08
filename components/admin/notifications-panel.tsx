'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { timeAgo } from '@/lib/utils'
import type { Order } from '@/types'

function shortOrderNumber(id: string): string {
  return `#${(parseInt(id.replace(/-/g, '').slice(0, 8), 16) % 10000)}`
}

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'En attente',
  confirmed: 'En préparation',
  ready: 'Prête',
  picked_up: 'Récupérée',
}

const STATUS_COLORS: Record<Order['status'], string> = {
  pending: 'var(--status-pending)',
  confirmed: 'var(--status-preparing)',
  ready: 'var(--status-ready)',
  picked_up: 'var(--status-picked)',
}

interface NotificationsPanelProps {
  initialPendingCount: number
}

export function NotificationsPanel({ initialPendingCount }: NotificationsPanelProps) {
  const [open, setOpen] = useState(false)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [pendingCount, setPendingCount] = useState(initialPendingCount)
  const [loaded, setLoaded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchRecent = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) {
      setRecentOrders(data as Order[])
      setPendingCount((data as Order[]).filter((o) => o.status === 'pending').length)
    }
    setLoaded(true)
  }, [])

  // Subscribe to realtime to keep badge + list fresh
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notif-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { fetchRecent() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchRecent])

  // Fetch when panel opens for the first time
  useEffect(() => {
    if (open && !loaded) {
      fetchRecent()
    }
  }, [open, loaded, fetchRecent])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Refresh time-ago every 30s when open
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [open])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors relative"
        style={{
          backgroundColor: 'var(--creme-surface)',
          border: '1px solid var(--sable-soft)',
          boxShadow: 'var(--shadow-xs)',
          color: 'var(--espresso-60)',
        }}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {pendingCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full"
            style={{
              width: '18px',
              height: '18px',
              backgroundColor: 'var(--terracotta)',
              color: '#fff',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50"
          style={{
            width: '360px',
            maxHeight: '420px',
            overflowY: 'auto',
            backgroundColor: 'var(--creme-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--sable-soft)',
            boxShadow: '0 12px 36px rgba(30,18,8,0.18)',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 sticky top-0"
            style={{
              backgroundColor: 'var(--creme-surface)',
              borderBottom: '1px solid var(--espresso-08)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--espresso-60)',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
              }}
            >
              Dernières commandes
            </p>
          </div>

          {/* List */}
          {!loaded ? (
            <div className="px-4 py-8 text-center">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--espresso-40)' }}>
                Chargement…
              </span>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--espresso-40)' }}>
                Aucune commande récente
              </span>
            </div>
          ) : (
            <div>
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="px-4 py-3 transition-colors hover:bg-[var(--argile)] cursor-default"
                  style={{ borderBottom: '1px solid var(--espresso-08)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--terracotta)',
                        }}
                      >
                        {shortOrderNumber(order.id)}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded-full"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[order.status]} 20%, transparent)`,
                          color: STATUS_COLORS[order.status],
                        }}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--espresso-40)',
                      }}
                    >
                      {timeAgo(order.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: '13px',
                        color: 'var(--espresso)',
                        fontWeight: 500,
                      }}
                    >
                      {order.customer_first_name} {order.customer_last_name}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--espresso-60)',
                      }}
                    >
                      {formatPriceCents(order.total_cents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

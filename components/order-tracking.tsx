"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, Clock, ChefHat, PartyPopper, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import type { Order } from "@/types"

interface OrderTrackingProps {
  order: Order
}

const statusSteps = [
  { key: "received", label: "Commande recue", icon: Check },
  { key: "preparing", label: "En preparation", icon: ChefHat },
  { key: "ready", label: "Prete !", icon: PartyPopper },
] as const

function stepStateFor(
  status: Order["status"],
  stepIndex: number,
): "done" | "active" | "pending" {
  // Step 0: Commande recue — always done
  // Step 1: En preparation — active when confirmed or ready
  // Step 2: Prete — active when ready
  if (stepIndex === 0) return "done"
  if (stepIndex === 1) {
    if (status === "confirmed") return "active"
    if (status === "ready" || status === "picked_up") return "done"
    return "pending"
  }
  if (stepIndex === 2) {
    if (status === "ready") return "active"
    if (status === "picked_up") return "done"
    return "pending"
  }
  return "pending"
}

function fireConfetti() {
  // Multi-burst celebration
  const defaults = { spread: 80, ticks: 200, gravity: 0.9, decay: 0.94 }

  confetti({
    ...defaults,
    particleCount: 120,
    origin: { y: 0.6, x: 0.5 },
  })

  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      angle: 60,
      origin: { y: 0.7, x: 0 },
    })
  }, 200)

  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 80,
      angle: 120,
      origin: { y: 0.7, x: 1 },
    })
  }, 400)
}

export function OrderTracking({ order: initialOrder }: OrderTrackingProps) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [showReadyOverlay, setShowReadyOverlay] = useState(
    initialOrder.status === "ready",
  )
  const [celebrated, setCelebrated] = useState(false)

  const celebrate = useCallback(() => {
    if (celebrated) return
    setCelebrated(true)
    fireConfetti()
  }, [celebrated])

  // Fire confetti + overlay when order becomes ready
  useEffect(() => {
    if (order.status === "ready") {
      setShowReadyOverlay(true)
      celebrate()
    }
  }, [order.status, celebrate])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder((prev) => ({ ...prev, ...payload.new } as Order))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order.id])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground">
          Suivi de commande
        </h1>
        <p className="text-sm text-muted-foreground">
          Commande #{order.id.slice(0, 8)}
        </p>
      </div>

      {/* Status timeline */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start justify-between gap-2">
          {statusSteps.map((step, i) => {
            const StepIcon = step.icon
            const state = stepStateFor(order.status, i)
            const isLast = i === statusSteps.length - 1

            return (
              <div
                key={step.key}
                className="flex-1 flex flex-col items-center min-w-0"
              >
                <div className="flex items-center w-full">
                  {i > 0 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 transition-colors duration-500",
                        state !== "pending" ? "bg-accent" : "bg-border",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-500 shrink-0",
                      state === "done" &&
                        "bg-accent border-accent text-accent-foreground",
                      state === "active" &&
                        "bg-accent border-accent text-accent-foreground animate-pulse",
                      state === "pending" &&
                        "bg-background border-border text-muted-foreground",
                    )}
                  >
                    <StepIcon className="h-5 w-5" />
                    {state === "active" && (
                      <span className="absolute inset-0 rounded-full border-2 border-accent animate-ping" />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 transition-colors duration-500",
                        stepStateFor(order.status, i + 1) !== "pending"
                          ? "bg-accent"
                          : "bg-border",
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-3 text-xs sm:text-sm font-medium text-center transition-colors",
                    state === "active"
                      ? "text-accent"
                      : state === "done"
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pickup time */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-accent/10">
            <Clock className="h-6 w-6 text-accent" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Creneau de retrait</p>
            <p className="text-2xl font-serif font-semibold text-foreground tabular-nums">
              {order.pickup_time}
            </p>
          </div>
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-medium text-foreground">Details de la commande</h3>
        <div className="space-y-2">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {item.quantity}x {item.name}
              </span>
              <span className="text-foreground tabular-nums">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-border flex justify-between">
          <span className="font-medium text-foreground">Total</span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatPrice(order.total_cents)}
          </span>
        </div>
      </div>

      {/* Customer info */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-2">
        <h3 className="font-medium text-foreground">Informations client</h3>
        <p className="text-sm text-muted-foreground">
          {order.customer_first_name} {order.customer_last_name}
        </p>
        {order.customer_email && (
          <p className="text-sm text-muted-foreground">{order.customer_email}</p>
        )}
        {order.customer_phone && (
          <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
        )}
      </div>

      {/* Fullscreen "ready" overlay */}
      {showReadyOverlay && order.status === "ready" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-green-500/95 via-emerald-500/95 to-green-600/95 backdrop-blur-sm animate-in fade-in duration-500"
          role="dialog"
          aria-modal="true"
          aria-label="Commande prete"
        >
          <button
            type="button"
            onClick={() => setShowReadyOverlay(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center px-6 max-w-lg">
            <div className="text-7xl sm:text-8xl mb-4 animate-bounce">
              &#127881;
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white animate-pulse">
              Votre commande est prete !
            </h2>
            <p className="mt-6 text-lg sm:text-xl text-white/95">
              Venez recuperer votre commande au comptoir
            </p>
            <div className="mt-8 inline-block bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/30">
              <p className="text-sm text-white/80 uppercase tracking-wider">
                Creneau
              </p>
              <p className="text-2xl font-serif font-bold text-white tabular-nums">
                {order.pickup_time}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

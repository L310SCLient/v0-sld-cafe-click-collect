"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, Clock, ChefHat, PartyPopper } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice } from "@/lib/utils"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import type { Order } from "@/types"

interface OrderTrackingProps {
  order: Order
}

const statusSteps = [
  { key: "pending", label: "Commande recue", icon: Check },
  { key: "confirmed", label: "En preparation", icon: ChefHat },
  { key: "ready", label: "Prete !", icon: PartyPopper },
] as const

const statusIndex: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  ready: 2,
  picked_up: 2,
}

export function OrderTracking({ order: initialOrder }: OrderTrackingProps) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [celebrated, setCelebrated] = useState(false)

  const currentStep = statusIndex[order.status] ?? 0

  const celebrate = useCallback(() => {
    if (celebrated) return
    setCelebrated(true)
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    })
  }, [celebrated])

  // Fire confetti when status becomes ready
  useEffect(() => {
    if (order.status === "ready") {
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
        }
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

      {/* Celebration overlay */}
      {order.status === "ready" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-2">
          <PartyPopper className="h-10 w-10 text-green-600 mx-auto" />
          <h2 className="font-serif text-xl font-semibold text-green-800">
            Votre commande est prete !
          </h2>
          <p className="text-sm text-green-700">
            Presentez-vous au comptoir pour la recuperer.
          </p>
        </div>
      )}

      {/* Status timeline */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between">
          {statusSteps.map((step, i) => {
            const StepIcon = step.icon
            const isCompleted = i <= currentStep
            const isCurrent = i === currentStep
            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {i > 0 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 transition-colors",
                        i <= currentStep ? "bg-accent" : "bg-border"
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors shrink-0",
                      isCompleted
                        ? "bg-accent border-accent text-accent-foreground"
                        : "bg-background border-border text-muted-foreground"
                    )}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 transition-colors",
                        i < currentStep ? "bg-accent" : "bg-border"
                      )}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center",
                    isCurrent ? "text-accent" : isCompleted ? "text-foreground" : "text-muted-foreground"
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
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-secondary">
            <Clock className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Creneau de retrait</p>
            <p className="font-medium text-foreground">{order.pickup_time}</p>
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
              <span className="text-foreground">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-border flex justify-between">
          <span className="font-medium text-foreground">Total</span>
          <span className="font-semibold text-foreground">
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
    </div>
  )
}

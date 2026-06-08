"use client"

import { useState, useEffect, useCallback } from "react"
import { X, MapPin, Check, ChefHat, Package, Printer } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatPrice, cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import type { Order } from "@/types"
import { toast } from "sonner"
import { createPortal } from "react-dom"
import { PrintableTicket, triggerPrint } from "@/components/printable-ticket"

interface OrderTrackingProps {
  order: Order
}

// Génère un numéro court lisible à partir du UUID
function shortOrderNumber(id: string): number {
  return parseInt(id.replace(/-/g, "").slice(0, 8), 16) % 10000
}

// Formatte la date de commande en français
function formatOrderDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

// Calcule les minutes restantes jusqu'au créneau
function minutesUntilPickup(pickupTime: string): number | null {
  const [h, m] = pickupTime.split(":").map(Number)
  if (isNaN(h) || isNaN(m)) return null
  const now = new Date()
  const pickup = new Date(now)
  pickup.setHours(h, m, 0, 0)
  const diff = Math.round((pickup.getTime() - now.getTime()) / 60_000)
  return diff
}

// Message selon le statut
function statusMessage(status: Order["status"], firstName: string): string {
  switch (status) {
    case "pending":
      return `Votre commande est bien reçue, ${firstName}. L'équipe va la prendre en charge très vite.`
    case "confirmed":
      return "C'est parti ! Nos baristas sont déjà à l'œuvre."
    case "ready":
      return `Tout est prêt. Rendez-vous au comptoir, ${firstName} !`
    case "picked_up":
      return "Merci pour votre visite. À très vite !"
    default:
      return ""
  }
}

// Badge couleur selon statut
function StatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { label: string; color: string }> = {
    pending: { label: "En attente", color: "var(--status-pending)" },
    confirmed: { label: "En préparation", color: "var(--status-preparing)" },
    ready: { label: "Prête !", color: "var(--status-ready)" },
    picked_up: { label: "Récupérée", color: "var(--status-picked)" },
  }
  const { label, color } = map[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1"
      style={{
        backgroundColor: color + "22",
        color,
        borderRadius: "var(--radius-pill)",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        border: `1px solid ${color}44`,
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}

// Stepper horizontal 3 étapes
function StepperCard({ status }: { status: Order["status"] }) {
  const steps = [
    { key: "received", label: "Commande reçue", icon: Check },
    { key: "preparing", label: "En préparation", icon: ChefHat },
    { key: "ready", label: "Prête à récupérer", icon: Package },
  ] as const

  function stateFor(idx: number): "done" | "current" | "future" {
    if (status === "pending") {
      if (idx === 0) return "current"
      return "future"
    }
    if (status === "confirmed") {
      if (idx === 0) return "done"
      if (idx === 1) return "current"
      return "future"
    }
    if (status === "ready" || status === "picked_up") {
      return "done"
    }
    return "future"
  }

  return (
    <div
      className="p-6"
      style={{
        backgroundColor: "var(--creme-surface)",
        borderRadius: "14px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex items-start">
        {steps.map((step, i) => {
          const state = stateFor(i)
          const Icon = step.icon
          const isLast = i === steps.length - 1

          return (
            <div key={step.key} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                {/* Marqueur cercle */}
                <div
                  className="flex items-center justify-center w-[26px] h-[26px] rounded-full shrink-0 transition-all duration-500"
                  style={{
                    backgroundColor:
                      state === "done" || state === "current"
                        ? "var(--terracotta)"
                        : "var(--creme-surface)",
                    border:
                      state === "future"
                        ? "1.5px solid var(--sable)"
                        : "none",
                    color:
                      state === "done" || state === "current"
                        ? "var(--creme-surface)"
                        : "var(--espresso-40)",
                    boxShadow:
                      state === "current"
                        ? "0 0 0 6px rgba(168, 90, 46, 0.14)"
                        : "none",
                  }}
                >
                  {state === "done" ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </div>

                {/* Label */}
                <p
                  className="mt-2 text-center"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "11px",
                    fontWeight: state === "current" ? 500 : 400,
                    color:
                      state === "done"
                        ? "var(--espresso)"
                        : state === "current"
                        ? "var(--terracotta)"
                        : "var(--espresso-40)",
                    maxWidth: "80px",
                    lineHeight: 1.3,
                  }}
                >
                  {step.label}
                </p>
              </div>

              {/* Ligne de connexion */}
              {!isLast && (
                <div
                  className="flex-1 h-px mt-[13px] mx-2 transition-colors duration-500"
                  style={{
                    backgroundColor:
                      stateFor(i + 1) !== "future"
                        ? "var(--terracotta)"
                        : "var(--espresso-20)",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Carte créneau de retrait (fond espresso)
function PickupCard({ pickupTime }: { pickupTime: string }) {
  const mins = minutesUntilPickup(pickupTime)

  return (
    <div
      className="p-6"
      style={{
        backgroundColor: "var(--espresso)",
        borderRadius: "14px",
        boxShadow: "inset 0 0 0 1px var(--sable-soft)",
      }}
    >
      <p
        className="mb-1"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--sable)",
        }}
      >
        Retrait prévu
      </p>

      {/* Heure en Playfair 88px desktop / 36px mobile, italique, couleur sable */}
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(36px, 8vw, 88px)",
          fontWeight: 400,
          fontStyle: "italic",
          color: "var(--sable)",
          lineHeight: 1,
        }}
      >
        {pickupTime}
      </p>

      <p
        className="mt-2"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          color: "var(--sable)",
          opacity: 0.7,
        }}
      >
        aujourd'hui
        {mins !== null && mins > 0 && ` · dans ${mins} min`}
        {mins !== null && mins <= 0 && " · c'est l'heure !"}
      </p>

      <div
        className="flex items-center gap-2 mt-4 pt-4"
        style={{ borderTop: "1px solid rgba(201, 166, 107, 0.2)" }}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--sable)" }} />
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--sable)",
            opacity: 0.7,
          }}
        >
          Au comptoir · SLD Café
        </p>
      </div>
    </div>
  )
}

// Carte détails de commande
function OrderDetailsCard({ order }: { order: Order }) {
  return (
    <div
      className="p-6 space-y-4"
      style={{
        backgroundColor: "var(--creme-surface)",
        borderRadius: "14px",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--espresso-60)",
        }}
      >
        Détails de la commande
      </p>

      <div className="space-y-2">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "14px",
                color: "var(--espresso-80)",
              }}
            >
              {item.quantity}× {item.name}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                color: "var(--espresso)",
              }}
            >
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid var(--espresso-08)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "15px",
            fontWeight: 500,
            color: "var(--espresso)",
          }}
        >
          Total
        </span>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            fontWeight: 500,
            color: "var(--espresso)",
          }}
        >
          {formatPrice(order.total_cents)}
        </span>
      </div>

      {/* Informations client */}
      <div
        className="pt-4 space-y-1"
        style={{ borderTop: "1px solid var(--espresso-08)" }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--espresso-60)",
          }}
        >
          Client
        </p>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "18px",
            fontWeight: 500,
            color: "var(--espresso)",
          }}
        >
          {order.customer_first_name} {order.customer_last_name}
        </p>
        {order.customer_phone && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--espresso-60)",
            }}
          >
            {order.customer_phone}
          </p>
        )}
        {order.customer_email && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--espresso-60)",
            }}
          >
            {order.customer_email}
          </p>
        )}
      </div>
    </div>
  )
}

// Confetti canvas-confetti
function fireConfetti() {
  const defaults = { spread: 80, ticks: 200, gravity: 0.9, decay: 0.94 }
  confetti({ ...defaults, particleCount: 120, origin: { y: 0.6, x: 0.5 } })
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 80, angle: 60, origin: { y: 0.7, x: 0 } })
  }, 200)
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 80, angle: 120, origin: { y: 0.7, x: 1 } })
  }, 400)
}

// Overlay plein écran "C'est prêt !"
function ReadyOverlay({
  order,
  onClose,
}: {
  order: Order
  onClose: () => void
}) {
  const orderNum = shortOrderNumber(order.id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Commande prête"
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, #C9842B 0%, #A85A2E 35%, #241E1A 100%)",
      }}
    >
      {/* Bouton fermer */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full transition-opacity hover:opacity-70"
        style={{
          backgroundColor: "rgba(255,255,255,0.12)",
          color: "var(--creme-surface)",
        }}
        aria-label="Fermer"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Diamants décoratifs en CSS sable */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {[
          { size: 18, top: "8%", left: "12%", rot: 45, opacity: 0.35 },
          { size: 12, top: "15%", left: "78%", rot: 45, opacity: 0.25 },
          { size: 22, top: "70%", left: "6%", rot: 45, opacity: 0.2 },
          { size: 10, top: "75%", left: "88%", rot: 45, opacity: 0.3 },
          { size: 16, top: "40%", left: "92%", rot: 45, opacity: 0.2 },
          { size: 8, top: "55%", left: "4%", rot: 45, opacity: 0.25 },
          { size: 14, top: "88%", left: "55%", rot: 45, opacity: 0.2 },
          { size: 20, top: "20%", left: "45%", rot: 45, opacity: 0.15 },
        ].map((d, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              width: d.size,
              height: d.size,
              top: d.top,
              left: d.left,
              transform: `rotate(${d.rot}deg)`,
              backgroundColor: "var(--sable)",
              opacity: d.opacity,
            }}
          />
        ))}
      </div>

      {/* Contenu central */}
      <div className="relative text-center px-6 max-w-3xl">
        {/* Titre principal */}
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(48px, 10vw, 128px)",
            fontWeight: 500,
            color: "var(--creme-surface)",
            lineHeight: 1.05,
          }}
        >
          C'est prêt,{" "}
          <span style={{ color: "var(--sable)", fontStyle: "italic" }}>
            {order.customer_first_name}
          </span>{" "}
          <span style={{ color: "var(--sable)" }}>!</span>
        </h2>

        {/* Sous-titre */}
        <p
          className="mt-4"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "clamp(15px, 2vw, 20px)",
            color: "rgba(252, 250, 244, 0.75)",
          }}
        >
          Venez récupérer votre commande au comptoir
        </p>

        {/* Pills numéro de commande + créneau */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <span
            className="px-4 py-2"
            style={{
              backgroundColor: "rgba(252, 250, 244, 0.12)",
              border: "1px solid rgba(201, 166, 107, 0.4)",
              borderRadius: "var(--radius-pill)",
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              color: "var(--sable)",
            }}
          >
            #{orderNum}
          </span>
          <span
            className="px-4 py-2"
            style={{
              backgroundColor: "rgba(252, 250, 244, 0.12)",
              border: "1px solid rgba(201, 166, 107, 0.4)",
              borderRadius: "var(--radius-pill)",
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              color: "var(--sable)",
            }}
          >
            {order.pickup_time}
          </span>
        </div>
      </div>
    </div>
  )
}

export function OrderTracking({ order: initialOrder }: OrderTrackingProps) {
  const [order, setOrder] = useState<Order>(initialOrder)
  const [showReadyOverlay, setShowReadyOverlay] = useState(
    initialOrder.status === "ready"
  )
  const [celebrated, setCelebrated] = useState(false)

  const celebrate = useCallback(() => {
    if (celebrated) return
    setCelebrated(true)
    fireConfetti()
  }, [celebrated])

  // Déclenche confetti + overlay quand la commande passe à "ready"
  useEffect(() => {
    if (order.status === "ready") {
      setShowReadyOverlay(true)
      celebrate()
    }
  }, [order.status, celebrate])

  // Abonnement Supabase Realtime — exactement préservé
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

  const [printing, setPrinting] = useState(false)
  const orderNum = shortOrderNumber(order.id)
  const isPickedUp = order.status === "picked_up"

  function handlePrint() {
    setPrinting(true)
    requestAnimationFrame(() => {
      triggerPrint()
      setTimeout(() => setPrinting(false), 500)
    })
  }

  return (
    <>
      <div className="space-y-6">
        {/* ── En-tête ── */}
        <div>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--espresso-60)",
              marginBottom: "8px",
            }}
          >
            Votre commande · {formatOrderDate(order.created_at)}
          </p>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 6vw, 64px)",
              fontWeight: 500,
              color: "var(--espresso)",
              lineHeight: 1.05,
            }}
          >
            Commande{" "}
            <span style={{ color: "var(--terracotta)" }}>#{orderNum}</span>
          </h1>

          <p
            className="mt-3 mb-4"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              fontStyle: "italic",
              color: "var(--espresso-60)",
              maxWidth: "540px",
            }}
          >
            {statusMessage(order.status, order.customer_first_name)}
          </p>

          <StatusBadge status={order.status} />
        </div>

        {/* ── Stepper ── */}
        <StepperCard status={order.status} />

        {/* ── Créneau de retrait ── */}
        <PickupCard pickupTime={order.pickup_time} />

        {/* ── Détails commande ── */}
        <OrderDetailsCard order={order} />

        {/* ── Bouton "Imprimer le ticket" pour les commandes récupérées ── */}
        {isPickedUp && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-3 rounded-full transition-opacity hover:opacity-70"
            style={{
              backgroundColor: "var(--argile)",
              color: "var(--espresso)",
              border: "1px solid var(--espresso-20)",
              fontFamily: "var(--font-sans)",
              fontSize: "14px",
            }}
          >
            <Printer className="h-4 w-4" />
            Imprimer le ticket
          </button>
        )}
      </div>

      {/* ── Overlay "C'est prêt !" ── */}
      {showReadyOverlay && order.status === "ready" && (
        <ReadyOverlay order={order} onClose={() => setShowReadyOverlay(false)} />
      )}

      {/* Print ticket portal */}
      {printing && createPortal(<PrintableTicket order={order} />, document.body)}
    </>
  )
}

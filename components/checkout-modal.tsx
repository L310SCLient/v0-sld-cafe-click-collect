"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Clock, User, ClipboardList } from "lucide-react"
import { useCart } from "./cart-provider"
import { createOrder } from "@/app/actions/orders"
import { formatPrice, getTimeSlots } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { OrderItem } from "@/types"

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const timeSlots = getTimeSlots("09:30", "19:00", 5)

const steps = [
  { label: "Informations", icon: User },
  { label: "Creneau", icon: Clock },
  { label: "Confirmation", icon: ClipboardList },
]

export function CheckoutModal({ open, onOpenChange }: CheckoutModalProps) {
  const router = useRouter()
  const { items, totalPrice, clearCart, setIsCartOpen } = useCart()
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [timeSlot, setTimeSlot] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  const resetForm = () => {
    setStep(0)
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setTimeSlot("")
    setError("")
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(resetForm, 300)
  }

  const handleStepOneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    setStep(1)
  }

  const handleStepTwoSubmit = () => {
    if (!timeSlot) return
    setStep(2)
  }

  const handleConfirm = async () => {
    setIsProcessing(true)
    setError("")

    const orderItems: OrderItem[] = items.map((item) => ({
      product_id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }))

    const result = await createOrder({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      items: orderItems,
      totalCents: totalPrice,
      pickupTime: timeSlot,
    })

    setIsProcessing(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    clearCart()
    setIsCartOpen(false)
    onOpenChange(false)
    resetForm()
    router.push(`/suivi/${result.id}`)
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-[60]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl z-[70] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background rounded-t-xl">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Finaliser la commande
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors",
                    i <= step
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:inline",
                    i <= step ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "hidden sm:block w-8 h-px mx-2",
                      i < step ? "bg-accent" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Customer info */}
          {step === 0 && (
            <form onSubmit={handleStepOneSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-foreground">
                    Prenom *
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-foreground">
                    Nom *
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean@exemple.fr"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Telephone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
              >
                Continuer
              </button>
            </form>
          )}

          {/* Step 2: Time slot */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Choisissez votre creneau de retrait
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setTimeSlot(slot)}
                      className={cn(
                        "px-2 py-2 rounded-lg text-sm font-medium transition-colors",
                        timeSlot === slot
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-foreground hover:bg-border"
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(0)}
                  className="flex-1 py-3 px-4 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleStepTwoSubmit}
                  disabled={!timeSlot}
                  className="flex-1 py-3 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Order summary & confirm */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-foreground">Recapitulatif</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{firstName} {lastName}</p>
                  {email && <p>{email}</p>}
                  {phone && <p>{phone}</p>}
                  <p className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Retrait a {timeSlot}
                  </p>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-foreground">Articles</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-foreground">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border flex justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-semibold text-foreground">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Envoi..." : "Confirmer la commande"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

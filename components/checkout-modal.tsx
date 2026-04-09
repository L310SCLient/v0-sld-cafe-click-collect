"use client"

import { useState } from "react"
import { X, CreditCard, Clock, Check } from "lucide-react"
import { useCart } from "./cart-provider"

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function generateTimeSlots() {
  const slots: string[] = []
  for (let hour = 9; hour <= 19; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      if (hour === 9 && minute < 30) continue
      if (hour === 19 && minute > 0) continue
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      slots.push(time)
    }
  }
  return slots
}

const timeSlots = generateTimeSlots()

export function CheckoutModal({ open, onOpenChange }: CheckoutModalProps) {
  const { items, totalPrice, clearCart, setIsCartOpen } = useCart()
  const [step, setStep] = useState<"form" | "payment" | "success">("form")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [timeSlot, setTimeSlot] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName || !timeSlot) return
    setStep("payment")
  }

  const handlePayment = async () => {
    setIsProcessing(true)
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsProcessing(false)
    setStep("success")
  }

  const handleClose = () => {
    if (step === "success") {
      clearCart()
      setIsCartOpen(false)
    }
    onOpenChange(false)
    // Reset form after a delay
    setTimeout(() => {
      setStep("form")
      setFirstName("")
      setLastName("")
      setTimeSlot("")
    }, 300)
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
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            {step === "form" && "Finaliser la commande"}
            {step === "payment" && "Paiement"}
            {step === "success" && "Commande confirmee"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        <div className="p-6">
          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-foreground">
                    Prenom
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
                    Nom
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

              {/* Time Slot */}
              <div className="space-y-2">
                <label htmlFor="timeSlot" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Creneau de retrait
                </label>
                <select
                  id="timeSlot"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Choisir un creneau</option>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order Summary */}
              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-foreground">Recapitulatif</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-foreground">
                        {(item.price * item.quantity).toFixed(2).replace(".", ",")} €
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border flex justify-between">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="font-semibold text-foreground">
                    {totalPrice.toFixed(2).replace(".", ",")} €
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
              >
                Continuer vers le paiement
              </button>
            </form>
          )}

          {step === "payment" && (
            <div className="space-y-6">
              <div className="bg-secondary/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium text-foreground">Paiement par carte</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Integration Stripe - Mode demonstration
                </p>
              </div>

              {/* Mock Card Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Numero de carte
                  </label>
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Date d&apos;expiration
                    </label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      CVC
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-muted-foreground">Total a payer</span>
                <span className="text-xl font-semibold text-foreground">
                  {totalPrice.toFixed(2).replace(".", ",")} €
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 py-3 px-4 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Traitement..." : "Payer"}
                </button>
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif font-semibold text-foreground">
                  Merci pour votre commande !
                </h3>
                <p className="text-muted-foreground">
                  {firstName}, votre commande sera prete a {timeSlot}.
                </p>
                <p className="text-sm text-muted-foreground">
                  Presentez-vous au comptoir pour recuperer votre commande.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="py-3 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

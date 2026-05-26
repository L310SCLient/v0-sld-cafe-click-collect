"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Clock, Flame, MapPin } from "lucide-react"
import { useCart } from "./cart-provider"
import { createOrder } from "@/app/actions/orders"
import { formatPrice, getTimeSlots, cn } from "@/lib/utils"
import type { OrderItem } from "@/types"

interface CheckoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Créneaux de retrait : 11h30 → 14h30, toutes les 15 minutes
const SLOTS = getTimeSlots("11:30", "14:30", 15)

const STEPS = [
  { label: "Informations" },
  { label: "Créneau" },
  { label: "Paiement" },
]

// Validation numéro de mobile français (06/07 suivi de 8 chiffres, espaces tolérés)
function isValidFrenchMobile(value: string): boolean {
  const cleaned = value.replace(/\s/g, "")
  return /^0[67]\d{8}$/.test(cleaned)
}

function formatPhoneInput(value: string): string {
  // Garder uniquement les chiffres et les espaces
  const digits = value.replace(/\D/g, "").slice(0, 10)
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim()
}

export function CheckoutModal({ open, onOpenChange }: CheckoutModalProps) {
  const router = useRouter()
  const { items, totalPrice, clearCart, setIsCartOpen } = useCart()

  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [timeSlot, setTimeSlot] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  const resetForm = () => {
    setStep(0)
    setFirstName("")
    setLastName("")
    setEmail("")
    setPhone("")
    setPhoneError("")
    setTimeSlot("")
    setError("")
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(resetForm, 300)
  }

  // Étape 1 : validation informations
  const handleStepOneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneError("")
    if (!firstName.trim() || !lastName.trim()) return
    if (!phone.trim()) {
      setPhoneError("Le numéro de téléphone est obligatoire.")
      return
    }
    if (!isValidFrenchMobile(phone)) {
      setPhoneError("Veuillez saisir un mobile français valide (06 ou 07).")
      return
    }
    setStep(1)
  }

  // Étape 2 : validation créneau
  const handleStepTwoSubmit = () => {
    if (!timeSlot) return
    setStep(2)
  }

  // Étape 3 : création de la commande
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
      phone: phone.trim(),
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
        className="fixed inset-0 z-[60] backdrop-blur-[2px]"
        style={{ backgroundColor: "rgba(36, 30, 26, 0.55)" }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modale */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full z-[70] max-h-[92vh] overflow-y-auto"
        style={{
          maxWidth: "560px",
          backgroundColor: "var(--creme-bg)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Bouton fermer */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full transition-opacity hover:opacity-60 z-10"
          style={{ color: "var(--espresso-60)" }}
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Stepper */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const isDone = i < step
              const isCurrent = i === step
              return (
                <div key={s.label} className="flex items-center flex-1 last:flex-none">
                  {/* Marqueur */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300 text-xs font-medium shrink-0"
                      style={{
                        backgroundColor:
                          isDone || isCurrent ? "var(--terracotta)" : "var(--argile)",
                        color:
                          isDone || isCurrent ? "var(--creme-surface)" : "var(--espresso-60)",
                        boxShadow:
                          isCurrent
                            ? "0 0 0 4px rgba(168, 90, 46, 0.18)"
                            : "none",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {isDone ? "✓" : i + 1}
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: isCurrent ? "var(--espresso)" : "var(--espresso-40)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {/* Ligne de connexion */}
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-px mx-2 mb-5 transition-colors duration-300"
                      style={{
                        backgroundColor: i < step ? "var(--terracotta)" : "var(--espresso-20)",
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-8 pb-8">
          {/* ── Étape 1 : Informations ── */}
          {step === 0 && (
            <form onSubmit={handleStepOneSubmit} className="space-y-6">
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(32px, 5vw, 44px)",
                    fontWeight: 500,
                    color: "var(--espresso)",
                    lineHeight: 1.1,
                  }}
                >
                  On vous écoute
                  <span style={{ color: "var(--terracotta)" }}>.</span>
                </h2>
                <p
                  className="mt-2"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    fontStyle: "italic",
                    color: "var(--espresso-60)",
                  }}
                >
                  Trois champs essentiels, et votre commande est en route.
                </p>
              </div>

              {/* Carte formulaire */}
              <div
                className="space-y-4 p-5"
                style={{
                  backgroundColor: "var(--creme-surface)",
                  borderRadius: "14px",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                {/* Prénom / Nom */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="firstName"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--espresso-60)",
                        display: "block",
                      }}
                    >
                      Prénom *
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jean"
                      required
                      className="w-full transition-shadow"
                      style={{
                        padding: "13px 16px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--espresso-20)",
                        backgroundColor: "var(--creme-surface)",
                        color: "var(--espresso)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.boxShadow = "0 0 0 2px var(--terracotta)"
                        e.currentTarget.style.borderColor = "var(--terracotta)"
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.boxShadow = "none"
                        e.currentTarget.style.borderColor = "var(--espresso-20)"
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="lastName"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--espresso-60)",
                        display: "block",
                      }}
                    >
                      Nom *
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Dupont"
                      required
                      className="w-full transition-shadow"
                      style={{
                        padding: "13px 16px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--espresso-20)",
                        backgroundColor: "var(--creme-surface)",
                        color: "var(--espresso)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.boxShadow = "0 0 0 2px var(--terracotta)"
                        e.currentTarget.style.borderColor = "var(--terracotta)"
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.boxShadow = "none"
                        e.currentTarget.style.borderColor = "var(--espresso-20)"
                      }}
                    />
                  </div>
                </div>

                {/* Téléphone / Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="phone"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--espresso-60)",
                        display: "block",
                      }}
                    >
                      Téléphone mobile *
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(formatPhoneInput(e.target.value))
                        setPhoneError("")
                      }}
                      placeholder="06 12 34 56 78"
                      className="w-full transition-shadow"
                      style={{
                        padding: "13px 16px",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${phoneError ? "var(--destructive)" : "var(--espresso-20)"}`,
                        backgroundColor: "var(--creme-surface)",
                        color: "var(--espresso)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        if (!phoneError) {
                          e.currentTarget.style.boxShadow = "0 0 0 2px var(--terracotta)"
                          e.currentTarget.style.borderColor = "var(--terracotta)"
                        }
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.boxShadow = "none"
                        if (!phoneError) e.currentTarget.style.borderColor = "var(--espresso-20)"
                      }}
                    />
                    {phoneError && (
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "11px",
                          color: "var(--destructive)",
                          marginTop: "4px",
                        }}
                      >
                        {phoneError}
                      </p>
                    )}
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        color: "var(--espresso-40)",
                      }}
                    >
                      Format : 06 XX XX XX XX ou 07 XX XX XX XX
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--espresso-60)",
                        display: "block",
                      }}
                    >
                      E-mail{" "}
                      <span style={{ color: "var(--espresso-40)" }}>(optionnel)</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jean@exemple.fr"
                      className="w-full transition-shadow"
                      style={{
                        padding: "13px 16px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--espresso-20)",
                        backgroundColor: "var(--creme-surface)",
                        color: "var(--espresso)",
                        fontFamily: "var(--font-sans)",
                        fontSize: "14px",
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.boxShadow = "0 0 0 2px var(--terracotta)"
                        e.currentTarget.style.borderColor = "var(--terracotta)"
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.boxShadow = "none"
                        e.currentTarget.style.borderColor = "var(--espresso-20)"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-3 rounded-full transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    color: "var(--espresso-60)",
                  }}
                >
                  ← Retour au panier
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-full transition-colors"
                  style={{
                    backgroundColor: "var(--terracotta)",
                    color: "var(--creme-surface)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--terracotta-hover)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--terracotta)"
                  }}
                >
                  Choisir le créneau →
                </button>
              </div>
            </form>
          )}

          {/* ── Étape 2 : Créneau ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(28px, 5vw, 38px)",
                    fontWeight: 500,
                    color: "var(--espresso)",
                    lineHeight: 1.15,
                  }}
                >
                  Quand passez-vous nous{" "}
                  <span style={{ color: "var(--terracotta)" }}>voir ?</span>
                </h2>
              </div>

              {/* Carte "Au plus tôt" */}
              <div
                className="flex items-center gap-4 p-4"
                style={{
                  backgroundColor: "var(--espresso)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "inset 0 0 0 1px var(--sable-soft)",
                }}
              >
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: "rgba(201, 166, 107, 0.15)" }}
                >
                  <Flame className="h-5 w-5" style={{ color: "var(--sable)" }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--sable)",
                    }}
                  >
                    Au plus tôt
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "22px",
                      fontWeight: 500,
                      color: "var(--creme-surface)",
                    }}
                  >
                    ~15 minutes
                  </p>
                </div>
              </div>

              {/* Séparateur */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ backgroundColor: "var(--espresso-20)" }} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--espresso-40)",
                  }}
                >
                  ou choisir un créneau
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: "var(--espresso-20)" }} />
              </div>

              {/* Grille de créneaux */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SLOTS.map((slot) => {
                  const isSelected = timeSlot === slot
                  return (
                    <button
                      key={slot}
                      onClick={() => setTimeSlot(slot)}
                      className="py-2.5 px-1 text-center transition-all duration-150"
                      style={{
                        borderRadius: "var(--radius-md)",
                        backgroundColor: isSelected ? "var(--terracotta)" : "var(--creme-surface)",
                        border: `1px solid ${isSelected ? "var(--terracotta)" : "var(--sable-soft)"}`,
                        color: isSelected ? "var(--creme-surface)" : "var(--espresso)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: isSelected ? 500 : 400,
                        boxShadow: isSelected
                          ? "0 0 0 3px rgba(168, 90, 46, 0.22)"
                          : "none",
                      }}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-5 py-3 rounded-full transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    color: "var(--espresso-60)",
                  }}
                >
                  ← Modifier mes infos
                </button>
                <button
                  type="button"
                  onClick={handleStepTwoSubmit}
                  disabled={!timeSlot}
                  className="px-6 py-3 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--terracotta)",
                    color: "var(--creme-surface)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled)
                      e.currentTarget.style.backgroundColor = "var(--terracotta-hover)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--terracotta)"
                  }}
                >
                  Aller au paiement →
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 3 : Confirmation ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(28px, 5vw, 38px)",
                    fontWeight: 500,
                    color: "var(--espresso)",
                    lineHeight: 1.15,
                  }}
                >
                  Plus qu'à{" "}
                  <span style={{ color: "var(--terracotta)" }}>signer.</span>
                </h2>
              </div>

              {/* Récapitulatif client + créneau */}
              <div
                className="p-5 space-y-3"
                style={{
                  backgroundColor: "var(--creme-surface)",
                  borderRadius: "14px",
                  boxShadow: "var(--shadow-xs)",
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
                  Vos informations
                </p>
                <div className="space-y-1">
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "20px",
                      fontWeight: 500,
                      color: "var(--espresso)",
                    }}
                  >
                    {firstName} {lastName}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "13px",
                      color: "var(--espresso-60)",
                    }}
                  >
                    {phone}
                  </p>
                  {email && (
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        color: "var(--espresso-60)",
                      }}
                    >
                      {email}
                    </p>
                  )}
                </div>
                <div
                  className="flex items-center gap-2 pt-2"
                  style={{ borderTop: "1px solid var(--espresso-08)" }}
                >
                  <Clock className="h-4 w-4 shrink-0" style={{ color: "var(--terracotta)" }} />
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "var(--espresso)",
                    }}
                  >
                    Retrait à {timeSlot}
                  </p>
                </div>
              </div>

              {/* Récapitulatif articles */}
              <div
                className="p-5 space-y-3"
                style={{
                  backgroundColor: "var(--creme-surface)",
                  borderRadius: "14px",
                  boxShadow: "var(--shadow-xs)",
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
                  Votre commande
                </p>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
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
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <p
                  className="px-4 py-3 rounded-xl"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    color: "var(--destructive)",
                    backgroundColor: "rgba(192, 57, 43, 0.08)",
                  }}
                >
                  {error}
                </p>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-full transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    color: "var(--espresso-60)",
                  }}
                >
                  ← Modifier le créneau
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--terracotta)",
                    color: "var(--creme-surface)",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled)
                      e.currentTarget.style.backgroundColor = "var(--terracotta-hover)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--terracotta)"
                  }}
                >
                  {isProcessing ? "Envoi en cours…" : "Confirmer la commande"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

"use client"

import { X, Minus, Plus, Clock, ShoppingBag } from "lucide-react"
import { usePathname } from "next/navigation"
import { useCart } from "./cart-provider"
import { useState } from "react"
import { CheckoutModal } from "./checkout-modal"
import { formatPrice, cn } from "@/lib/utils"

export function CartSidebar() {
  const pathname = usePathname()
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, totalPrice, totalItems } = useCart()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Masquer le panier sur les pages admin
  if (pathname.startsWith("/admin")) return null

  const handleCommander = () => {
    setCheckoutOpen(true)
  }

  return (
    <>
      {/* Bouton flottant mobile quand le panier est fermé */}
      {totalItems > 0 && !isCartOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 pb-safe">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between py-3.5 px-5 rounded-full font-medium transition-colors"
            style={{
              backgroundColor: "var(--terracotta)",
              color: "var(--creme-surface)",
            }}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span
                style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
              >
                {totalItems} article{totalItems > 1 ? "s" : ""}
              </span>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 500 }}>
              {formatPrice(totalPrice)}
            </span>
          </button>
        </div>
      )}

      {/* Overlay */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(36, 30, 26, 0.35)" }}
          onClick={() => setIsCartOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Tiroir latéral */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out",
          // Desktop: 460px, Mobile: 90% largeur, coins arrondis gauche
          "w-[90%] md:w-[460px]",
          "rounded-tl-[20px] rounded-bl-[20px] md:rounded-none",
          isCartOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          backgroundColor: "var(--creme-bg)",
          boxShadow: "var(--shadow-lg)",
          borderLeft: "1px solid var(--sable-soft)",
        }}
      >
        {/* En-tête */}
        <div
          className="flex items-start justify-between px-6 pt-6 pb-5"
          style={{ borderBottom: "1px solid var(--espresso-08)" }}
        >
          <div>
            <p
              className="uppercase tracking-widest mb-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--espresso-60)",
              }}
            >
              Votre panier
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "32px",
                fontWeight: 500,
                color: "var(--espresso)",
                lineHeight: 1.1,
              }}
            >
              {totalItems} article{totalItems > 1 ? "s" : ""}
            </h2>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-full transition-colors hover:opacity-70 mt-1"
            style={{ color: "var(--espresso-60)" }}
            aria-label="Fermer le panier"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Liste des articles */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <ShoppingBag
                className="h-10 w-10"
                style={{ color: "var(--espresso-40)" }}
              />
              <p style={{ color: "var(--espresso-60)", fontFamily: "var(--font-sans)" }}>
                Votre panier est vide
              </p>
              <p
                style={{
                  color: "var(--espresso-40)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                }}
              >
                Ajoutez des produits pour commencer
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid items-center gap-3 py-4"
                  style={{
                    gridTemplateColumns: "1fr auto auto",
                    borderBottom: "1px solid var(--espresso-08)",
                  }}
                >
                  {/* Nom + prix unitaire */}
                  <div className="min-w-0">
                    <p
                      className="truncate"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "var(--espresso)",
                      }}
                    >
                      {item.name}
                    </p>
                    <p
                      className="mt-0.5"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "var(--espresso-60)",
                      }}
                    >
                      {formatPrice(item.price)} / unité
                    </p>
                  </div>

                  {/* Stepper quantité */}
                  <div
                    className="flex items-center gap-2 px-2 py-1 rounded-full"
                    style={{ backgroundColor: "var(--argile)" }}
                  >
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="flex items-center justify-center w-6 h-6 rounded-full transition-opacity hover:opacity-70"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-3 w-3" style={{ color: "var(--espresso)" }} />
                    </button>
                    <span
                      className="w-5 text-center tabular-nums"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--espresso)",
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="flex items-center justify-center w-6 h-6 rounded-full transition-opacity hover:opacity-70"
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="h-3 w-3" style={{ color: "var(--espresso)" }} />
                    </button>
                  </div>

                  {/* Total ligne */}
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "var(--espresso)",
                      minWidth: "72px",
                      textAlign: "right",
                    }}
                  >
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}

              {/* Encart retrait */}
              <div
                className="flex items-center gap-3 mt-4 p-4"
                style={{
                  backgroundColor: "var(--argile)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: "var(--terracotta)" }}
                >
                  <Clock className="h-4 w-4" style={{ color: "var(--creme-surface)" }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "13px",
                      color: "var(--espresso)",
                      fontWeight: 500,
                    }}
                  >
                    Retrait à partir de 11h30
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--espresso-60)",
                    }}
                  >
                    Commande prête en ~15 minutes
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page sticky */}
        {items.length > 0 && (
          <div
            className="px-6 pt-4 pb-6 space-y-4"
            style={{
              backgroundColor: "var(--creme-surface)",
              borderTop: "1px solid var(--sable-soft)",
            }}
          >
            {/* Sous-total */}
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--espresso-60)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Sous-total
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "14px",
                  color: "var(--espresso-80)",
                }}
              >
                {formatPrice(totalPrice)}
              </span>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between">
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
                  fontSize: "36px",
                  fontWeight: 500,
                  color: "var(--espresso)",
                  lineHeight: 1,
                }}
              >
                {formatPrice(totalPrice)}
              </span>
            </div>

            {/* Bouton commander */}
            <button
              onClick={handleCommander}
              className="w-full py-4 px-6 transition-colors font-medium"
              style={{
                backgroundColor: "var(--terracotta)",
                color: "var(--creme-surface)",
                borderRadius: "var(--radius-pill)",
                fontFamily: "var(--font-sans)",
                fontSize: "15px",
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--terracotta-hover)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--terracotta)"
              }}
            >
              Commander · {formatPrice(totalPrice)}
            </button>
          </div>
        )}
      </div>

      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  )
}

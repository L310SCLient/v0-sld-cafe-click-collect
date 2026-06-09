"use client"

import { X, Minus, Plus, Clock, ShoppingBag } from "lucide-react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { useCart } from "./cart-provider"
import { useState, useEffect } from "react"
import { CheckoutModal } from "./checkout-modal"
import { formatPrice, cn } from "@/lib/utils"

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    setMobile(mq.matches)
    function handler(e: MediaQueryListEvent) { setMobile(e.matches) }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return mobile
}

export function CartSidebar() {
  const pathname = usePathname()
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, totalPrice, totalItems } = useCart()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const isMobile = useIsMobile()

  if (pathname.startsWith("/admin")) return null

  const handleCommander = () => {
    setCheckoutOpen(true)
  }

  // Lock body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isCartOpen])

  // Shared cart content
  const cartContent = (
    <>
      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4" style={{ WebkitOverflowScrolling: "touch" }}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <ShoppingBag className="h-10 w-10" style={{ color: "var(--espresso-40)" }} />
            <p style={{ color: "var(--espresso-60)", fontFamily: "var(--font-sans)", fontSize: "15px" }}>
              Votre panier est vide
            </p>
            <p style={{ color: "var(--espresso-40)", fontFamily: "var(--font-sans)", fontSize: "14px" }}>
              Ajoutez des produits pour commencer
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) =>
              item.formuleId ? (
                <div key={item.id} className="py-4" style={{ borderBottom: "1px solid var(--espresso-08)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 500, color: "var(--espresso)" }}>
                        {item.name}
                      </p>
                      {item.formuleDetails && item.formuleDetails.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {item.formuleDetails.map((d, idx) => (
                            <li key={idx} style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "var(--espresso-60)", lineHeight: 1.4 }}>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--terracotta)" }}>
                                {d.etape_label}
                              </span>{" "}{d.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 500, color: "var(--espresso)" }}>
                        {formatPrice(item.price)}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex items-center justify-center w-8 h-8 rounded-full active:opacity-60"
                        style={{ backgroundColor: "var(--argile)" }}
                        aria-label="Supprimer la formule"
                      >
                        <X className="h-3.5 w-3.5" style={{ color: "var(--espresso-60)" }} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={item.id} className="flex items-center gap-3 py-4" style={{ borderBottom: "1px solid var(--espresso-08)" }}>
                  {/* Mini thumbnail */}
                  {item.image_url && (
                    <div className="w-8 h-8 rounded-md overflow-hidden shrink-0 relative">
                      <Image src={item.image_url} alt="" fill className="object-cover" sizes="32px" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate" style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 500, color: "var(--espresso)" }}>
                      {item.name}
                    </p>
                    <p className="mt-0.5" style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--espresso-60)" }}>
                      {formatPrice(item.price)} / unit&eacute;
                    </p>
                  </div>
                  {/* Quantity stepper — bigger touch targets */}
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full shrink-0" style={{ backgroundColor: "var(--argile)" }}>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="flex items-center justify-center w-8 h-8 rounded-full active:opacity-60"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-3.5 w-3.5" style={{ color: "var(--espresso)" }} />
                    </button>
                    <span className="w-6 text-center tabular-nums" style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 500, color: "var(--espresso)" }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="flex items-center justify-center w-8 h-8 rounded-full active:opacity-60"
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="h-3.5 w-3.5" style={{ color: "var(--espresso)" }} />
                    </button>
                  </div>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 500, color: "var(--espresso)", minWidth: "68px", textAlign: "right" }}>
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              )
            )}

            {/* Pickup info */}
            <div className="flex items-center gap-3 mt-4 p-4" style={{ backgroundColor: "var(--argile)", borderRadius: "var(--radius-md)" }}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: "var(--terracotta)" }}>
                <Clock className="h-4 w-4" style={{ color: "var(--creme-surface)" }} />
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--espresso)", fontWeight: 500 }}>
                  Retrait &agrave; partir de 11h30
                </p>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--espresso-60)" }}>
                  Commande pr&ecirc;te en ~15 minutes
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      {items.length > 0 && (
        <div
          className="px-5 sm:px-6 pt-4 pb-6 space-y-3"
          style={{
            backgroundColor: "var(--creme-surface)",
            borderTop: "1px solid var(--sable-soft)",
            paddingBottom: isMobile ? "max(24px, env(safe-area-inset-bottom))" : "24px",
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: "var(--font-sans)", fontSize: "15px", fontWeight: 500, color: "var(--espresso)" }}>
              Total
            </span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 500, color: "var(--espresso)", lineHeight: 1 }}>
              {formatPrice(totalPrice)}
            </span>
          </div>
          <button
            onClick={handleCommander}
            className="w-full py-4 px-6 font-medium active:opacity-80 transition-opacity"
            style={{
              backgroundColor: "var(--terracotta)",
              color: "var(--creme-surface)",
              borderRadius: "var(--radius-pill)",
              fontFamily: "var(--font-sans)",
              fontSize: "16px",
              fontWeight: 500,
              minHeight: "52px",
            }}
          >
            Commander &middot; {formatPrice(totalPrice)}
          </button>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Floating bar when cart closed — mobile only */}
      {totalItems > 0 && !isCartOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe pt-2">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between py-3.5 px-5 rounded-full font-medium active:opacity-80 transition-opacity"
            style={{ backgroundColor: "var(--terracotta)", color: "var(--creme-surface)", minHeight: "52px" }}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
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
          className="sheet-backdrop"
          onClick={() => setIsCartOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MOBILE: Bottom sheet */}
      {isMobile ? (
        <div
          className={cn(
            "sheet-panel flex flex-col transition-transform duration-300 ease-out",
            isCartOpen ? "translate-y-0" : "translate-y-full",
          )}
        >
          {/* Handle + close */}
          <div className="shrink-0">
            <div className="sheet-handle" />
            <div className="flex items-center justify-between px-5 pt-3 pb-4" style={{ borderBottom: "1px solid var(--espresso-08)" }}>
              <div>
                <p className="uppercase tracking-widest" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--espresso-60)" }}>
                  Votre panier
                </p>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 500, color: "var(--espresso)", lineHeight: 1.1 }}>
                  {totalItems} article{totalItems > 1 ? "s" : ""}
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="flex items-center justify-center w-10 h-10 rounded-full active:opacity-60"
                style={{ backgroundColor: "var(--argile)" }}
                aria-label="Fermer le panier"
              >
                <X className="h-5 w-5" style={{ color: "var(--espresso-60)" }} />
              </button>
            </div>
          </div>
          {cartContent}
        </div>
      ) : (
        /* DESKTOP: Side drawer */
        <div
          className={cn(
            "fixed right-0 top-0 h-full z-50 flex flex-col transition-transform duration-300 ease-in-out w-[460px]",
            isCartOpen ? "translate-x-0" : "translate-x-full"
          )}
          style={{ backgroundColor: "var(--creme-bg)", boxShadow: "var(--shadow-lg)", borderLeft: "1px solid var(--sable-soft)" }}
        >
          <div className="flex items-start justify-between px-6 pt-6 pb-5" style={{ borderBottom: "1px solid var(--espresso-08)" }}>
            <div>
              <p className="uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--espresso-60)" }}>
                Votre panier
              </p>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "32px", fontWeight: 500, color: "var(--espresso)", lineHeight: 1.1 }}>
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
          {cartContent}
        </div>
      )}

      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  )
}

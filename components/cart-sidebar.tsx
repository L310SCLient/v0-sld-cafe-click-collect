"use client"

import { X, Minus, Plus, ShoppingBag } from "lucide-react"
import { usePathname } from "next/navigation"
import { useCart } from "./cart-provider"
import { useState } from "react"
import { CheckoutModal } from "./checkout-modal"
import { formatPrice } from "@/lib/utils"
import { cn } from "@/lib/utils"

export function CartSidebar() {
  const pathname = usePathname()
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, totalPrice, totalItems } = useCart()
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  // Hide cart on admin pages
  if (pathname.startsWith('/admin')) return null

  return (
    <>
      {/* Mobile: fixed bottom bar */}
      {totalItems > 0 && !isCartOpen && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border p-3 safe-area-pb">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full flex items-center justify-between py-3 px-5 rounded-xl bg-accent text-accent-foreground font-medium"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              <span>{totalItems} article{totalItems > 1 ? "s" : ""}</span>
            </div>
            <span className="font-semibold">{formatPrice(totalPrice)}</span>
          </button>
        </div>
      )}

      {/* Overlay */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border z-50 flex flex-col shadow-xl transition-transform duration-300 ease-in-out",
          isCartOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-foreground" />
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Votre panier
            </h2>
            {totalItems > 0 && (
              <span className="text-sm text-muted-foreground">
                ({totalItems} article{totalItems > 1 ? "s" : ""})
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Fermer le panier"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Votre panier est vide</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez des produits pour commencer
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-card-foreground truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.price)} x {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1.5 rounded-full bg-secondary hover:bg-border transition-colors"
                      aria-label="Diminuer la quantite"
                    >
                      <Minus className="h-3 w-3 text-foreground" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1.5 rounded-full bg-secondary hover:bg-border transition-colors"
                      aria-label="Augmenter la quantite"
                    >
                      <Plus className="h-3 w-3 text-foreground" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
                    aria-label="Supprimer du panier"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-semibold text-foreground">
                {formatPrice(totalPrice)}
              </span>
            </div>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="w-full py-3 px-4 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
            >
              Commander
            </button>
          </div>
        )}
      </div>

      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  )
}

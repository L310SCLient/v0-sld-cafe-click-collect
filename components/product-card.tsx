"use client"

import { useState } from "react"
import { Plus, Check } from "lucide-react"
import { useCart } from "./cart-provider"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"

interface ProductCardProps {
  product: Product
  categoryLabel?: string
}

function formatPriceLocal(cents: number): string {
  const euros = Math.floor(cents / 100)
  const centsPart = cents % 100
  return `${euros},${centsPart.toString().padStart(2, "0")} \u20AC`
}

export function ProductCard({ product, categoryLabel }: ProductCardProps) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    if (!product.available) return
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 600)
  }

  return (
    <div
      className={cn(
        "group relative rounded-[var(--radius-md)] bg-[var(--creme-surface)]",
        "border border-transparent shadow-[var(--shadow-xs)]",
        "transition-all duration-200",
        // Mobile: horizontal row layout. Tablet+: vertical card
        "flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-0",
        "sm:hover:border-[var(--sable-soft)] sm:hover:shadow-[var(--shadow-sm)]",
        !product.available && "opacity-55"
      )}
      style={{ padding: "12px 14px" }}
    >
      {/* Photo placeholder — square on mobile, hidden on desktop (kept as original) */}
      <div
        className="sld-photo rounded-lg shrink-0 sm:hidden"
        style={{ width: "56px", height: "56px" }}
      />

      {/* Content area */}
      <div className="flex-1 min-w-0 flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-0">
        {/* Category label */}
        {categoryLabel && (
          <p
            className="hidden sm:block font-[family-name:var(--font-mono)] uppercase text-[var(--espresso-60)]"
            style={{ fontSize: "10px", letterSpacing: "0.14em", marginBottom: "6px" }}
          >
            {categoryLabel}
          </p>
        )}

        {/* Name + price row on mobile, stacked on desktop */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-[family-name:var(--font-display)] font-medium text-[var(--espresso)] leading-snug truncate sm:truncate-none"
            style={{ fontSize: "16px" }}
          >
            {product.name}
          </h3>
          <p
            className="sm:hidden font-[family-name:var(--font-display)] font-medium text-[var(--espresso)] mt-0.5"
            style={{ fontSize: "15px" }}
          >
            {formatPriceLocal(product.price)}
          </p>
        </div>

        {/* Desktop footer: price + button */}
        <div
          className="hidden sm:flex items-center justify-between"
          style={{ borderTop: "1px solid var(--espresso-08)", marginTop: "4px", paddingTop: "10px" }}
        >
          <span className="font-[family-name:var(--font-display)] font-medium text-[var(--espresso)]" style={{ fontSize: "18px" }}>
            {formatPriceLocal(product.price)}
          </span>
          {product.available ? (
            <button
              onClick={handleAdd}
              aria-label={`Ajouter ${product.name} au panier`}
              className={cn(
                "flex items-center justify-center rounded-full transition-all duration-200",
                "bg-[var(--terracotta)] text-white",
                "hover:bg-[var(--terracotta-hover)] hover:scale-[1.06]",
                added && "bg-green-600 scale-[1.06]"
              )}
              style={{ width: "32px", height: "32px", flexShrink: 0 }}
            >
              {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          ) : (
            <span className="font-[family-name:var(--font-mono)] uppercase text-[var(--espresso-60)]" style={{ fontSize: "10px", letterSpacing: "0.12em" }}>
              &eacute;puis&eacute;
            </span>
          )}
        </div>
      </div>

      {/* Mobile: action button (bigger touch target) */}
      <div className="sm:hidden shrink-0">
        {product.available ? (
          <button
            onClick={handleAdd}
            aria-label={`Ajouter ${product.name} au panier`}
            className={cn(
              "flex items-center justify-center rounded-full transition-all duration-150",
              "bg-[var(--terracotta)] text-white active:scale-90",
              added && "bg-green-600"
            )}
            style={{ width: "44px", height: "44px" }}
          >
            {added ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          </button>
        ) : (
          <span className="font-[family-name:var(--font-mono)] uppercase text-[var(--espresso-60)]" style={{ fontSize: "9px", letterSpacing: "0.1em" }}>
            &eacute;puis&eacute;
          </span>
        )}
      </div>
    </div>
  )
}

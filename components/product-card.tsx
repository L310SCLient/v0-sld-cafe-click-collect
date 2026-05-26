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
  return `${euros},${centsPart.toString().padStart(2, "0")} €`
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
        "group relative flex flex-col rounded-[var(--radius-md)] bg-[var(--creme-surface)]",
        "border border-transparent shadow-[var(--shadow-xs)]",
        "transition-all duration-200",
        "hover:border-[var(--sable-soft)] hover:shadow-[var(--shadow-sm)]",
        !product.available && "opacity-55"
      )}
      style={{ padding: "14px 16px" }}
    >
      {/* Category label */}
      {categoryLabel && (
        <p
          className="font-[family-name:var(--font-mono)] uppercase text-[var(--espresso-60)]"
          style={{
            fontSize: "10px",
            letterSpacing: "0.14em",
            marginBottom: "6px",
          }}
        >
          {categoryLabel}
        </p>
      )}

      {/* Product name */}
      <h3
        className="font-[family-name:var(--font-display)] font-medium text-[var(--espresso)] leading-snug flex-1"
        style={{ fontSize: "18px" }}
      >
        {product.name}
      </h3>

      {/* Footer: price + action */}
      <div
        className="flex items-center justify-between"
        style={{
          borderTop: "1px solid var(--espresso-08)",
          marginTop: "4px",
          paddingTop: "10px",
        }}
      >
        <span
          className="font-[family-name:var(--font-display)] font-medium text-[var(--espresso)]"
          style={{ fontSize: "18px" }}
        >
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
            {added ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span
            className="font-[family-name:var(--font-mono)] uppercase text-[var(--espresso-60)]"
            style={{ fontSize: "10px", letterSpacing: "0.12em" }}
          >
            épuisé
          </span>
        )}
      </div>
    </div>
  )
}

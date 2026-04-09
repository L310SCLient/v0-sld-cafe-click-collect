"use client"

import { useState } from "react"
import { Plus, Check } from "lucide-react"
import { useCart } from "./cart-provider"
import { formatPrice } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Product } from "@/types"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
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
        "group relative flex items-center justify-between py-3 px-4 rounded-lg bg-card border border-transparent transition-colors",
        product.available
          ? "hover:bg-secondary/50 hover:border-border"
          : "opacity-60"
      )}
    >
      {!product.available && (
        <span className="absolute top-1 right-1 text-[10px] font-medium uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
          Indisponible
        </span>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-card-foreground truncate">
          {product.name}
        </h3>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {formatPrice(product.price)}
        </span>
        <button
          onClick={handleAdd}
          disabled={!product.available}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
            added
              ? "bg-green-500 text-white scale-110"
              : "bg-primary text-primary-foreground hover:bg-accent",
            !product.available && "cursor-not-allowed opacity-40"
          )}
          aria-label={`Ajouter ${product.name} au panier`}
        >
          {added ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  )
}

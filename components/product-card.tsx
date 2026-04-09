"use client"

import { Plus } from "lucide-react"
import { useCart } from "./cart-provider"
import type { Product } from "@/lib/products"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
    })
  }

  return (
    <div className="group flex items-center justify-between py-3 px-4 rounded-lg bg-card hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-card-foreground truncate">
          {product.name}
        </h3>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {product.price.toFixed(2).replace(".", ",")} €
        </span>
        <button
          onClick={handleAdd}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground hover:bg-accent transition-colors"
          aria-label={`Ajouter ${product.name} au panier`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

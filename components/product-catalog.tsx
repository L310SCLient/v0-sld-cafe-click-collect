"use client"

import { ProductCard } from "./product-card"
import type { Product } from "@/types"

interface CategoryGroup {
  id: string
  name: string
  emoji: string
  products: Product[]
}

interface ProductCatalogProps {
  categories: CategoryGroup[]
}

export function ProductCatalog({ categories }: ProductCatalogProps) {
  return (
    <div className="space-y-12">
      {categories.map((category) => (
        <section key={category.id} id={category.id}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl" role="img" aria-label={category.name}>
              {category.emoji}
            </span>
            <h2 className="font-serif text-xl font-semibold text-foreground">
              {category.name}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {category.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

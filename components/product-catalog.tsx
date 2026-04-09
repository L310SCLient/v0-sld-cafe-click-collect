"use client"

import { categories } from "@/lib/products"
import { ProductCard } from "./product-card"

export function ProductCatalog() {
  return (
    <div className="space-y-10">
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
          <div className="grid gap-2">
            {category.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

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
    <div className="space-y-14">
      {categories.map((category) => (
        <section key={category.id} id={category.id} className="scroll-mt-36">
          <h2
            className="font-[family-name:var(--font-display)] italic font-normal text-[var(--terracotta)] mb-6"
            style={{ fontSize: "32px" }}
          >
            {category.name}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
            {category.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

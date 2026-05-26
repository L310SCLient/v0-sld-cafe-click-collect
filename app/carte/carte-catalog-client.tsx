"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ProductCard } from "@/components/product-card"
import type { Product } from "@/types"

interface CategoryGroup {
  id: string
  name: string
  products: Product[]
}

interface CarteCatalogClientProps {
  categories: CategoryGroup[]
}

export function CarteCatalogClient({ categories }: CarteCatalogClientProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const visibleCategories =
    activeId === null
      ? categories
      : categories.filter((c) => c.id === activeId)

  return (
    <>
      {/* ─── TABS ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-16 z-30 py-3 px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center gap-1 overflow-x-auto scrollbar-hide w-fit max-w-full rounded-[var(--radius-pill)] bg-[var(--argile)]"
          style={{ padding: "6px" }}
        >
          {/* "Tout" tab */}
          <button
            onClick={() => setActiveId(null)}
            className={cn(
              "flex items-center whitespace-nowrap rounded-[var(--radius-pill)] transition-all duration-200",
              "font-[family-name:var(--font-sans)] text-sm font-medium",
              activeId === null
                ? "bg-[var(--creme-surface)] text-[var(--espresso)] shadow-[var(--shadow-xs)]"
                : "text-[var(--espresso-80)] hover:text-[var(--espresso)]"
            )}
            style={{ padding: "9px 18px" }}
          >
            <span>Tout</span>
            <span
              className={cn(
                "font-[family-name:var(--font-mono)]",
                activeId === null
                  ? "text-[var(--terracotta)]"
                  : "text-[var(--espresso-60)]"
              )}
              style={{ fontSize: "10px", marginLeft: "6px" }}
            >
              {categories.reduce((sum, c) => sum + c.products.length, 0)}
            </span>
          </button>

          {categories.map((category) => {
            const isActive = activeId === category.id
            return (
              <button
                key={category.id}
                onClick={() => setActiveId(category.id)}
                className={cn(
                  "flex items-center whitespace-nowrap rounded-[var(--radius-pill)] transition-all duration-200",
                  "font-[family-name:var(--font-sans)] text-sm font-medium",
                  isActive
                    ? "bg-[var(--creme-surface)] text-[var(--espresso)] shadow-[var(--shadow-xs)]"
                    : "text-[var(--espresso-80)] hover:text-[var(--espresso)]"
                )}
                style={{ padding: "9px 18px" }}
              >
                <span>{category.name}</span>
                {category.products.length > 0 && (
                  <span
                    className={cn(
                      "font-[family-name:var(--font-mono)]",
                      isActive
                        ? "text-[var(--terracotta)]"
                        : "text-[var(--espresso-60)]"
                    )}
                    style={{ fontSize: "10px", marginLeft: "6px" }}
                  >
                    {category.products.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ─── PRODUCT GRID ─────────────────────────────────────────────── */}
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24"
        style={{ paddingTop: "16px" }}
      >
        <div className="space-y-14">
          {visibleCategories.map((category) => (
            <section key={category.id}>
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
      </div>
    </>
  )
}

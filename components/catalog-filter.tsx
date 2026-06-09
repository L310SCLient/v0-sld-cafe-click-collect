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

interface CatalogFilterProps {
  categories: CategoryGroup[]
}

export function CatalogFilter({ categories }: CatalogFilterProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const visibleCategories =
    activeId === null
      ? categories
      : categories.filter((c) => c.id === activeId)

  return (
    <>
      {/* ─── TABS — sticky on mobile, scrollable ─────────────────────── */}
      <nav
        className="sticky top-14 sm:top-16 z-30 py-3 px-4 sm:px-6 lg:px-8 sm:flex sm:justify-center"
        style={{
          backgroundColor: "color-mix(in srgb, var(--creme-bg) 95%, transparent)",
          backdropFilter: "blur(8px)",
          paddingTop: "max(12px, env(safe-area-inset-top, 12px))",
        }}
      >
        <div
          className="flex items-center gap-1 overflow-x-auto scrollbar-hide snap-x-mandatory w-fit max-w-full rounded-[var(--radius-pill)] bg-[var(--argile)]"
          style={{ padding: "6px" }}
        >
          {/* "Tout" tab */}
          <button
            onClick={() => setActiveId(null)}
            className={cn(
              "flex items-center whitespace-nowrap rounded-[var(--radius-pill)] transition-all duration-200 snap-start",
              "font-[family-name:var(--font-sans)] text-sm font-medium min-h-[36px]",
              activeId === null
                ? "bg-[var(--creme-surface)] text-[var(--espresso)] shadow-[var(--shadow-xs)]"
                : "text-[var(--espresso-80)] active:opacity-70"
            )}
            style={{ padding: "9px 18px" }}
          >
            <span>Tout</span>
            <span
              className={cn(
                "font-[family-name:var(--font-mono)]",
                activeId === null ? "text-[var(--terracotta)]" : "text-[var(--espresso-60)]"
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
                  "flex items-center whitespace-nowrap rounded-[var(--radius-pill)] transition-all duration-200 snap-start",
                  "font-[family-name:var(--font-sans)] text-sm font-medium min-h-[36px]",
                  isActive
                    ? "bg-[var(--creme-surface)] text-[var(--espresso)] shadow-[var(--shadow-xs)]"
                    : "text-[var(--espresso-80)] active:opacity-70"
                )}
                style={{ padding: "9px 18px" }}
              >
                <span>{category.name}</span>
                {category.products.length > 0 && (
                  <span
                    className={cn(
                      "font-[family-name:var(--font-mono)]",
                      isActive ? "text-[var(--terracotta)]" : "text-[var(--espresso-60)]"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 sm:pb-24" style={{ paddingTop: "16px" }}>
        <div className="space-y-10 sm:space-y-14">
          {visibleCategories.map((category) => (
            <section key={category.id}>
              <h2
                className="font-[family-name:var(--font-display)] italic font-normal text-[var(--terracotta)] mb-4 sm:mb-6"
                style={{ fontSize: "clamp(24px, 5vw, 32px)" }}
              >
                {category.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-[14px]">
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

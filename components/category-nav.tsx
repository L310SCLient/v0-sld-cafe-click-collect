"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

const defaultCategories = [
  { id: "viennoiseries", name: "Viennoiseries", count: 0 },
  { id: "salades", name: "Salades", count: 0 },
  { id: "sandwichs", name: "Sandwichs", count: 0 },
  { id: "chaud", name: "Chaud", count: 0 },
  { id: "desserts", name: "Desserts", count: 0 },
]

interface NavCategory {
  id: string
  name: string
  count?: number
}

interface CategoryNavProps {
  categories?: NavCategory[]
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const navCategories = categories ?? defaultCategories
  const [activeId, setActiveId] = useState<string>(navCategories[0]?.id ?? "")
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (navCategories.length === 0) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the entry closest to the top that is intersecting
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        rootMargin: "-160px 0px -60% 0px",
        threshold: 0,
      }
    )

    navCategories.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navCategories.map((c) => c.id).join(",")])

  const scrollToCategory = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 160
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: "smooth" })
    }
  }

  return (
    <nav className="sticky top-16 z-30 py-3 px-4 sm:px-6 lg:px-8">
      <div
        className="flex items-center gap-1 overflow-x-auto scrollbar-hide w-fit max-w-full rounded-[var(--radius-pill)] bg-[var(--argile)]"
        style={{ padding: "6px" }}
      >
        {navCategories.map((category) => {
          const isActive = activeId === category.id
          return (
            <button
              key={category.id}
              onClick={() => scrollToCategory(category.id)}
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
              {category.count !== undefined && category.count > 0 && (
                <span
                  className={cn(
                    "font-[family-name:var(--font-mono)]",
                    isActive
                      ? "text-[var(--terracotta)]"
                      : "text-[var(--espresso-60)]"
                  )}
                  style={{
                    fontSize: "10px",
                    marginLeft: "6px",
                  }}
                >
                  {category.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

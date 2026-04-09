"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

const categories = [
  { id: "viennoiseries", name: "Viennoiseries", emoji: "\u{1F950}" },
  { id: "salades", name: "Salades", emoji: "\u{1F957}" },
  { id: "sandwichs", name: "Sandwichs", emoji: "\u{1F959}" },
  { id: "chaud", name: "Chaud", emoji: "\u{1FAD5}" },
  { id: "desserts", name: "Desserts", emoji: "\u{1F36E}" },
]

export function CategoryNav() {
  const [activeId, setActiveId] = useState<string>(categories[0].id)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
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

    categories.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  const scrollToCategory = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 160
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: "smooth" })
    }
  }

  return (
    <nav className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => scrollToCategory(category.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeId === category.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary hover:bg-border text-foreground"
              )}
            >
              <span>{category.emoji}</span>
              <span className="hidden sm:inline">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

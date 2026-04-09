"use client"

import { categories } from "@/lib/products"

export function CategoryNav() {
  const scrollToCategory = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 140 // Header + nav height
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
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary hover:bg-border text-sm font-medium text-foreground whitespace-nowrap transition-colors"
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

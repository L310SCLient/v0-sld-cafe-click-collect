"use client"

import { useState } from "react"
import { Search } from "lucide-react"

export function CarteSearchClient() {
  const [query, setQuery] = useState("")

  return (
    <div className="relative w-full sm:w-72">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--espresso-40)] pointer-events-none"
        style={{ width: "15px", height: "15px" }}
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un produit…"
        className="w-full rounded-[var(--radius-pill)] bg-[var(--creme-surface)] border border-[var(--espresso-08)] text-[var(--espresso)] placeholder:text-[var(--espresso-40)] font-[family-name:var(--font-sans)] outline-none focus:border-[var(--sable)] transition-colors"
        style={{
          fontSize: "14px",
          padding: "9px 14px 9px 36px",
          boxShadow: "var(--shadow-xs)",
        }}
      />
    </div>
  )
}

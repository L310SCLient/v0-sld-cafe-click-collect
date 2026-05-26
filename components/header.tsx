"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag } from "lucide-react"
import { useState, useEffect } from "react"
import { useCart } from "./cart-provider"
import { cn } from "@/lib/utils"

export function Header() {
  const pathname = usePathname()
  const { totalItems, setIsCartOpen } = useCart()
  const [prevCount, setPrevCount] = useState(totalItems)
  const [badgeBounce, setBadgeBounce] = useState(false)

  useEffect(() => {
    if (totalItems > prevCount) {
      setBadgeBounce(true)
      const t = setTimeout(() => setBadgeBounce(false), 300)
      return () => clearTimeout(t)
    }
    setPrevCount(totalItems)
  }, [totalItems, prevCount])

  useEffect(() => {
    setPrevCount(totalItems)
  }, [totalItems])

  if (pathname.startsWith("/admin")) return null

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
      style={{
        backgroundColor: "color-mix(in srgb, var(--creme-surface) 95%, transparent)",
        borderBottom: "1px solid var(--sable-soft)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="flex items-baseline gap-0.5 shrink-0">
            <span className="font-serif text-xl font-normal leading-none" style={{ color: "var(--espresso)" }}>
              SLD
            </span>
            <span className="font-serif italic text-xl leading-none" style={{ color: "var(--terracotta)" }}>
              .
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest ml-1" style={{ color: "var(--espresso-60)" }}>
              CAF&Eacute;
            </span>
          </Link>

          {/* Right: status + cart */}
          <div className="flex items-center gap-3">
            <span
              className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--espresso-60)" }}
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--status-ready)" }} />
              OUVERT &middot; jusqu&apos;&agrave; 14:30
            </span>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors rounded-full bg-[var(--terracotta)] hover:bg-[var(--terracotta-hover)]"
              aria-label="Ouvrir le panier"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Panier</span>
              {totalItems > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold transition-transform",
                    badgeBounce && "scale-125",
                  )}
                  style={{ backgroundColor: "var(--creme-surface)", color: "var(--terracotta)" }}
                >
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

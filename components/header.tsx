"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useCart } from "./cart-provider"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/carte", label: "La carte" },
  { href: "/formules", label: "Les formules" },
  { href: "/contact", label: "Contact" },
]

export function Header() {
  const pathname = usePathname()
  const { totalItems, setIsCartOpen } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [prevCount, setPrevCount] = useState(totalItems)
  const [badgeBounce, setBadgeBounce] = useState(false)

  /* Close mobile menu on route change */
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  /* Animate badge on item count increase */
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

  /* Hide header on admin pages */
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

          {/* ---- Brand mark ---- */}
          <Link href="/" className="flex items-baseline gap-0.5 shrink-0">
            <span
              className="font-serif text-xl font-normal leading-none"
              style={{ color: "var(--espresso)" }}
            >
              SLD
            </span>
            <span
              className="font-serif italic text-xl leading-none"
              style={{ color: "var(--terracotta)" }}
            >
              .
            </span>
            <span
              className="font-mono text-[10px] uppercase tracking-widest ml-1"
              style={{ color: "var(--espresso-60)" }}
            >
              CAFÉ
            </span>
          </Link>

          {/* ---- Desktop nav (centred) ---- */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const isActive =
                item.href === "/#catalogue"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/")

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative text-sm font-normal transition-colors pb-0.5"
                  style={{
                    color: isActive ? "var(--terracotta)" : "var(--espresso-80)",
                  }}
                >
                  {item.label}
                  {isActive && (
                    <span
                      className="absolute inset-x-0 bottom-0 h-px"
                      style={{ backgroundColor: "var(--terracotta)" }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* ---- Right cluster ---- */}
          <div className="flex items-center gap-3">
            {/* Opening status pill — desktop only */}
            <span
              className="hidden lg:inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--espresso-60)" }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: "var(--status-ready)" }}
              />
              OUVERT &middot; jusqu&apos;à 14:30
            </span>

            {/* Cart button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{
                backgroundColor: "var(--terracotta)",
                borderRadius: "var(--radius-pill)",
              }}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "var(--terracotta-hover)")
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "var(--terracotta)")
              }
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
                  style={{
                    backgroundColor: "var(--creme-surface)",
                    color: "var(--terracotta)",
                  }}
                >
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full transition-colors"
              style={{ color: "var(--espresso)" }}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* ---- Mobile menu slide-down ---- */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen ? "max-h-72 pb-4" : "max-h-0",
          )}
          style={
            mobileMenuOpen
              ? { borderTop: "1px solid var(--espresso-20)" }
              : {}
          }
        >
          <nav className="pt-4 flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/#catalogue"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/")

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-3 text-sm font-normal rounded-[var(--radius-sm)] transition-colors"
                  style={{
                    color: isActive ? "var(--terracotta)" : "var(--espresso-80)",
                    backgroundColor: isActive ? "var(--espresso-08)" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              )
            })}

            {/* Opening status in mobile menu */}
            <div
              className="mt-3 px-2 pt-3"
              style={{ borderTop: "1px solid var(--espresso-20)" }}
            >
              <span
                className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--espresso-60)" }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--status-ready)" }}
                />
                OUVERT &middot; jusqu&apos;à 14:30
              </span>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

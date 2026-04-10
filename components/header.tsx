"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"
import { useCart } from "./cart-provider"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/#catalogue", label: "Commander" },
  { href: "/histoire", label: "Notre histoire" },
  { href: "/contact", label: "Contact" },
]

export function Header() {
  const pathname = usePathname()
  const { totalItems, setIsCartOpen } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [prevCount, setPrevCount] = useState(totalItems)
  const [badgeBounce, setBadgeBounce] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const isHome = pathname === "/"
  // On the homepage we overlay the hero and stay transparent until scroll.
  // Everywhere else the header is always solid.
  const transparent = isHome && !scrolled && !mobileMenuOpen

  useEffect(() => {
    if (!isHome) {
      setScrolled(true)
      return
    }
    setScrolled(window.scrollY > 40)
    function onScroll() {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [isHome])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Animate badge on item count change
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

  // Hide header on admin pages
  if (pathname.startsWith("/admin")) return null

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        transparent
          ? "bg-transparent"
          : "bg-white/95 backdrop-blur-md shadow-sm border-b border-stone-200/60",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span
              className={cn(
                "font-serif text-2xl font-semibold italic tracking-tight transition-colors",
                transparent ? "text-white" : "text-stone-900",
              )}
            >
              SLD Caf&eacute;
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium tracking-wide transition-colors",
                  transparent
                    ? "text-white/90 hover:text-white"
                    : "text-stone-600 hover:text-amber-700",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Cart Button + Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className={cn(
                "relative p-2 rounded-full transition-colors",
                transparent
                  ? "hover:bg-white/10 text-white"
                  : "hover:bg-stone-100 text-stone-900",
              )}
              aria-label="Ouvrir le panier"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 h-5 w-5 rounded-full bg-amber-600 text-white text-xs font-medium flex items-center justify-center transition-transform",
                    badgeBounce && "scale-125",
                  )}
                >
                  {totalItems}
                </span>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "md:hidden p-2 rounded-full transition-colors",
                transparent
                  ? "hover:bg-white/10 text-white"
                  : "hover:bg-stone-100 text-stone-900",
              )}
              aria-label={
                mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"
              }
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation - slide down */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen
              ? "max-h-72 pb-4 border-t border-stone-200/60"
              : "max-h-0",
          )}
        >
          <nav className="pt-4">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium rounded-lg text-stone-700 hover:bg-stone-100 hover:text-amber-700 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

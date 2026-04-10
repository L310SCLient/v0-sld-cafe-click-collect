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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF7]/95 backdrop-blur-sm border-b border-stone-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="font-serif text-xl font-normal tracking-tight text-stone-900">
              SLD Caf&eacute;
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-normal text-stone-700 hover:text-stone-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Cart Button + Mobile Menu */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full hover:bg-stone-100 text-stone-800 transition-colors"
              aria-label="Ouvrir le panier"
            >
              <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
              {totalItems > 0 && (
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-stone-800 text-white text-[10px] font-medium flex items-center justify-center transition-transform",
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
              className="md:hidden p-2 rounded-full hover:bg-stone-100 text-stone-800 transition-colors"
              aria-label={
                mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"
              }
            >
              {mobileMenuOpen ? (
                <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
              ) : (
                <Menu className="h-[18px] w-[18px]" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation - slide down */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileMenuOpen
              ? "max-h-72 pb-4 border-t border-stone-200/70"
              : "max-h-0",
          )}
        >
          <nav className="pt-4">
            <div className="flex flex-col">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-3 text-sm font-normal text-stone-700 hover:text-stone-900 transition-colors"
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

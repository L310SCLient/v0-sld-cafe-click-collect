'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { adminLogout } from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import {
  ShoppingCart,
  LayoutGrid,
  Star,
  Flame,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/admin/commandes', label: 'Commandes', icon: ShoppingCart },
  { href: '/admin/produits', label: 'Produits', icon: LayoutGrid },
  { href: '/admin/formules', label: 'Formules', icon: Star },
  { href: '/admin/plat-du-jour', label: 'Plat du jour', icon: Flame },
  { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
]

interface AdminNavProps {
  pendingCount: number
}

function NavLink({
  item,
  isActive,
  count,
  onClick,
}: {
  item: typeof navItems[number]
  isActive: boolean
  count: number
  onClick?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px]',
        isActive ? 'text-white' : 'active:opacity-70'
      )}
      style={{
        backgroundColor: isActive ? 'var(--terracotta)' : 'transparent',
        color: isActive ? '#ffffff' : 'rgba(252,250,244,0.8)',
      }}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      <span style={{ fontSize: '15px', fontWeight: 500 }}>{item.label}</span>
      {count > 0 && (
        <span
          className="ml-auto rounded-full flex items-center justify-center min-w-[22px] h-[22px] px-1"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: isActive ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.18)',
            color: '#ffffff',
          }}
        >
          {count}
        </span>
      )}
    </Link>
  )
}

function SidebarContent({ pathname, pendingCount, onNavigate }: { pathname: string; pendingCount: number; onNavigate?: () => void }) {
  return (
    <>
      {/* Brand */}
      <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <h1 className="font-medium leading-tight" style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--creme-surface)' }}>
          SLD Caf&eacute;
        </h1>
        <p className="mt-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--sable)', letterSpacing: '0.08em' }}>
          admin &middot; v 1.0
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
            count={item.href === '/admin/commandes' ? pendingCount : 0}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* Service status */}
      <div className="mx-3 mb-3 px-4 py-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--status-ready)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#ffffff', fontWeight: 500 }}>
            Service en cours
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--sable)' }}>
          Midi &middot; 11h30 &rarr; 14h30
        </p>
      </div>

      {/* User + logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center gap-3 px-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
            style={{ backgroundColor: 'var(--sable)', color: 'var(--espresso)', fontFamily: 'var(--font-mono)' }}
          >
            S
          </div>
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--creme-surface)' }}>
              Sylvain Lambert
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--sable)' }}>
              fondateur
            </p>
          </div>
        </div>
        <form action={adminLogout}>
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg transition-colors min-h-[44px] active:opacity-70"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(252,250,244,0.6)' }}
          >
            <LogOut className="h-4 w-4" />
            D&eacute;connexion
          </button>
        </form>
      </div>
    </>
  )
}

export function AdminNav({ pendingCount }: AdminNavProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* ─── Desktop / Tablet landscape (>=1024px): fixed sidebar ────── */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 z-30"
        style={{ backgroundColor: 'var(--espresso)' }}
      >
        <SidebarContent pathname={pathname} pendingCount={pendingCount} />
      </aside>

      {/* ─── Tablet portrait / Mobile (<1024px): hamburger + drawer ──── */}
      <div className="lg:hidden">
        {/* Top bar with hamburger */}
        <div
          className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 h-14"
          style={{
            backgroundColor: 'var(--espresso)',
            borderBottom: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-11 h-11 rounded-lg active:opacity-70"
            style={{ color: 'var(--creme-surface)' }}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="font-medium" style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--creme-surface)' }}>
            SLD Caf&eacute;
          </h1>
        </div>

        {/* Drawer overlay */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Drawer panel */}
        <div
          className={cn(
            'fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col transition-transform duration-300 ease-out',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{ backgroundColor: 'var(--espresso)' }}
        >
          {/* Close button */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="absolute top-3 right-3 flex items-center justify-center w-10 h-10 rounded-lg active:opacity-70 z-10"
            style={{ color: 'rgba(252,250,244,0.6)' }}
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>

          <SidebarContent
            pathname={pathname}
            pendingCount={pendingCount}
            onNavigate={() => setDrawerOpen(false)}
          />
        </div>
      </div>
    </>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminLogout } from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import {
  ShoppingCart,
  LayoutGrid,
  Star,
  Flame,
  Settings,
  LogOut,
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

export function AdminNav({ pendingCount }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 z-30"
        style={{ backgroundColor: 'var(--espresso)' }}>

        {/* Brand */}
        <div className="px-6 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <h1
            className="font-medium leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              color: 'var(--creme-surface)',
            }}
          >
            SLD Café
          </h1>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--sable)',
              letterSpacing: '0.08em',
            }}
          >
            admin · v 1.0
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const count = item.href === '/admin/commandes' ? pendingCount : 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'text-white'
                    : 'hover:text-white'
                )}
                style={{
                  backgroundColor: isActive ? 'var(--terracotta)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(252,250,244,0.8)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = '#ffffff'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.color = 'rgba(252,250,244,0.8)'
                  }
                }}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
                {count > 0 && (
                  <span
                    className="ml-auto rounded-full flex items-center justify-center min-w-[20px] h-5 px-1"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 500,
                      backgroundColor: isActive ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.18)',
                      color: '#ffffff',
                    }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Service status */}
        <div
          className="mx-3 mb-3 px-3 py-3 rounded-lg"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--status-ready)' }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: '#ffffff',
                fontWeight: 500,
              }}
            >
              Service en cours
            </span>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--sable)',
            }}
          >
            Midi · 11h30 → 14h30
          </p>
        </div>

        {/* User + logout */}
        <div
          className="px-3 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="flex items-center gap-3 px-2 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
              style={{
                backgroundColor: 'var(--sable)',
                color: 'var(--espresso)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              S
            </div>
            <div className="min-w-0">
              <p
                className="truncate"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--creme-surface)',
                }}
              >
                Sylvain Lambert
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--sable)',
                }}
              >
                fondateur
              </p>
            </div>
          </div>

          <form action={adminLogout}>
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-2 py-2 rounded-lg transition-colors"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'rgba(252,250,244,0.6)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = '#ffffff'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = 'rgba(252,250,244,0.6)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30"
        style={{
          backgroundColor: 'var(--espresso)',
          borderTop: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const count = item.href === '/admin/commandes' ? pendingCount : 0

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors relative"
                style={{ color: isActive ? '#ffffff' : 'rgba(252,250,244,0.5)' }}
              >
                <item.icon className="h-5 w-5" />
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }} className="truncate max-w-[4rem]">
                  {item.label}
                </span>
                {count > 0 && (
                  <span
                    className="absolute -top-1 right-0 flex h-4 w-4 items-center justify-center rounded-full text-white"
                    style={{
                      backgroundColor: 'var(--terracotta)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      fontWeight: 600,
                    }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
          <form action={adminLogout}>
            <button
              type="submit"
              className="flex flex-col items-center gap-1 px-2 py-1.5"
              style={{ color: 'rgba(252,250,244,0.5)' }}
            >
              <LogOut className="h-5 w-5" />
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}>Sortir</span>
            </button>
          </form>
        </div>
      </nav>
    </>
  )
}

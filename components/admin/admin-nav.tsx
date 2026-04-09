'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { adminLogout } from '@/app/actions/admin'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  Package,
  UtensilsCrossed,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/admin/commandes', label: 'Commandes', icon: ClipboardList },
  { href: '/admin/produits', label: 'Produits', icon: Package },
  { href: '/admin/plat-du-jour', label: 'Plat du jour', icon: UtensilsCrossed },
  { href: '/admin/parametres', label: 'Parametres', icon: Settings },
]

interface AdminNavProps {
  pendingCount: number
}

export function AdminNav({ pendingCount }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#1C1C1C] text-white z-30">
        <div className="px-6 py-6 border-b border-white/10">
          <h1 className="font-serif text-xl font-semibold">SLD Cafe</h1>
          <p className="text-sm text-stone-400 mt-0.5">Administration</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-stone-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
                {item.href === '/admin/commandes' && pendingCount > 0 && (
                  <Badge className="ml-auto bg-orange-500 text-white border-0 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <form action={adminLogout}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-3 text-stone-400 hover:text-white hover:bg-white/5"
            >
              <LogOut className="h-5 w-5" />
              Deconnexion
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile/tablet bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[#1C1C1C] border-t border-white/10 z-30 safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative',
                  isActive ? 'text-white' : 'text-stone-500'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate max-w-[4rem]">{item.label}</span>
                {item.href === '/admin/commandes' && pendingCount > 0 && (
                  <span className="absolute -top-1 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )
          })}
          <form action={adminLogout}>
            <button
              type="submit"
              className="flex flex-col items-center gap-1 px-3 py-1.5 text-stone-500 text-xs font-medium"
            >
              <LogOut className="h-5 w-5" />
              <span>Sortir</span>
            </button>
          </form>
        </div>
      </nav>
    </>
  )
}

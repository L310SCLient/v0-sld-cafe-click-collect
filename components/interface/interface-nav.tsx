'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Carrot, ClipboardList, FileText, LogOut, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import { interfaceLogout } from '@/app/actions/interface-auth'

const NAV_ITEMS = [
  { href: '/interface/factures', label: 'Factures', icon: FileText },
  { href: '/interface/ingredients', label: 'Ingrédients', icon: Carrot },
  { href: '/interface/recettes', label: 'Recettes', icon: ClipboardList },
  { href: '/interface/comparatif', label: 'Comparatif', icon: Scale },
]

export function InterfaceNav() {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  return (
    <header
      className="sticky top-0 z-20"
      style={{
        backgroundColor: 'var(--creme-surface)',
        borderBottom: '1px solid var(--espresso-20)',
      }}
    >
      <div className="flex items-center gap-1 px-2 sm:px-5" style={{ minHeight: '56px' }}>
        <span
          className="font-serif mr-2 hidden sm:block"
          style={{ fontSize: '17px', color: 'var(--espresso)' }}
        >
          Cuisine
        </span>

        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                // Le squelette d'attente rend le préchargement utile : Next
                // récupère l'onglet avant le toucher, au lieu d'attendre le
                // clic pour commencer.
                prefetch
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 transition-colors shrink-0 whitespace-nowrap',
                  !isActive && 'active:opacity-70'
                )}
                style={{
                  minHeight: '44px',
                  backgroundColor: isActive ? 'var(--terracotta)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--espresso-80)',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={() => startTransition(() => interfaceLogout())}
          disabled={isPending}
          aria-label="Fermer la session"
          className="flex items-center justify-center rounded-full active:opacity-70 disabled:opacity-40"
          style={{ width: '44px', height: '44px', color: 'var(--espresso-60)' }}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  )
}

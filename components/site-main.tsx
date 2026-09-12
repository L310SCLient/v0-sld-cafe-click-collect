'use client'

import { usePathname } from 'next/navigation'

/**
 * Conteneur principal du site.
 *
 * Le `pt-16` réserve la place du header public, qui est en position fixe.
 * L'interface cuisine n'affiche pas ce header (elle a sa propre barre) :
 * garder le décalage y laisserait une bande vide en haut d'écran.
 */
export function SiteMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasSiteHeader = !pathname.startsWith('/interface')

  return (
    <main className={hasSiteHeader ? 'min-h-screen pt-16' : 'min-h-screen'}>{children}</main>
  )
}

import type { Metadata } from 'next'

/**
 * Manifeste propre à la cuisine.
 *
 * iOS n'ajoute jamais à l'écran d'accueil la page où l'on se trouve : il suit
 * le `start_url` du manifeste déclaré. Avec celui de la racine, le raccourci
 * ouvrait donc la boutique publique, même créé depuis /interface. Un second
 * manifeste, déclaré sur ces pages seulement, donne une icône « Cuisine » qui
 * ouvre directement l'écran de code, à côté de celle du site.
 */
export const metadata: Metadata = {
  title: 'Cuisine — SLD Café',
  manifest: '/cuisine.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cuisine',
  },
  // iOS ignore les SVG pour l'écran d'accueil : c'est ce PNG 180x180 qui sera
  // posé sur le téléphone.
  icons: { apple: '/apple-icon.png' },
  // Une interface interne n'a rien à faire dans un moteur de recherche.
  robots: { index: false, follow: false },
}

export default function InterfaceRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

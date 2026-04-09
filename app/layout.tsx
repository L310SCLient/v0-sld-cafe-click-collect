import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Header } from '@/components/header'
import { CartProvider } from '@/components/cart-provider'
import { CartSidebar } from '@/components/cart-sidebar'
import { Toaster } from '@/components/ui/sonner'

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-sans',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#5c3a1e',
}

export const metadata: Metadata = {
  title: 'SLD Cafe | Click & Collect Toulouse',
  description: 'Commandez vos viennoiseries, sandwichs et salades en ligne et recuperez-les au SLD Cafe a Toulouse.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SLD Cafe',
  },
  openGraph: {
    title: 'SLD Cafe | Click & Collect Toulouse',
    description: 'Commandez vos viennoiseries, sandwichs et salades en ligne et recuperez-les au SLD Cafe a Toulouse.',
    url: 'https://sldcafe.fr',
    siteName: 'SLD Cafe',
    locale: 'fr_FR',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${playfair.variable} ${inter.variable} font-sans antialiased`}>
        <CartProvider>
          <Header />
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <CartSidebar />
        </CartProvider>
        <Toaster position="bottom-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

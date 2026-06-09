import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Header } from '@/components/header'
import { CartProvider } from '@/components/cart-provider'
import { CartSidebar } from '@/components/cart-sidebar'
import { Toaster } from '@/components/ui/sonner'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#241E1A',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'SLD Café | Click & Collect Toulouse',
  description: 'Commandez vos viennoiseries, sandwichs et salades en ligne et récupérez-les au SLD Café à Toulouse.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SLD Café',
  },
  openGraph: {
    title: 'SLD Café | Click & Collect Toulouse',
    description: 'Commandez vos viennoiseries, sandwichs et salades en ligne et récupérez-les au SLD Café à Toulouse.',
    url: 'https://sldcafe.fr',
    siteName: 'SLD Café',
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
    apple: '/icons/apple-touch-icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body
        className={`${playfair.variable} ${hanken.variable} ${jetbrains.variable} font-sans antialiased`}
      >
        <CartProvider>
          <Header />
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <CartSidebar />
        </CartProvider>
        <Toaster position="bottom-right" />
        <PwaInstallPrompt />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

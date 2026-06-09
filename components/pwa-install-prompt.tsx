'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed silently
      })
    }

    // Listen for install prompt
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)

      // Show on 2nd visit
      const visits = parseInt(localStorage.getItem('sld-visits') ?? '0', 10)
      localStorage.setItem('sld-visits', String(visits + 1))
      const dismissed = localStorage.getItem('sld-install-dismissed')
      if (visits >= 1 && !dismissed) {
        setShowBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShowBanner(false)
    localStorage.setItem('sld-install-dismissed', '1')
  }

  if (!showBanner) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl md:left-auto md:right-6 md:max-w-sm"
      style={{
        backgroundColor: 'var(--espresso)',
        color: 'var(--creme-surface)',
        boxShadow: '0 12px 40px rgba(36,30,26,0.3)',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
      }}
    >
      <Download className="h-5 w-5 shrink-0" style={{ color: 'var(--sable)' }} />
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 500 }}>
          Installer SLD Caf&eacute;
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--sable)', marginTop: '2px' }}>
          Acc&egrave;s rapide depuis l&apos;&eacute;cran d&apos;accueil
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors"
        style={{
          backgroundColor: 'var(--terracotta)',
          color: '#fff',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
        }}
      >
        Installer
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-full transition-opacity hover:opacity-70"
        aria-label="Fermer"
        style={{ color: 'var(--sable)' }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

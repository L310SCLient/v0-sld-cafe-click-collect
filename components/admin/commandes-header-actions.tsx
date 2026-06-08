'use client'

import { useState } from 'react'
import { Plus, Store } from 'lucide-react'
import { NotificationsPanel } from './notifications-panel'
import { ManualOrderModal } from './manual-order-modal'

interface CommandesHeaderActionsProps {
  pendingCount: number
}

export function CommandesHeaderActions({ pendingCount }: CommandesHeaderActionsProps) {
  const [manualOrderOpen, setManualOrderOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2 mt-2">
        {/* Boutique ouverte indicator */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--creme-surface)',
            border: '1px solid var(--sable-soft)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Store className="h-4 w-4" style={{ color: 'var(--status-ready)' }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--espresso)',
            }}
          >
            Boutique ouverte
          </span>
        </div>

        {/* Notifications */}
        <NotificationsPanel initialPendingCount={pendingCount} />

        {/* Manual order */}
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors bg-[var(--terracotta)] hover:bg-[var(--terracotta-hover)] text-white shadow-[var(--shadow-xs)]"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 500,
          }}
          onClick={() => setManualOrderOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Commande manuelle
        </button>
      </div>

      {/* Manual order modal */}
      <ManualOrderModal
        open={manualOrderOpen}
        onClose={() => setManualOrderOpen(false)}
      />
    </>
  )
}

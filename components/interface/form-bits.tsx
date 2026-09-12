'use client'

import type { PriceSource } from '@/types'

/** Briques de formulaire partagées, alignées sur le style de la section admin. */

export const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '15px',
  backgroundColor: 'var(--creme-surface)',
  border: '1px solid var(--espresso-20)',
  color: 'var(--espresso)',
  borderRadius: 'var(--radius-md)',
  padding: '12px 14px',
  width: '100%',
  minHeight: '46px',
}

export function FieldLabel({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode
  htmlFor?: string
  hint?: string
}) {
  return (
    <label htmlFor={htmlFor} className="block mb-1.5">
      <span
        className="uppercase tracking-wider"
        style={{ fontSize: '10px', color: 'var(--espresso-60)', fontWeight: 600 }}
      >
        {children}
      </span>
      {hint && (
        <span className="block mt-0.5" style={{ fontSize: '11px', color: 'var(--espresso-40)' }}>
          {hint}
        </span>
      )}
    </label>
  )
}

export function PrimaryButton({
  children,
  disabled,
  type = 'submit',
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  type?: 'submit' | 'button'
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full px-5 active:scale-[0.98] transition-transform disabled:opacity-40"
      style={{
        minHeight: '46px',
        backgroundColor: 'var(--terracotta)',
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  onClick,
  disabled,
  danger,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex items-center justify-center gap-1.5 rounded-full px-3 active:opacity-70 disabled:opacity-40"
      style={{
        minHeight: '40px',
        border: '1px solid var(--espresso-20)',
        backgroundColor: 'transparent',
        color: danger ? '#B4302A' : 'var(--espresso-80)',
        fontSize: '13px',
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  )
}

const PRICE_BADGES: Record<'facture' | 'manuelle' | 'absent', { label: string; color: string; bg: string }> =
  {
    facture: { label: 'facture', color: '#2F6B4F', bg: '#2F6B4F1A' },
    manuelle: { label: 'saisi à la main', color: '#8A5A1B', bg: '#8A5A1B1A' },
    absent: { label: 'prix manquant', color: '#B4302A', bg: '#B4302A1A' },
  }

/**
 * Provenance du prix, toujours visible. Un coût sans provenance affichée
 * laisserait croire qu'un chiffre déclaratif vaut une donnée de facture.
 */
export function PriceBadge({ source }: { source: PriceSource | null }) {
  const badge = PRICE_BADGES[source ?? 'absent']
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 whitespace-nowrap"
      style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.03em',
        color: badge.color,
        backgroundColor: badge.bg,
      }}
    >
      {badge.label}
    </span>
  )
}

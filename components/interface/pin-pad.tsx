'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Delete } from 'lucide-react'
import { interfaceLogin } from '@/app/actions/interface-auth'

const PIN_LENGTH = 4
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * Saisie du code d'accès.
 *
 * Clavier dessiné dans la page plutôt que le clavier système : en cuisine
 * c'est une tablette ou un téléphone posé, souvent avec les mains occupées.
 * Cibles tactiles larges, validation dès le 4e chiffre.
 */
export function PinPad() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [isPending, startTransition] = useTransition()

  const submit = useCallback(
    (code: string) => {
      startTransition(async () => {
        const result = await interfaceLogin(code)
        if (result.ok) {
          router.replace('/interface/ingredients')
          return
        }
        setError(result.error ?? 'Code refusé.')
        setPin('')
        setShake(true)
      })
    },
    [router]
  )

  useEffect(() => {
    if (pin.length === PIN_LENGTH && !isPending) {
      submit(pin)
    }
  }, [pin, isPending, submit])

  useEffect(() => {
    if (!shake) return
    const timer = setTimeout(() => setShake(false), 400)
    return () => clearTimeout(timer)
  }, [shake])

  function press(digit: string) {
    if (isPending || pin.length >= PIN_LENGTH) return
    setError('')
    setPin((current) => current + digit)
  }

  function backspace() {
    if (isPending) return
    setError('')
    setPin((current) => current.slice(0, -1))
  }

  // Clavier physique accepté aussi : l'interface tourne parfois sur un poste fixe.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (/^[0-9]$/.test(event.key)) {
        press(event.key)
      } else if (event.key === 'Backspace') {
        backspace()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: 'var(--creme-bg)' }}
    >
      <div className="w-full max-w-[320px]">
        <div className="text-center mb-10">
          <h1
            className="font-serif"
            style={{ fontSize: '28px', color: 'var(--espresso)', lineHeight: 1.1 }}
          >
            Cuisine
          </h1>
          <p
            className="mt-2 uppercase tracking-widest"
            style={{ fontSize: '11px', color: 'var(--espresso-60)', fontFamily: 'var(--font-mono)' }}
          >
            Code d&apos;accès
          </p>
        </div>

        {/* Pastilles */}
        <div
          className="flex items-center justify-center gap-4 mb-3"
          style={shake ? { animation: 'sld-shake 0.4s ease-in-out' } : undefined}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, index) => {
            const filled = index < pin.length
            return (
              <span
                key={index}
                className="rounded-full transition-all"
                style={{
                  width: filled ? '16px' : '14px',
                  height: filled ? '16px' : '14px',
                  backgroundColor: filled ? 'var(--terracotta)' : 'transparent',
                  border: filled ? 'none' : '1.5px solid var(--espresso-40)',
                }}
              />
            )
          })}
        </div>

        <p
          className="text-center mb-8 min-h-[34px] px-2"
          style={{ fontSize: '13px', color: '#B4302A', lineHeight: 1.3 }}
          role="status"
          aria-live="polite"
        >
          {isPending ? '' : error}
        </p>

        {/* Clavier */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((key) => (
            <PadButton key={key} onClick={() => press(key)} disabled={isPending}>
              {key}
            </PadButton>
          ))}
          <span />
          <PadButton onClick={() => press('0')} disabled={isPending}>
            0
          </PadButton>
          <PadButton onClick={backspace} disabled={isPending} label="Effacer un chiffre">
            <Delete className="h-5 w-5" strokeWidth={1.6} />
          </PadButton>
        </div>
      </div>
    </div>
  )
}

function PadButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex items-center justify-center rounded-full active:scale-95 transition-transform disabled:opacity-40"
      style={{
        aspectRatio: '1 / 1',
        backgroundColor: 'var(--creme-surface)',
        border: '1px solid var(--espresso-20)',
        color: 'var(--espresso)',
        fontFamily: 'var(--font-mono)',
        fontSize: '22px',
        touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  )
}

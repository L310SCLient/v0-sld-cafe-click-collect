'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createManualOrder } from '@/app/actions/orders'
import { getTimeSlots } from '@/lib/utils'
import type { Product, OrderItem } from '@/types'
import { toast } from 'sonner'

const SLOTS = getTimeSlots('11:30', '14:30', 15)

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  backgroundColor: 'var(--creme-surface)',
  border: '1px solid var(--espresso-20)',
  color: 'var(--espresso)',
  borderRadius: 'var(--radius-md)',
  padding: '11px 14px',
  width: '100%',
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-1 uppercase tracking-wider"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--espresso-60)',
        letterSpacing: '0.07em',
      }}
    >
      {children}
    </label>
  )
}

interface OrderLine {
  clientId: string
  productId: string
  name: string
  price: number
  quantity: number
}

interface ManualOrderModalProps {
  open: boolean
  onClose: () => void
}

export function ManualOrderModal({ open, onClose }: ManualOrderModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [pickupTime, setPickupTime] = useState('immédiat')
  const [lines, setLines] = useState<OrderLine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [saving, setSaving] = useState(false)

  // Fetch available products
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('display_order')
      .then(({ data }) => {
        const prods = (data ?? []) as Product[]
        setProducts(prods)
        if (prods.length > 0) setSelectedProductId(prods[0].id)
      })
  }, [open])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setFirstName('')
      setLastName('')
      setPhone('')
      setPickupTime('immédiat')
      setLines([])
      setSaving(false)
    }
  }, [open])

  function addLine() {
    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    // If already in list, increment quantity
    const existing = lines.find((l) => l.productId === product.id)
    if (existing) {
      setLines((prev) =>
        prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        )
      )
      return
    }

    setLines((prev) => [
      ...prev,
      {
        clientId: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      },
    ])
  }

  function removeLine(clientId: string) {
    setLines((prev) => prev.filter((l) => l.clientId !== clientId))
  }

  function updateQuantity(clientId: string, quantity: number) {
    if (quantity < 1) {
      removeLine(clientId)
      return
    }
    setLines((prev) =>
      prev.map((l) => (l.clientId === clientId ? { ...l, quantity } : l))
    )
  }

  const totalCents = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()

    if (!firstName.trim()) {
      toast.error('Le nom du client est requis')
      return
    }
    if (lines.length === 0) {
      toast.error('Ajoutez au moins un produit')
      return
    }

    setSaving(true)

    // Determine pickup time
    const now = new Date()
    const resolvedPickupTime =
      pickupTime === 'immédiat'
        ? `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
        : pickupTime

    const items: OrderItem[] = lines.map((l) => ({
      product_id: l.productId,
      name: l.name,
      price: l.price,
      quantity: l.quantity,
    }))

    const result = await createManualOrder({
      firstName: firstName.trim(),
      lastName: lastName.trim() || 'Comptoir',
      phone: phone.trim() || undefined,
      items,
      totalCents,
      pickupTime: resolvedPickupTime,
    })

    if ('error' in result) {
      toast.error(result.error)
      setSaving(false)
      return
    }

    toast.success('Commande créée')
    setSaving(false)
    onClose()
  }

  if (!open) return null

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,18,8,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={handleBackdrop}
    >
      <div
        style={{
          backgroundColor: 'var(--creme-bg)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--sable-soft)',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: '1px solid var(--espresso-08)' }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 500,
              color: 'var(--espresso)',
            }}
          >
            Commande en caisse
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--argile)',
              color: 'var(--espresso-60)',
              border: '1px solid var(--espresso-20)',
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
          {/* Customer info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mo-fname">Nom du client *</FieldLabel>
              <input
                id="mo-fname"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                required
                className="focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel htmlFor="mo-lname">Nom de famille</FieldLabel>
              <input
                id="mo-lname"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom (optionnel)"
                className="focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="mo-phone">Téléphone</FieldLabel>
              <input
                id="mo-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel htmlFor="mo-pickup">Créneau de retrait</FieldLabel>
              <select
                id="mo-pickup"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="focus:outline-none"
                style={inputStyle}
              >
                <option value="immédiat">Immédiat</option>
                {SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Product selector */}
          <div style={{ borderTop: '1px solid var(--espresso-08)', paddingTop: '16px' }}>
            <div className="flex items-center justify-between mb-3">
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--espresso-60)',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                Articles · {lines.length}
              </p>
            </div>

            <div className="flex gap-2 mb-3">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="focus:outline-none flex-1"
                style={{ ...inputStyle, padding: '9px 12px' }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatPriceCents(p.price)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors shrink-0"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: 'var(--argile)',
                  color: 'var(--espresso)',
                  border: '1px solid var(--espresso-20)',
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </button>
            </div>

            {/* Lines */}
            {lines.length === 0 ? (
              <p
                className="py-4 text-center"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--espresso-40)',
                  backgroundColor: 'var(--argile)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--espresso-20)',
                }}
              >
                Aucun article ajouté
              </p>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <div
                    key={line.clientId}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{
                      backgroundColor: 'var(--creme-surface)',
                      border: '1px solid var(--espresso-08)',
                    }}
                  >
                    <span
                      className="flex-1 truncate"
                      style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--espresso)' }}
                    >
                      {line.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.clientId, line.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded text-sm"
                        style={{
                          backgroundColor: 'var(--argile)',
                          color: 'var(--espresso-60)',
                          border: '1px solid var(--espresso-20)',
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          minWidth: '24px',
                          textAlign: 'center',
                          color: 'var(--espresso)',
                        }}
                      >
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.clientId, line.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded text-sm"
                        style={{
                          backgroundColor: 'var(--argile)',
                          color: 'var(--espresso-60)',
                          border: '1px solid var(--espresso-20)',
                        }}
                      >
                        +
                      </button>
                    </div>
                    <span
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--espresso-60)', minWidth: '60px', textAlign: 'right' }}
                    >
                      {formatPriceCents(line.price * line.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.clientId)}
                      className="w-6 h-6 flex items-center justify-center rounded"
                      style={{ color: '#B91C1C' }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total + submit */}
          <div
            className="flex items-center justify-between pt-4"
            style={{ borderTop: '1px solid var(--espresso-08)' }}
          >
            <div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--espresso-60)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total
              </p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 500, color: 'var(--espresso)' }}>
                {formatPriceCents(totalCents)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl transition-colors"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: 'var(--argile)',
                  color: 'var(--espresso-60)',
                  border: '1px solid var(--espresso-20)',
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--terracotta)',
                  color: '#ffffff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer la commande'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { setDailySpecial, clearDailySpecial } from '@/app/actions/daily-specials'
import type { Product, DailySpecial } from '@/types'
import { Trash2, CalendarPlus, Upload, X, Flame } from 'lucide-react'
import { toast } from 'sonner'

// ─── helpers ─────────────────────────────────────────────────────────────────

type Mode = 'product' | 'custom'
const BUCKET = 'product-images'
const UPLOAD_PREFIX = 'daily-specials'

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function specialDisplayName(s: DailySpecial): string {
  return s.custom_name ?? s.product?.name ?? 'Plat inconnu'
}

function specialDisplayPrice(s: DailySpecial): number | null {
  if (s.custom_price != null) return s.custom_price
  if (s.product) return s.product.price
  return null
}

function specialDisplayImage(s: DailySpecial): string | null {
  return s.custom_image_url ?? null
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode
  htmlFor?: string
}) {
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

// ─── Styled input ─────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  backgroundColor: 'var(--argile)',
  border: '1px solid var(--espresso-20)',
  color: 'var(--espresso)',
  borderRadius: '8px',
  padding: '8px 12px',
  width: '100%',
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--creme-surface)',
        borderRadius: '14px',
        border: '1px solid var(--sable-soft)',
        boxShadow: 'var(--shadow-xs)',
        overflow: 'hidden',
      }}
    >
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--espresso-08)' }}
      >
        {icon && <span style={{ color: 'var(--terracotta)' }}>{icon}</span>}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--espresso)',
          }}
        >
          {title}
        </h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlatDuJourPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [specials, setSpecials] = useState<DailySpecial[]>([])
  const [loading, setLoading] = useState(true)

  const today = todayStr()
  const [mode, setMode] = useState<Mode>('product')
  const [date, setDate] = useState<string>(today)
  const [visibleFrom, setVisibleFrom] = useState<string>('10:00')
  const [saving, setSaving] = useState(false)
  const [clearingDate, setClearingDate] = useState<string | null>(null)

  // Product mode
  const [productId, setProductId] = useState<string>('')

  // Custom mode
  const [customName, setCustomName] = useState<string>('')
  const [customPriceEur, setCustomPriceEur] = useState<string>('')
  const [customImageFile, setCustomImageFile] = useState<File | null>(null)
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refreshSpecials() {
    const supabase = createClient()
    const { data } = await supabase
      .from('daily_specials')
      .select('*, product:products(*)')
      .order('date', { ascending: true })
    setSpecials((data as DailySpecial[]) ?? [])
  }

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const [{ data: prods }, { data: specs }] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase
          .from('daily_specials')
          .select('*, product:products(*)')
          .order('date', { ascending: true }),
      ])
      setProducts((prods as Product[]) ?? [])
      setSpecials((specs as DailySpecial[]) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    return () => {
      if (customImagePreview) URL.revokeObjectURL(customImagePreview)
    }
  }, [customImagePreview])

  const upcomingSpecials = useMemo(
    () => specials.filter((s) => s.date >= today),
    [specials, today]
  )

  function resetCustomForm() {
    setCustomName('')
    setCustomPriceEur('')
    setCustomImageFile(null)
    if (customImagePreview) {
      URL.revokeObjectURL(customImagePreview)
      setCustomImagePreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Le fichier doit être une image')
      return
    }
    setCustomImageFile(file)
    if (customImagePreview) URL.revokeObjectURL(customImagePreview)
    setCustomImagePreview(URL.createObjectURL(file))
  }

  function clearFile() {
    setCustomImageFile(null)
    if (customImagePreview) {
      URL.revokeObjectURL(customImagePreview)
      setCustomImagePreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadImage(file: File): Promise<string | null> {
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${UPLOAD_PREFIX}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (error) {
      toast.error(`Échec de l'upload : ${error.message}`)
      return null
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) {
      toast.error('Veuillez choisir une date')
      return
    }

    if (mode === 'product') {
      if (!productId) {
        toast.error('Veuillez sélectionner un produit')
        return
      }
      setSaving(true)
      const result = await setDailySpecial(date, productId, visibleFrom)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Plat du jour programmé pour le ${formatDateLong(date)}`)
        await refreshSpecials()
        setProductId('')
      }
      setSaving(false)
      return
    }

    // Custom mode
    if (!customName.trim()) {
      toast.error('Veuillez saisir un nom')
      return
    }
    const priceEur = Number(customPriceEur)
    if (!Number.isFinite(priceEur) || priceEur <= 0) {
      toast.error('Veuillez saisir un prix valide')
      return
    }

    setSaving(true)
    let imageUrl: string | null = null
    if (customImageFile) {
      setUploadingImage(true)
      imageUrl = await uploadImage(customImageFile)
      setUploadingImage(false)
      if (!imageUrl) {
        setSaving(false)
        return
      }
    }

    const priceCents = Math.round(priceEur * 100)
    const result = await setDailySpecial(
      date,
      null,
      visibleFrom,
      customName.trim(),
      priceCents,
      imageUrl
    )
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Plat personnalisé programmé pour le ${formatDateLong(date)}`)
      await refreshSpecials()
      resetCustomForm()
    }
    setSaving(false)
  }

  async function handleClear(dateStr: string) {
    setClearingDate(dateStr)
    const result = await clearDailySpecial(dateStr)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Plat du jour supprimé')
      await refreshSpecials()
    }
    setClearingDate(null)
  }

  // ─── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="sld-shimmer rounded-xl"
            style={{ height: i === 1 ? '220px' : '280px' }}
          />
        ))}
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const primaryBtnStyle: React.CSSProperties = {
    backgroundColor: 'var(--terracotta)',
    color: '#ffffff',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '10px',
    padding: '10px 20px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    whiteSpace: 'nowrap' as const,
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <p
          className="mb-1 uppercase tracking-wider"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--espresso-60)',
            letterSpacing: '0.06em',
          }}
        >
          Gestion
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '40px',
            fontWeight: 500,
            color: 'var(--espresso)',
            lineHeight: 1.1,
          }}
        >
          Plat du jour
        </h1>
      </div>

      {/* Form card */}
      <SectionCard
        title="Programmer un plat du jour"
        icon={<CalendarPlus className="h-5 w-5" />}
      >
        {/* Mode toggle */}
        <div
          className="inline-flex rounded-xl p-1 mb-5 gap-1"
          style={{ backgroundColor: 'var(--argile)' }}
        >
          {([
            { key: 'product', label: 'Produit existant' },
            { key: 'custom', label: 'Plat personnalisé' },
          ] as { key: Mode; label: string }[]).map(({ key, label }) => {
            const isActive = mode === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? 'var(--creme-surface)' : 'transparent',
                  color: isActive ? 'var(--espresso)' : 'var(--espresso-60)',
                  boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'product' ? (
            <div className="grid gap-4 md:grid-cols-[1fr_1.5fr_auto_auto] md:items-end">
              <div>
                <FieldLabel htmlFor="date-product">Date</FieldLabel>
                <input
                  id="date-product"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="focus:outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <FieldLabel>Produit</FieldLabel>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="focus:outline-none"
                  style={inputStyle}
                >
                  <option value="">Choisir un produit…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatPriceCents(p.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="visible-from-p">Visible à partir de</FieldLabel>
                <input
                  id="visible-from-p"
                  type="time"
                  value={visibleFrom}
                  onChange={(e) => setVisibleFrom(e.target.value)}
                  className="focus:outline-none"
                  style={{ ...inputStyle, width: 'auto' }}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                style={primaryBtnStyle}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta-hover)'
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta)'
                }}
              >
                {saving ? '…' : 'Programmer'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="custom-name">Nom du plat</FieldLabel>
                  <input
                    id="custom-name"
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ex : Lasagnes maison"
                    required
                    className="focus:outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="custom-price">Prix (€)</FieldLabel>
                  <input
                    id="custom-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={customPriceEur}
                    onChange={(e) => setCustomPriceEur(e.target.value)}
                    placeholder="9.50"
                    required
                    className="focus:outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Image upload */}
              <div>
                <FieldLabel htmlFor="custom-image">Photo</FieldLabel>
                {customImagePreview ? (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={customImagePreview}
                      alt="Aperçu"
                      className="rounded-lg object-cover"
                      style={{
                        width: '80px',
                        height: '80px',
                        border: '1px solid var(--espresso-20)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        backgroundColor: 'var(--argile)',
                        border: '1px solid var(--espresso-20)',
                        color: 'var(--espresso-60)',
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Retirer
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="custom-image"
                    className="flex items-center gap-2 cursor-pointer rounded-lg transition-colors"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      color: 'var(--espresso-60)',
                      backgroundColor: 'var(--argile)',
                      border: '1px dashed var(--espresso-40)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile-deep)'
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile)'
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    Choisir une image
                  </label>
                )}
                <input
                  id="custom-image"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div>
                  <FieldLabel htmlFor="date-custom">Date</FieldLabel>
                  <input
                    id="date-custom"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="focus:outline-none"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="visible-from-c">Visible à partir de</FieldLabel>
                  <input
                    id="visible-from-c"
                    type="time"
                    value={visibleFrom}
                    onChange={(e) => setVisibleFrom(e.target.value)}
                    className="focus:outline-none"
                    style={inputStyle}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  style={primaryBtnStyle}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta-hover)'
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta)'
                  }}
                >
                  {uploadingImage ? 'Upload…' : saving ? '…' : 'Programmer ce plat'}
                </button>
              </div>
            </div>
          )}
        </form>
      </SectionCard>

      {/* Upcoming specials */}
      <div className="mt-6">
        <SectionCard
          title={`Spécialités programmées (${upcomingSpecials.length})`}
          icon={<Flame className="h-5 w-5" />}
        >
          {upcomingSpecials.length === 0 ? (
            <p
              className="py-8 text-center"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--espresso-40)',
              }}
            >
              Aucune spécialité programmée à venir.
            </p>
          ) : (
            <ul>
              {upcomingSpecials.map((s) => {
                const isToday = s.date === today
                const name = specialDisplayName(s)
                const price = specialDisplayPrice(s)
                const imageUrl = specialDisplayImage(s)
                const isCustom = s.custom_name != null

                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-4 py-3"
                    style={{ borderBottom: '1px solid var(--espresso-08)' }}
                  >
                    {/* Thumbnail */}
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={name}
                        width={56}
                        height={56}
                        className="rounded-lg object-cover shrink-0"
                        style={{
                          border: '1px solid var(--espresso-20)',
                          width: '56px',
                          height: '56px',
                        }}
                        unoptimized
                      />
                    ) : (
                      <div
                        className="sld-photo rounded-lg shrink-0"
                        style={{ width: '56px', height: '56px' }}
                      />
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="capitalize font-medium"
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '15px',
                          color: isToday ? 'var(--terracotta)' : 'var(--espresso)',
                        }}
                      >
                        {formatDateLong(s.date)}
                        {isToday && (
                          <span
                            className="ml-2 text-xs"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: 'var(--terracotta)',
                            }}
                          >
                            (aujourd&apos;hui)
                          </span>
                        )}
                      </p>
                      <p
                        className="truncate mt-0.5"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          color: 'var(--espresso-60)',
                        }}
                      >
                        {name}
                        {price != null && ` · ${formatPriceCents(price)}`}
                        {' · visible à partir de '}
                        {s.visible_from?.slice(0, 5)}
                        {isCustom && (
                          <span
                            className="ml-2 inline-block px-1.5 py-0.5 rounded uppercase"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '9px',
                              letterSpacing: '0.08em',
                              backgroundColor: 'var(--sable-soft)',
                              color: 'var(--terracotta)',
                              fontWeight: 600,
                            }}
                          >
                            Perso
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleClear(s.date)}
                      disabled={clearingDate === s.date}
                      aria-label="Supprimer"
                      className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 shrink-0"
                      style={{
                        backgroundColor: 'var(--argile)',
                        border: '1px solid var(--espresso-20)',
                        color: 'var(--espresso-60)',
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#FEE2E2'
                        ;(e.currentTarget as HTMLElement).style.color = '#B91C1C'
                        ;(e.currentTarget as HTMLElement).style.borderColor = '#FECACA'
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile)'
                        ;(e.currentTarget as HTMLElement).style.color = 'var(--espresso-60)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--espresso-20)'
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

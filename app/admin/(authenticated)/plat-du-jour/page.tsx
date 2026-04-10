'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  setDailySpecial,
  clearDailySpecial,
} from '@/app/actions/daily-specials'
import { formatPrice } from '@/lib/utils'
import type { Product, DailySpecial } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, CalendarPlus, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

type Mode = 'product' | 'custom'

const BUCKET = 'daily-specials'

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
  const [customImagePreview, setCustomImagePreview] = useState<string | null>(
    null,
  )
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

  // Clean up object URLs when preview changes or on unmount
  useEffect(() => {
    return () => {
      if (customImagePreview) URL.revokeObjectURL(customImagePreview)
    }
  }, [customImagePreview])

  const upcomingSpecials = useMemo(
    () => specials.filter((s) => s.date >= today),
    [specials, today],
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
      toast.error('Le fichier doit etre une image')
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
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (error) {
      toast.error(`Echec de l'upload : ${error.message}`)
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
        toast.error('Veuillez selectionner un produit')
        return
      }
      setSaving(true)
      const result = await setDailySpecial(date, productId, visibleFrom)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Plat du jour programme pour le ${formatDateLong(date)}`)
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
      imageUrl,
    )
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(
        `Plat personnalise programme pour le ${formatDateLong(date)}`,
      )
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
      toast.success('Plat du jour supprime')
      await refreshSpecials()
    }
    setClearingDate(null)
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-48 w-full rounded-xl mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-serif font-semibold mb-6">Plat du jour</h1>

      {/* Form */}
      <Card className="gap-2 py-4 mb-8">
        <CardContent className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-accent" />
            Programmer un plat du jour
          </h2>

          {/* Mode toggle */}
          <div className="inline-flex rounded-lg border border-border bg-muted p-1 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMode('product')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'product'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Choisir un produit existant
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'custom'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Creer un plat personnalise
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'product' ? (
              <div className="grid gap-4 md:grid-cols-[1fr_1.5fr_auto_auto] md:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="date-product" className="text-xs">
                    Date
                  </Label>
                  <Input
                    id="date-product"
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Produit</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un produit" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - {formatPrice(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="visible-from-p" className="text-xs">
                    Visible a partir de
                  </Label>
                  <Input
                    id="visible-from-p"
                    type="time"
                    value={visibleFrom}
                    onChange={(e) => setVisibleFrom(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? '...' : 'Programmer'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="custom-name" className="text-xs">
                      Nom du plat
                    </Label>
                    <Input
                      id="custom-name"
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Ex: Lasagnes maison"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="custom-price" className="text-xs">
                      Prix (euros)
                    </Label>
                    <Input
                      id="custom-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={customPriceEur}
                      onChange={(e) => setCustomPriceEur(e.target.value)}
                      placeholder="9.50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="custom-image" className="text-xs">
                    Photo
                  </Label>
                  {customImagePreview ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={customImagePreview}
                        alt="Apercu"
                        className="h-20 w-20 rounded-md object-cover border"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearFile}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Retirer
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="custom-image"
                      className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
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
                  <div className="space-y-1.5">
                    <Label htmlFor="date-custom" className="text-xs">
                      Date
                    </Label>
                    <Input
                      id="date-custom"
                      type="date"
                      min={today}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="visible-from-c" className="text-xs">
                      Visible a partir de
                    </Label>
                    <Input
                      id="visible-from-c"
                      type="time"
                      value={visibleFrom}
                      onChange={(e) => setVisibleFrom(e.target.value)}
                    />
                  </div>

                  <Button type="submit" disabled={saving || uploadingImage}>
                    {uploadingImage
                      ? 'Upload...'
                      : saving
                        ? '...'
                        : 'Programmer ce plat'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Upcoming list */}
      <Card className="gap-2 py-4">
        <CardContent>
          <h2 className="font-semibold mb-4">
            Specialites programmees ({upcomingSpecials.length})
          </h2>
          {upcomingSpecials.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucune specialite programmee a venir.
            </p>
          ) : (
            <ul className="divide-y">
              {upcomingSpecials.map((s) => {
                const isToday = s.date === today
                const name = specialDisplayName(s)
                const price = specialDisplayPrice(s)
                const imageUrl = specialDisplayImage(s)
                const isCustom = s.custom_name != null

                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={name}
                        width={56}
                        height={56}
                        className="h-14 w-14 rounded-md object-cover border shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-md bg-muted border shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium capitalize ${
                          isToday ? 'text-accent' : ''
                        }`}
                      >
                        {formatDateLong(s.date)}
                        {isToday && (
                          <span className="ml-2 text-xs font-normal text-accent">
                            (aujourd&apos;hui)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {name}
                        {price != null && ` - ${formatPrice(price)}`}
                        {' - visible a partir de '}
                        {s.visible_from?.slice(0, 5)}
                        {isCustom && (
                          <span className="ml-2 inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                            Perso
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => handleClear(s.date)}
                      disabled={clearingDate === s.date}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

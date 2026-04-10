'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setDailySpecial, clearDailySpecial } from '@/app/actions/daily-specials'
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
import { Calendar } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, Save, CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateLong(s: string): string {
  return parseDateStr(s).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function todayStr(): string {
  return toDateStr(new Date())
}

export default function PlatDuJourPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [specials, setSpecials] = useState<DailySpecial[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [productId, setProductId] = useState<string>('')
  const [visibleFrom, setVisibleFrom] = useState<string>('10:00')
  const [saving, setSaving] = useState(false)

  async function refreshSpecials() {
    const supabase = createClient()
    const { data: specs } = await supabase
      .from('daily_specials')
      .select('*, product:products(*)')
      .order('date', { ascending: true })
    setSpecials((specs as DailySpecial[]) ?? [])
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

  const selectedDateStr = toDateStr(selectedDate)
  const today = todayStr()

  // Sync form fields when selected date changes or specials load
  useEffect(() => {
    const existing = specials.find((s) => s.date === selectedDateStr)
    if (existing) {
      setProductId(existing.product_id)
      setVisibleFrom(existing.visible_from)
    } else {
      setProductId('')
      setVisibleFrom('10:00')
    }
  }, [selectedDateStr, specials])

  const upcomingSpecials = useMemo(
    () => specials.filter((s) => s.date >= today),
    [specials, today],
  )

  const specialDates = useMemo(
    () => specials.map((s) => parseDateStr(s.date)),
    [specials],
  )

  const existingForSelected = specials.find((s) => s.date === selectedDateStr)
  const isPastDate = selectedDateStr < today

  async function handleSave() {
    if (!productId) {
      toast.error('Veuillez selectionner un produit')
      return
    }
    setSaving(true)
    const result = await setDailySpecial(selectedDateStr, productId, visibleFrom)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Plat du jour enregistre')
      await refreshSpecials()
    }
    setSaving(false)
  }

  async function handleClear(dateStr: string) {
    setSaving(true)
    const result = await clearDailySpecial(dateStr)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Plat du jour supprime')
      await refreshSpecials()
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-serif font-semibold">Plat du jour</h1>
        <p className="text-sm text-muted-foreground">
          Programmez les specialites pour n&apos;importe quelle date
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Calendar + upcoming list */}
        <div className="space-y-6">
          <Card className="gap-2 py-4">
            <CardContent className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-2 self-start">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">
                  Selectionner une date
                </Label>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                modifiers={{ programmed: specialDates }}
                modifiersClassNames={{
                  programmed:
                    'relative after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-amber-500',
                }}
                disabled={{ before: parseDateStr(today) }}
                showOutsideDays
              />
              <p className="text-xs text-muted-foreground mt-2 self-start">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5 align-middle" />
                Dates avec un plat du jour programme
              </p>
            </CardContent>
          </Card>

          <Card className="gap-2 py-4">
            <CardContent>
              <h2 className="font-semibold mb-3">Specialites programmees</h2>
              {upcomingSpecials.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune specialite programmee.
                </p>
              ) : (
                <ul className="space-y-2 max-h-80 overflow-y-auto">
                  {upcomingSpecials.map((s) => {
                    const isSelected = s.date === selectedDateStr
                    return (
                      <li
                        key={s.id}
                        className={`flex items-center justify-between gap-2 rounded-md border p-2 text-sm ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-border'
                        }`}
                      >
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left"
                          onClick={() => setSelectedDate(parseDateStr(s.date))}
                        >
                          <p className="font-medium truncate capitalize">
                            {formatDateLong(s.date)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {s.product?.name ?? 'Produit inconnu'}
                            {s.product &&
                              ` - ${formatPrice(s.product.price)}`}
                            {' - a partir de '}
                            {s.visible_from?.slice(0, 5)}
                          </p>
                        </button>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          onClick={() => handleClear(s.date)}
                          disabled={saving}
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

        {/* Editor for selected date */}
        <Card className="gap-2 py-4 h-fit">
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Date selectionnee</p>
              <p className="text-lg font-semibold capitalize">
                {formatDateLong(selectedDateStr)}
              </p>
              {isPastDate && (
                <p className="text-xs text-red-600 mt-1">
                  Cette date est passee
                </p>
              )}
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label className="text-xs">Visible a partir de</Label>
              <Input
                type="time"
                value={visibleFrom}
                onChange={(e) => setVisibleFrom(e.target.value)}
              />
            </div>

            {existingForSelected?.product && (
              <div className="rounded-md bg-stone-50 border p-2 text-xs text-muted-foreground">
                <span className="font-medium text-stone-700">
                  Actuellement programme :
                </span>{' '}
                {existingForSelected.product.name} (
                {formatPrice(existingForSelected.product.price)})
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving || isPastDate}
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? '...' : 'Enregistrer'}
              </Button>
              {existingForSelected && (
                <Button
                  variant="outline"
                  onClick={() => handleClear(selectedDateStr)}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Retirer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

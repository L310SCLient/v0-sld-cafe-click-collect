'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Trash2, CalendarPlus } from 'lucide-react'
import { toast } from 'sonner'

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

export default function PlatDuJourPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [specials, setSpecials] = useState<DailySpecial[]>([])
  const [loading, setLoading] = useState(true)

  const today = todayStr()
  const [date, setDate] = useState<string>(today)
  const [productId, setProductId] = useState<string>('')
  const [visibleFrom, setVisibleFrom] = useState<string>('10:00')
  const [saving, setSaving] = useState(false)
  const [clearingDate, setClearingDate] = useState<string | null>(null)

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

  const upcomingSpecials = useMemo(
    () => specials.filter((s) => s.date >= today),
    [specials, today],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date) {
      toast.error('Veuillez choisir une date')
      return
    }
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
        <CardContent>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-accent" />
            Programmer un plat du jour
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 md:grid-cols-[1fr_1.5fr_auto_auto] md:items-end"
          >
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs">
                Date
              </Label>
              <Input
                id="date"
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
              <Label htmlFor="visible-from" className="text-xs">
                Visible a partir de
              </Label>
              <Input
                id="visible-from"
                type="time"
                value={visibleFrom}
                onChange={(e) => setVisibleFrom(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? '...' : 'Programmer'}
            </Button>
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
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
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
                        {s.product?.name ?? 'Produit inconnu'}
                        {s.product && ` - ${formatPrice(s.product.price)}`}
                        {' - visible a partir de '}
                        {s.visible_from?.slice(0, 5)}
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

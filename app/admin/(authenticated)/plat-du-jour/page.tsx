'use client'

import { useEffect, useState } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, Save } from 'lucide-react'
import { toast } from 'sonner'

function getWeekDays(offset: number): { date: string; label: string; dayName: string }[] {
  const today = new Date()
  const monday = new Date(today)
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + diff + offset * 7)

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

  return dayNames.map((name, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    return { date: dateStr, label, dayName: name }
  })
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export default function PlatDuJourPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [specials, setSpecials] = useState<DailySpecial[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)

  const [edits, setEdits] = useState<Record<string, { productId: string; visibleFrom: string }>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const [{ data: prods }, { data: specs }] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('daily_specials').select('*, product:products(*)'),
      ])
      setProducts((prods as Product[]) ?? [])
      setSpecials((specs as DailySpecial[]) ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const weekDays = getWeekDays(weekOffset)
  const today = todayStr()

  function getSpecialForDate(date: string): DailySpecial | undefined {
    return specials.find((s) => s.date === date)
  }

  function getEditForDate(date: string) {
    const special = getSpecialForDate(date)
    if (edits[date]) return edits[date]
    if (special) return { productId: special.product_id, visibleFrom: special.visible_from }
    return { productId: '', visibleFrom: '10:00' }
  }

  function updateEdit(date: string, field: 'productId' | 'visibleFrom', value: string) {
    setEdits((prev) => ({
      ...prev,
      [date]: { ...getEditForDate(date), [field]: value },
    }))
  }

  async function handleSave(date: string) {
    const edit = getEditForDate(date)
    if (!edit.productId) {
      toast.error('Veuillez selectionner un produit')
      return
    }
    setSaving((prev) => ({ ...prev, [date]: true }))
    const result = await setDailySpecial(date, edit.productId, edit.visibleFrom)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Plat du jour enregistre')
      const supabase = createClient()
      const { data: specs } = await supabase.from('daily_specials').select('*, product:products(*)')
      setSpecials((specs as DailySpecial[]) ?? [])
      setEdits((prev) => {
        const next = { ...prev }
        delete next[date]
        return next
      })
    }
    setSaving((prev) => ({ ...prev, [date]: false }))
  }

  async function handleClear(date: string) {
    setSaving((prev) => ({ ...prev, [date]: true }))
    const result = await clearDailySpecial(date)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Plat du jour supprime')
      setSpecials((prev) => prev.filter((s) => s.date !== date))
      setEdits((prev) => {
        const next = { ...prev }
        delete next[date]
        return next
      })
    }
    setSaving((prev) => ({ ...prev, [date]: false }))
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-serif font-semibold">Plat du jour</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w - 1)}>
            Semaine prec.
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset(0)}
            disabled={weekOffset === 0}
          >
            Cette semaine
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((w) => w + 1)}>
            Semaine suiv.
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {weekDays.map((day) => {
          const special = getSpecialForDate(day.date)
          const edit = getEditForDate(day.date)
          const isToday = day.date === today

          return (
            <Card
              key={day.date}
              className={`gap-3 py-4 ${isToday ? 'ring-2 ring-amber-400 border-amber-400' : ''}`}
            >
              <CardContent className="space-y-3">
                <div>
                  <p className={`font-semibold ${isToday ? 'text-amber-700' : ''}`}>
                    {day.dayName}
                  </p>
                  <p className="text-sm text-muted-foreground">{day.label}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Produit</Label>
                  <Select
                    value={edit.productId}
                    onValueChange={(val) => updateEdit(day.date, 'productId', val)}
                  >
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
                    value={edit.visibleFrom}
                    onChange={(e) => updateEdit(day.date, 'visibleFrom', e.target.value)}
                  />
                </div>

                {special?.product && (
                  <p className="text-xs text-muted-foreground">
                    Actuel : {special.product.name} ({formatPrice(special.product.price)})
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSave(day.date)}
                    disabled={saving[day.date]}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {saving[day.date] ? '...' : 'Enregistrer'}
                  </Button>
                  {special && (
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => handleClear(day.date)}
                      disabled={saving[day.date]}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface DailySpecialBannerClientProps {
  specialName: string
  specialPrice: number
  visibleFrom: string
}

export function DailySpecialBannerClient({
  specialName,
  specialPrice,
  visibleFrom,
}: DailySpecialBannerClientProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function checkTime() {
      const now = new Date()
      const [h, m] = visibleFrom.split(":").map(Number)
      const fromMinutes = h * 60 + m
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      setVisible(nowMinutes >= fromMinutes)
    }

    checkTime()
    const interval = setInterval(checkTime, 60_000)
    return () => clearInterval(interval)
  }, [visibleFrom])

  if (!visible) return null

  return (
    <section className="bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-y border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center">
          <Sparkles className="h-6 w-6 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-700 font-semibold mb-1">
              Suggestion du jour
            </p>
            <p className="text-lg sm:text-2xl font-serif font-semibold text-amber-900">
              {specialName}
              <span className="mx-2 text-amber-600">&mdash;</span>
              <span className="tabular-nums">{formatPrice(specialPrice)}</span>
            </p>
          </div>
          <Sparkles className="h-6 w-6 text-amber-600 shrink-0" />
        </div>
      </div>
    </section>
  )
}

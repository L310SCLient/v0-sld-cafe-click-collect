"use client"

import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface DailySpecialBannerProps {
  specialName: string
  specialPrice: number
  visibleFrom: string
}

export function DailySpecialBanner({ specialName, specialPrice, visibleFrom }: DailySpecialBannerProps) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-center gap-3 text-center">
          <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm sm:text-base font-medium text-amber-900">
            <span className="font-semibold">Suggestion du jour :</span>{" "}
            {specialName} &mdash;{" "}
            <span className="font-semibold">{formatPrice(specialPrice)}</span>
          </p>
          <Sparkles className="h-5 w-5 text-amber-600 shrink-0" />
        </div>
      </div>
    </section>
  )
}

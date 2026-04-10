import { Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatPrice } from "@/lib/utils"
import type { DailySpecial, Product } from "@/types"

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  return `${y}-${m}-${day}`
}

function nowTimeStr(): string {
  const d = new Date()
  const h = d.getHours().toString().padStart(2, "0")
  const m = d.getMinutes().toString().padStart(2, "0")
  const s = d.getSeconds().toString().padStart(2, "0")
  return `${h}:${m}:${s}`
}

export async function DailySpecialBanner() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("daily_specials")
    .select("*, product:products(*)")
    .eq("date", todayStr())
    .lte("visible_from", nowTimeStr())
    .limit(1)
    .maybeSingle()

  const special = data as (DailySpecial & { product: Product | null }) | null

  if (!special || !special.product) return null

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
              {special.product.name}
              <span className="mx-2 text-amber-600">&mdash;</span>
              <span className="tabular-nums">
                {formatPrice(special.product.price)}
              </span>
            </p>
          </div>
          <Sparkles className="h-6 w-6 text-amber-600 shrink-0" />
        </div>
      </div>
    </section>
  )
}

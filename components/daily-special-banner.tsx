import Image from "next/image"
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
  if (!special) return null

  // Custom fields win over the joined product
  const name = special.custom_name ?? special.product?.name ?? null
  const price =
    special.custom_price != null
      ? special.custom_price
      : (special.product?.price ?? null)
  const imageUrl = special.custom_image_url ?? null

  if (!name || price == null) return null

  return (
    <section className="bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 border-y border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              width={96}
              height={96}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover border-4 border-white shadow-md shrink-0"
              unoptimized
            />
          ) : (
            <Sparkles className="h-6 w-6 text-amber-600 shrink-0" />
          )}
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-700 font-semibold mb-1">
              Suggestion du jour
            </p>
            <p className="text-lg sm:text-2xl font-serif font-semibold text-amber-900">
              {name}
              <span className="mx-2 text-amber-600">&mdash;</span>
              <span className="tabular-nums">{formatPrice(price)}</span>
            </p>
          </div>
          {!imageUrl && (
            <Sparkles className="h-6 w-6 text-amber-600 shrink-0" />
          )}
        </div>
      </div>
    </section>
  )
}

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

  if (!name || price == null) return null

  return (
    <section className="border-y border-[#8B7355]/25">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-4 sm:py-5">
        <div className="grid grid-cols-3 items-center gap-4">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-stone-500 font-normal">
            Suggestion du jour
          </p>
          <p className="font-serif text-base sm:text-lg text-stone-900 text-center italic">
            {name}
          </p>
          <p className="text-sm sm:text-base text-stone-700 tabular-nums text-right">
            {formatPrice(price)}
          </p>
        </div>
      </div>
    </section>
  )
}

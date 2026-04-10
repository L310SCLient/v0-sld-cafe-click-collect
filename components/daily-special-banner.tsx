import { createClient } from "@/lib/supabase/server"
import type { DailySpecial, Product } from "@/types"
import { DailySpecialBannerClient } from "./daily-special-banner-client"

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  return `${y}-${m}-${day}`
}

export async function DailySpecialBanner() {
  const supabase = await createClient()

  const { data } = await supabase
    .from("daily_specials")
    .select("*, product:products(*)")
    .eq("date", todayStr())
    .limit(1)
    .maybeSingle()

  const special = data as (DailySpecial & { product: Product | null }) | null

  if (!special || !special.product) return null

  return (
    <DailySpecialBannerClient
      specialName={special.product.name}
      specialPrice={special.product.price}
      visibleFrom={special.visible_from}
    />
  )
}

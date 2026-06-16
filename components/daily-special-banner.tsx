import { createClient } from "@/lib/supabase/server"
import { formatPrice } from "@/lib/utils"
import { DailySpecialAddButton } from "./daily-special-add-button"
import type { DailySpecial, Product } from "@/types"

/* ============================================================
   HELPERS — untouched business logic
   ============================================================ */
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
  const mi = d.getMinutes().toString().padStart(2, "0")
  const s = d.getSeconds().toString().padStart(2, "0")
  return `${h}:${mi}:${s}`
}

function weekdayFr(): string {
  return new Date().toLocaleDateString("fr-FR", { weekday: "long" })
}

/* ============================================================
   COMPONENT
   ============================================================ */
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

  /* Custom fields win over the joined product */
  const name = special.custom_name ?? special.product?.name ?? null
  const price =
    special.custom_price != null
      ? special.custom_price
      : (special.product?.price ?? null)

  if (!name || price == null) return null

  const weekday = weekdayFr()

  // Build cart item payload for the CTA
  const isCustom = special.custom_name != null
  const cartItem = isCustom
    ? {
        id: `daily-special-${special.id}`,
        name: special.custom_name!,
        price: special.custom_price!,
        category: "daily-special",
        image_url: special.custom_image_url ?? undefined,
      }
    : {
        id: special.product!.id,
        name: special.product!.name,
        price: special.product!.price,
        category: special.product!.category,
        image_url: special.product!.image_url,
      }

  return (
    <section
      className="py-6 sm:py-8"
      style={{ backgroundColor: "var(--creme-bg)" }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        {/* Dark card */}
        <div
          className="px-6 sm:px-8 py-5 sm:py-6"
          style={{
            backgroundColor: "var(--espresso)",
            borderRadius: "14px",
            border: "1px solid #C9A66B66",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div className="flex items-center justify-between gap-6">
            {/* Left — label + name + time */}
            <div className="flex flex-col gap-1 min-w-0">
              <p
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--sable)" }}
              >
                Plat du jour &middot;{" "}
                <span className="capitalize">{weekday}</span>
              </p>
              <p
                className="font-serif italic leading-snug truncate"
                style={{
                  fontSize: "22px",
                  color: "var(--creme-surface)",
                }}
              >
                {name}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--espresso-60)" }}
              >
                jusqu&apos;à 14:30
              </p>
            </div>

            {/* Right — price */}
            <div className="shrink-0">
              <p
                className="font-serif font-normal tabular-nums"
                style={{
                  fontSize: "28px",
                  color: "var(--sable)",
                  lineHeight: 1,
                }}
              >
                {formatPrice(price)}
              </p>
            </div>
          </div>

          {/* CTA — full width */}
          <div className="mt-4">
            <DailySpecialAddButton item={cartItem} displayName={name} />
          </div>
        </div>
      </div>
    </section>
  )
}

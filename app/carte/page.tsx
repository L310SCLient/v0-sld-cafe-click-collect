import { Search, ChevronRight, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import type { Product, DailySpecial } from "@/types"
import { CarteSearchClient } from "./carte-search-client"
import { CarteCatalogClient } from "./carte-catalog-client"

export const metadata = {
  title: "La carte | SLD Café",
  description:
    "Découvrez notre sélection du jour : viennoiseries, sandwichs, salades et desserts à emporter.",
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const categoryMeta: Record<string, { name: string }> = {
  viennoiseries: { name: "Viennoiseries" },
  salades: { name: "Salades" },
  sandwichs: { name: "Sandwichs" },
  chaud: { name: "Chaud" },
  desserts: { name: "Desserts" },
}

const categoryOrder = [
  "viennoiseries",
  "salades",
  "sandwichs",
  "chaud",
  "desserts",
]

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

function formatPriceLocal(cents: number): string {
  const euros = Math.floor(cents / 100)
  const centsPart = cents % 100
  return `${euros},${centsPart.toString().padStart(2, "0")} €`
}

function formatDateFr(): string {
  const now = new Date()
  const days = [
    "Dimanche",
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Vendredi",
    "Samedi",
  ]
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ]
  const dayName = days[now.getDay()]
  const dayNum = now.getDate()
  const monthName = months[now.getMonth()]
  const hour = now.getHours()
  const service = hour < 15 ? "service midi" : "service soir"
  return `${dayName} ${dayNum} ${monthName} · ${service}`
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function CartePage() {
  const supabase = await createClient()

  // Fetch products
  const { data: productsData } = await supabase
    .from("products")
    .select("*")
    .order("display_order", { ascending: true })

  const products = (productsData ?? []) as Product[]

  // Fetch today's daily special
  const { data: specialData } = await supabase
    .from("daily_specials")
    .select("*, product:products(*)")
    .eq("date", todayStr())
    .lte("visible_from", nowTimeStr())
    .limit(1)
    .maybeSingle()

  const special = specialData as
    | (DailySpecial & { product: Product | null })
    | null

  const specialName =
    special?.custom_name ?? special?.product?.name ?? null
  const specialPrice =
    special?.custom_price != null
      ? special.custom_price
      : (special?.product?.price ?? null)
  const specialImage = special?.custom_image_url ?? null
  const hasSpecial = special != null && specialName != null && specialPrice != null

  // Group products by category
  const grouped = categoryOrder
    .map((catId) => {
      const meta = categoryMeta[catId]
      return {
        id: catId,
        name: meta.name,
        emoji: "",
        products: products.filter((p: Product) => p.category === catId),
      }
    })
    .filter((c) => c.products.length > 0)

  const dateLabel = formatDateFr()

  return (
    <div className="bg-[var(--creme-bg)] min-h-screen">
      {/* ─── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        {/* Kicker */}
        <p
          className="font-[family-name:var(--font-mono)] uppercase text-[var(--espresso-60)]"
          style={{ fontSize: "10px", letterSpacing: "0.18em" }}
        >
          SLD Café · Click &amp; Collect
        </p>

        {/* Title */}
        <h1
          className="font-[family-name:var(--font-display)] font-normal text-[var(--espresso)] leading-none mt-3"
          style={{ fontSize: "clamp(40px, 6vw, 64px)" }}
        >
          La carte du jour
        </h1>

        {/* Subtitle row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
          <p
            className="font-[family-name:var(--font-sans)] text-[var(--espresso-60)] capitalize"
            style={{ fontSize: "15px" }}
          >
            {dateLabel}
          </p>

          {/* Search — client island */}
          <CarteSearchClient />
        </div>
      </div>

      {/* ─── DAILY SPECIAL BANNER ────────────────────────────────────────── */}
      {hasSpecial && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div
            className="relative overflow-hidden rounded-[var(--radius-lg)] flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8"
            style={{
              background:
                "linear-gradient(135deg, #1A130F 0%, #2C1F17 60%, #3A2518 100%)",
              padding: "24px 28px",
            }}
          >
            {/* Decorative grain */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
                opacity: 0.6,
              }}
            />

            {/* Sable accent line */}
            <div
              aria-hidden
              className="absolute left-0 top-0 bottom-0 rounded-l-[var(--radius-lg)]"
              style={{ width: "3px", background: "var(--sable)" }}
            />

            {/* Optional image thumbnail */}
            {specialImage && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={specialImage}
                alt={specialName ?? "Plat du jour"}
                className="w-20 h-20 rounded-[var(--radius-sm)] object-cover flex-shrink-0"
              />
            )}

            <div className="flex-1 min-w-0">
              <p
                className="font-[family-name:var(--font-mono)] uppercase text-[var(--sable)]"
                style={{ fontSize: "10px", letterSpacing: "0.18em" }}
              >
                Suggestion du jour
              </p>
              <p
                className="font-[family-name:var(--font-display)] italic font-normal text-white mt-1 leading-snug"
                style={{ fontSize: "22px" }}
              >
                {specialName}
              </p>
            </div>

            {specialPrice != null && (
              <p
                className="font-[family-name:var(--font-display)] font-medium text-[var(--sable)] flex-shrink-0"
                style={{ fontSize: "22px" }}
              >
                {formatPriceLocal(specialPrice)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── FORMULES CTA CARD ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <a
          href="/formules"
          className="group flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--creme-surface)] border border-[var(--espresso-08)] shadow-[var(--shadow-xs)] transition-all duration-200 hover:border-[var(--sable-soft)] hover:shadow-[var(--shadow-sm)]"
          style={{ padding: "16px 20px" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--argile)] flex-shrink-0"
              style={{ width: "40px", height: "40px" }}
            >
              <Star
                className="text-[var(--terracotta)]"
                style={{ width: "18px", height: "18px" }}
              />
            </div>
            <div>
              <p
                className="font-[family-name:var(--font-display)] font-medium text-[var(--espresso)] leading-tight"
                style={{ fontSize: "16px" }}
              >
                Nos formules
              </p>
              <p
                className="font-[family-name:var(--font-sans)] text-[var(--espresso-60)] mt-0.5"
                style={{ fontSize: "13px" }}
              >
                Sandwich + boisson, menu complet &mdash; économisez jusqu&apos;à 2&nbsp;€
              </p>
            </div>
          </div>
          <ChevronRight
            className="text-[var(--espresso-40)] transition-transform duration-200 group-hover:translate-x-0.5 flex-shrink-0"
            style={{ width: "18px", height: "18px" }}
          />
        </a>
      </div>

      {/* ─── CATEGORY TABS + PRODUCT GRID (client-side filtering) ────────── */}
      <CarteCatalogClient categories={grouped} />
    </div>
  )
}

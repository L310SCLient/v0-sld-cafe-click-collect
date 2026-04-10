import Link from "next/link"
import { ArrowRight, ChevronDown, Clock, MapPin, Sparkles, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ProductCatalog } from "@/components/product-catalog"
import { CategoryNav } from "@/components/category-nav"
import { DailySpecialBanner } from "@/components/daily-special-banner"
import type { Product } from "@/types"

const categoryMeta: Record<string, { name: string; emoji: string }> = {
  viennoiseries: { name: "Viennoiseries", emoji: "\u{1F950}" },
  salades: { name: "Salades", emoji: "\u{1F957}" },
  sandwichs: { name: "Sandwichs", emoji: "\u{1F959}" },
  chaud: { name: "Chaud", emoji: "\u{1FAD5}" },
  desserts: { name: "Desserts", emoji: "\u{1F36E}" },
}

const categoryOrder = ["viennoiseries", "salades", "sandwichs", "chaud", "desserts"]

const values = [
  {
    icon: Sparkles,
    emoji: "\u{1F956}",
    title: "Fait maison",
    body: "Tous nos sandwichs et salades prepares chaque matin avec des produits frais selectionnes.",
  },
  {
    icon: Zap,
    emoji: "\u26A1",
    title: "Rapide & pratique",
    body: "Commandez en ligne, choisissez votre creneau, recuperez au comptoir sans attendre.",
  },
  {
    icon: MapPin,
    emoji: "\u{1F4CD}",
    title: "Au c\u0153ur de Toulouse",
    body: "Situes en plein centre, ouverts du lundi au vendredi pour votre pause dejeuner.",
  },
]

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch products
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("display_order", { ascending: true })

  // Group by category
  const grouped = categoryOrder
    .map((catId) => {
      const meta = categoryMeta[catId]
      return {
        id: catId,
        name: meta.name,
        emoji: meta.emoji,
        products: (products ?? []).filter((p: Product) => p.category === catId),
      }
    })
    .filter((c) => c.products.length > 0)

  return (
    <>
      {/* ============================================================
          SECTION 1 — HERO
         ============================================================ */}
      <section className="relative -mt-16 min-h-screen flex items-center justify-center overflow-hidden text-white">
        {/* Animated warm gradient backdrop */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 animate-hero-gradient"
          aria-hidden="true"
        />
        {/* Radial warm glow */}
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.18),transparent_60%)]"
          aria-hidden="true"
        />
        {/* Subtle noise overlay via dotted pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] [background-size:24px_24px]"
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-amber-200/90 font-medium mb-6">
            Sandwicherie artisanale &bull; Toulouse
          </p>

          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold leading-[1.05] tracking-tight">
            Une pause{" "}
            <span className="italic text-amber-200">savoureuse</span>
            <br className="hidden sm:block" />
            <span className="sm:inline"> au c&oelig;ur de Toulouse</span>
          </h1>

          <p className="mt-8 text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Produits frais, recettes maison, r&eacute;cup&eacute;ration en boutique en quelques clics.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#catalogue"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold tracking-wide shadow-lg shadow-amber-900/40 transition-all hover:scale-[1.02]"
            >
              Commander maintenant
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#catalogue"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/40 hover:border-white hover:bg-white/10 text-white font-medium tracking-wide transition-colors backdrop-blur-sm"
            >
              D&eacute;couvrir la carte
            </a>
          </div>

          <div className="mt-12 flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Lun&ndash;Ven 7h&ndash;19h
            </span>
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Toulouse
            </span>
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-amber-300">&#10003;</span>
              Pr&ecirc;t en 15 min
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#catalogue"
          aria-label="Faire defiler vers la carte"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-white/70 hover:text-white transition-colors"
        >
          <ChevronDown className="h-6 w-6 animate-scroll-indicator" />
        </a>
      </section>

      {/* ============================================================
          SECTION 2 — DAILY SPECIAL BANNER
         ============================================================ */}
      <DailySpecialBanner />

      {/* ============================================================
          SECTION 3 — VALEURS
         ============================================================ */}
      <section className="bg-stone-50 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-stone-900">
              Pourquoi <span className="italic">SLD Caf&eacute;</span>&nbsp;?
            </h2>
            <p className="mt-4 text-stone-600">
              Une cuisine sinc&egrave;re, un service rapide, une adresse au centre-ville.
            </p>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            {values.map((v) => (
              <div
                key={v.title}
                className="group bg-white rounded-2xl p-8 shadow-[0_4px_24px_-12px_rgba(28,25,23,0.12)] border border-stone-100 hover:shadow-[0_12px_40px_-12px_rgba(28,25,23,0.2)] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-14 w-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mb-6 group-hover:bg-amber-200 transition-colors">
                  <span aria-hidden="true">{v.emoji}</span>
                </div>
                <h3 className="font-serif text-2xl font-semibold text-stone-900 mb-3">
                  {v.title}
                </h3>
                <p className="text-stone-600 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — CATALOGUE
         ============================================================ */}
      <section id="catalogue" className="scroll-mt-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-semibold text-stone-900">
              Notre <span className="italic">carte</span>
            </h2>
            <p className="mt-4 text-stone-600">
              D&eacute;couvrez nos pr&eacute;parations du jour.
            </p>
          </div>
        </div>

        <CategoryNav />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          <ProductCatalog categories={grouped} />
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — FOOTER
         ============================================================ */}
      <footer className="bg-[#1C1C1C] text-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid md:grid-cols-3 items-center gap-8">
            {/* Logo */}
            <div className="text-center md:text-left">
              <span className="font-serif text-3xl font-semibold italic text-white">
                SLD Caf&eacute;
              </span>
            </div>

            {/* Hours */}
            <div className="text-center text-sm space-y-1">
              <p className="flex items-center justify-center gap-2 text-white/70">
                <Clock className="h-4 w-4" />
                <span>Lun&ndash;Ven 7h&ndash;19h</span>
              </p>
              <p className="text-white/60">Samedi 8h&ndash;17h</p>
            </div>

            {/* CTA */}
            <div className="text-center md:text-right">
              <a
                href="#catalogue"
                className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200 font-medium tracking-wide transition-colors"
              >
                Commander
                <ArrowRight className="h-4 w-4" />
              </a>
              <div className="mt-3 flex items-center justify-center md:justify-end gap-5 text-xs text-white/50">
                <Link href="/histoire" className="hover:text-white/80 transition-colors">
                  Notre histoire
                </Link>
                <Link href="/contact" className="hover:text-white/80 transition-colors">
                  Contact
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/40">
            &copy; 2025 SLD Caf&eacute; &mdash; Toulouse
          </div>
        </div>
      </footer>
    </>
  )
}

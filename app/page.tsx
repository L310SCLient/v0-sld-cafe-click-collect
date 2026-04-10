import Link from "next/link"
import { ArrowRight } from "lucide-react"
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

const categoryOrder = [
  "viennoiseries",
  "salades",
  "sandwichs",
  "chaud",
  "desserts",
]

const facts = [
  {
    number: "94",
    unit: "références",
    body: "sandwichs, salades, viennoiseries et desserts",
  },
  {
    number: "Chaque",
    unit: "matin",
    body: "des produits frais livrés et préparés sur place",
  },
  {
    number: "15",
    unit: "minutes",
    body: "le temps moyen entre votre commande et le retrait",
  },
]

const reassurance = [
  "Produits frais du matin",
  "Prêt en 15 min",
  "Retrait sans attente",
  "Lun\u2013Ven 7h\u201319h",
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
    <div className="bg-[#FAFAF7] text-stone-900">
      {/* ============================================================
          SECTION 1 — HERO BANNER
         ============================================================ */}
      <section className="relative w-full bg-stone-100 aspect-[16/7] min-h-[380px] sm:min-h-[440px] flex items-center justify-center">
        <div className="text-center px-6 max-w-2xl">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.32em] text-stone-500 font-normal">
            Toulouse &middot; Sandwicherie artisanale
          </p>

          <h1 className="mt-8 font-serif text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.1] text-stone-900">
            SLD Caf&eacute;
          </h1>
          <p className="mt-3 font-serif italic text-lg sm:text-xl md:text-2xl text-stone-600 font-light">
            Le go&ucirc;t du fait maison,
          </p>
          <p className="font-serif italic text-lg sm:text-xl md:text-2xl text-stone-600 font-light">
            &agrave; emporter en quelques clics.
          </p>

          <div className="mx-auto mt-10 h-px w-16 bg-[#8B7355]/50" />

          <a
            href="#catalogue"
            className="mt-8 inline-block text-xs sm:text-sm tracking-[0.18em] uppercase text-stone-700 hover:text-stone-900 transition-colors"
          >
            Voir la carte &darr;
          </a>
        </div>
      </section>

      {/* ============================================================
          SECTION 3 — EDITORIAL INTRO
         ============================================================ */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            {/* Text */}
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.32em] text-stone-500 font-normal">
                Notre histoire
              </p>
              <h2 className="mt-6 font-serif text-2xl sm:text-3xl md:text-4xl font-normal leading-[1.2] text-stone-900">
                Une sandwicherie qui prend son temps pour que vous n&apos;ayez
                pas &agrave; attendre.
              </h2>
              <p className="mt-6 text-base sm:text-lg text-stone-600 leading-relaxed font-light max-w-md">
                Chaque matin, notre &eacute;quipe pr&eacute;pare sandwichs,
                salades et viennoiseries avec des ingr&eacute;dients
                soigneusement s&eacute;lectionn&eacute;s. Pas de
                r&eacute;chauff&eacute;, pas de compromis &mdash; juste du
                bon, pr&ecirc;t &agrave; emporter.
              </p>
              <Link
                href="/histoire"
                className="mt-8 inline-flex items-center gap-2 text-sm tracking-wide text-stone-900 border-b border-stone-400 hover:border-stone-900 pb-0.5 transition-colors"
              >
                En savoir plus
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Visual */}
            <div>
              <div className="aspect-square w-full rounded-2xl bg-stone-100 overflow-hidden relative">
                <div
                  className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(139,115,85,0.12),transparent_60%)]"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-4 text-xs sm:text-sm text-stone-500 text-center italic font-light">
                Pr&eacute;paration quotidienne en boutique
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — 3 FACTS
         ============================================================ */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-200">
            {facts.map((f) => (
              <div
                key={f.unit}
                className="px-6 py-8 sm:py-4 text-center space-y-2"
              >
                <p className="font-serif text-4xl sm:text-5xl font-normal text-stone-900 leading-none">
                  {f.number}
                </p>
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                  {f.unit}
                </p>
                <p className="text-sm text-stone-600 font-light max-w-[14rem] mx-auto leading-snug pt-1">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION 5 — CTA COMMANDER
         ============================================================ */}
      <section className="bg-stone-900 text-white">
        <div className="max-w-3xl mx-auto px-6 sm:px-8 py-20 sm:py-28 text-center">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.32em] text-amber-200/80 font-normal">
            Click &amp; Collect
          </p>
          <h2 className="mt-6 font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-[1.15] text-white">
            Pr&ecirc;t &agrave; commander&nbsp;?
          </h2>
          <p className="mt-6 text-base sm:text-lg text-white/70 font-light leading-relaxed max-w-xl mx-auto">
            Choisissez vos plats, s&eacute;lectionnez votre cr&eacute;neau de
            retrait, et r&eacute;cup&eacute;rez votre commande au comptoir
            sans attendre.
          </p>
          <a
            href="#catalogue"
            className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm sm:text-base font-medium tracking-wide transition-colors"
          >
            Commander maintenant
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* ============================================================
          SECTION 6 — DAILY SPECIAL BANNER
         ============================================================ */}
      <DailySpecialBanner />

      {/* ============================================================
          SECTION 7 — CATALOGUE
         ============================================================ */}
      <section id="catalogue" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-20 sm:pt-24">
          <div className="text-center">
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.32em] text-stone-500 font-normal">
              Notre carte
            </p>
            <p className="mt-4 font-serif italic text-lg sm:text-xl text-stone-600 font-light">
              Commandez en ligne, r&eacute;cup&eacute;rez en boutique
            </p>
          </div>
        </div>

        <div className="mt-10">
          <CategoryNav />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
          <ProductCatalog categories={grouped} />
        </div>
      </section>

      {/* ============================================================
          SECTION 8 — REASSURANCE STRIP
         ============================================================ */}
      <section className="bg-stone-50 border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-stone-600">
            {reassurance.map((item, i) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 font-light"
              >
                <span className="text-amber-700">&#10003;</span>
                <span>{item}</span>
                {i < reassurance.length - 1 && (
                  <span
                    className="ml-4 text-stone-300"
                    aria-hidden="true"
                  >
                    &middot;
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FOOTER
         ============================================================ */}
      <footer className="bg-white border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10">
          <div className="grid md:grid-cols-3 items-center gap-6">
            {/* Logo */}
            <div className="text-center md:text-left">
              <span className="font-serif text-2xl font-normal text-stone-900">
                SLD Caf&eacute;
              </span>
            </div>

            {/* Nav */}
            <nav className="flex items-center justify-center gap-6 text-sm text-stone-600">
              <Link
                href="/histoire"
                className="hover:text-stone-900 transition-colors"
              >
                Histoire
              </Link>
              <Link
                href="/contact"
                className="hover:text-stone-900 transition-colors"
              >
                Contact
              </Link>
              <a
                href="#catalogue"
                className="hover:text-stone-900 transition-colors"
              >
                Commander
              </a>
            </nav>

            {/* Hours */}
            <p className="text-sm text-stone-600 font-light text-center md:text-right">
              Lun&ndash;Ven 7h&ndash;19h &middot; Samedi 8h&ndash;17h
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-stone-200 text-center">
            <p className="text-xs text-stone-400">
              &copy; 2025 SLD Caf&eacute; &middot; Toulouse
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

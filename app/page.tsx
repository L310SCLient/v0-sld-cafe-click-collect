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
          SECTION 1 — HERO (clean banner)
         ============================================================ */}
      <section className="relative w-full bg-stone-100 aspect-[16/7] min-h-[380px] sm:min-h-[440px] flex items-center justify-center">
        <div className="text-center px-6 max-w-2xl">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.32em] text-stone-500 font-normal">
            Toulouse &middot; Depuis 2018
          </p>

          <h1 className="mt-8 font-serif text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.1] text-stone-900">
            SLD Caf&eacute;
          </h1>
          <p className="mt-3 font-serif italic text-lg sm:text-xl md:text-2xl text-stone-600 font-light">
            Sandwicherie artisanale
          </p>

          <div className="mx-auto mt-10 h-px w-16 bg-[#8B7355]/50" />

          <a
            href="#catalogue"
            className="mt-8 inline-block text-xs sm:text-sm tracking-[0.18em] uppercase text-stone-700 hover:text-stone-900 transition-colors"
          >
            D&eacute;couvrir la carte &darr;
          </a>
        </div>
      </section>

      {/* ============================================================
          SECTION 2 — DAILY SPECIAL (thin band)
         ============================================================ */}
      <DailySpecialBanner />

      {/* ============================================================
          SECTION 3 — INTRO TEXT
         ============================================================ */}
      <section className="py-20 sm:py-28">
        <div className="max-w-xl mx-auto px-6 text-center">
          <p className="font-serif text-lg sm:text-xl leading-relaxed text-stone-700 font-light">
            Chaque matin, nous pr&eacute;parons sandwichs, salades et
            viennoiseries avec des produits frais. Commandez en ligne,
            r&eacute;cup&eacute;rez au comptoir.
          </p>
        </div>
      </section>

      {/* ============================================================
          SECTION 4 — CATALOGUE
         ============================================================ */}
      <section id="catalogue" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="border-t border-stone-200 pt-14 sm:pt-16">
            <p className="text-center text-[10px] sm:text-xs uppercase tracking-[0.32em] text-stone-500 font-normal">
              Notre carte
            </p>
          </div>
        </div>

        <div className="mt-10">
          <CategoryNav />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
          <ProductCatalog categories={grouped} />
        </div>
      </section>

      {/* ============================================================
          FOOTER
         ============================================================ */}
      <footer className="bg-white border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10 text-center">
          <p className="text-sm text-stone-700 font-light">
            SLD Caf&eacute; &middot; Toulouse &middot; Lun&ndash;Ven
            7h&ndash;19h &middot; Samedi 8h&ndash;17h
          </p>
          <p className="mt-3 text-xs text-stone-400">
            &copy; 2025 SLD Caf&eacute;
          </p>
        </div>
      </footer>
    </div>
  )
}

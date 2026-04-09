import Link from "next/link"
import { ArrowDown, Clock, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { ProductCatalog } from "@/components/product-catalog"
import { CategoryNav } from "@/components/category-nav"
import { DailySpecialBanner } from "@/components/daily-special-banner"
import type { Product, DailySpecial } from "@/types"

const categoryMeta: Record<string, { name: string; emoji: string }> = {
  viennoiseries: { name: "Viennoiseries", emoji: "\u{1F950}" },
  salades: { name: "Salades", emoji: "\u{1F957}" },
  sandwichs: { name: "Sandwichs", emoji: "\u{1F959}" },
  chaud: { name: "Chaud", emoji: "\u{1FAD5}" },
  desserts: { name: "Desserts", emoji: "\u{1F36E}" },
}

const categoryOrder = ["viennoiseries", "salades", "sandwichs", "chaud", "desserts"]

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch products
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("display_order", { ascending: true })

  // Group by category
  const grouped = categoryOrder.map((catId) => {
    const meta = categoryMeta[catId]
    return {
      id: catId,
      name: meta.name,
      emoji: meta.emoji,
      products: (products ?? []).filter((p: Product) => p.category === catId),
    }
  }).filter((c) => c.products.length > 0)

  // Fetch today's daily special
  const today = new Date().toISOString().split("T")[0]
  const { data: specials } = await supabase
    .from("daily_specials")
    .select("*, product:products(*)")
    .eq("date", today)
    .limit(1)

  const dailySpecial: (DailySpecial & { product: Product }) | null =
    specials && specials.length > 0 ? specials[0] : null

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 via-background to-secondary/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 lg:py-40">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground leading-tight">
              Commandez en ligne,{" "}
              <span className="italic">recuperez en boutique</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
              Sandwicherie artisanale au c&oelig;ur de Toulouse
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <a
                href="#catalogue"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 transition-colors"
              >
                Voir la carte
                <ArrowDown className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Toulouse centre
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Lun-Ven 7h30-19h
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-muted-foreground">
                Retrait en 5 min
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Daily Special */}
      {dailySpecial && dailySpecial.product && (
        <DailySpecialBanner
          specialName={dailySpecial.product.name}
          specialPrice={dailySpecial.product.price}
          visibleFrom={dailySpecial.visible_from}
        />
      )}

      {/* Catalogue */}
      <div id="catalogue">
        <CategoryNav />
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          <ProductCatalog categories={grouped} />
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-secondary/50 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <span className="font-serif text-2xl font-semibold italic text-foreground">
                SLD Cafe
              </span>
              <p className="mt-4 text-muted-foreground max-w-sm">
                Votre pause gourmande au c&oelig;ur de Toulouse.
                Viennoiseries, sandwichs et salades prepares avec passion.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-4">Navigation</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-accent transition-colors">Accueil</Link></li>
                <li><Link href="/#catalogue" className="hover:text-accent transition-colors">Notre Carte</Link></li>
                <li><Link href="/histoire" className="hover:text-accent transition-colors">Notre Histoire</Link></li>
                <li><Link href="/contact" className="hover:text-accent transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-4">Horaires</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Lun - Ven : 7h30 - 19h00</li>
                <li>Samedi : 8h00 - 18h00</li>
                <li>Dimanche : Ferme</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SLD Cafe. Tous droits reserves.
          </div>
        </div>
      </footer>
    </div>
  )
}

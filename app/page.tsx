import { createClient } from "@/lib/supabase/server"
import { CatalogFilter } from "@/components/catalog-filter"
import { DailySpecialBanner } from "@/components/daily-special-banner"
import { FormulesList } from "@/components/formules-list"
import type { Product } from "@/types"

/* ─── category config ──────────────────────────────────────────────────────── */

const categoryMeta: Record<string, { name: string }> = {
  viennoiseries: { name: "Viennoiseries" },
  salades: { name: "Salades" },
  sandwichs: { name: "Sandwichs" },
  chaud: { name: "Chaud" },
  desserts: { name: "Desserts" },
  boissons: { name: "Boissons" },
}

const categoryOrder = ["viennoiseries", "salades", "sandwichs", "chaud", "desserts", "boissons"]

/* ─── page ─────────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("display_order", { ascending: true })

  // Fetch formules with étapes — graceful fallback if table doesn't exist yet
  let formulesWithEtapes: any[] = []
  try {
    const { data: formulesData } = await supabase
      .from("formules")
      .select("*, etapes:formule_etapes(*)")
      .eq("is_active", true)
      .order("display_order")

    formulesWithEtapes = (formulesData ?? []).map((f: any) => ({
      ...f,
      etapes: (f.etapes ?? []).sort((a: any, b: any) => a.display_order - b.display_order),
    }))
  } catch {
    // Table doesn't exist yet — show nothing
  }

  const grouped = categoryOrder
    .map((catId) => ({
      id: catId,
      name: categoryMeta[catId].name,
      products: (products ?? []).filter((p: Product) => p.category === catId),
    }))
    .filter((c) => c.products.length > 0)

  return (
    <div className="text-[var(--espresso)]" style={{ backgroundColor: "var(--creme-bg)" }}>

      {/* ================================================================
          1. BANDEAU COMPACT
         ================================================================ */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-8 pb-6">
        <p
          className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: "var(--espresso-60)" }}
        >
          Sandwicherie artisanale &middot; Toulouse
        </p>
        <h1
          className="mt-2 font-serif font-normal"
          style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "var(--espresso)" }}
        >
          Commandez, on pr&eacute;pare.
        </h1>

        <div className="mt-4 flex flex-wrap gap-6 sm:gap-10">
          {[
            { time: "07:30", label: "Premi\u00e8re fourn\u00e9e" },
            { time: "11:30", label: "Service midi" },
            { time: "16:00", label: "Dernier sandwich" },
          ].map(({ time, label }) => (
            <div key={time} className="flex items-center gap-2">
              <span
                className="font-mono text-sm font-medium tabular-nums"
                style={{ color: "var(--sable)" }}
              >
                {time}
              </span>
              <span className="text-sm" style={{ color: "var(--espresso-60)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          2. DAILY SPECIAL
         ================================================================ */}
      <DailySpecialBanner />

      {/* ================================================================
          3. LES FORMULES
         ================================================================ */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <p
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "var(--espresso-60)" }}
            >
              Nos formules
            </p>
            <h2
              className="mt-1 font-serif font-normal"
              style={{ fontSize: "clamp(24px, 3vw, 36px)", color: "var(--espresso)" }}
            >
              Composez votre d&eacute;jeuner
            </h2>
          </div>
        </div>

        <FormulesList formules={formulesWithEtapes} />
      </section>

      {/* ================================================================
          4. CATALOGUE &Agrave; L'UNIT&Eacute;
         ================================================================ */}
      <section id="catalogue" style={{ backgroundColor: "var(--creme-bg)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-10">
          <div className="text-center">
            <h2
              className="font-serif font-normal"
              style={{ fontSize: "clamp(28px, 4vw, 48px)", color: "var(--espresso)" }}
            >
              La carte &agrave; l&rsquo;unit&eacute;
            </h2>
            <p className="mt-2 font-serif italic text-base" style={{ color: "var(--espresso-60)" }}>
              Ou composez votre commande pi&egrave;ce par pi&egrave;ce
            </p>
          </div>
        </div>

        <div className="mt-6">
          <CatalogFilter categories={grouped} />
        </div>
      </section>

      {/* ================================================================
          5. FOOTER AVEC CONTACT
         ================================================================ */}
      <footer style={{ backgroundColor: "var(--espresso)", color: "var(--creme-surface)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-16 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="font-serif text-3xl font-normal leading-none" style={{ color: "var(--creme-surface)" }}>
                  SLD
                </span>
                <span className="font-serif italic text-3xl" style={{ color: "var(--terracotta)" }}>
                  .
                </span>
                <span className="font-mono text-xs uppercase tracking-widest ml-1" style={{ color: "var(--sable)" }}>
                  Caf&eacute;
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed max-w-[18rem]" style={{ color: "#FCFAF4aa" }}>
                Sandwicherie artisanale &agrave; Toulouse. On p&eacute;trit chaque matin,
                on garnit &agrave; la commande, on tutoie le bon go&ucirc;t.
              </p>
            </div>

            {/* Horaires */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--sable)" }}>
                Horaires
              </p>
              <ul className="space-y-2 text-sm" style={{ color: "#FCFAF4cc" }}>
                <li className="flex justify-between gap-6">
                  <span>Lundi &ndash; Vendredi</span>
                  <span className="tabular-nums">7h30 &rarr; 16h</span>
                </li>
                <li className="flex justify-between gap-6">
                  <span>Samedi</span>
                  <span className="tabular-nums">8h &rarr; 14h</span>
                </li>
                <li className="flex justify-between gap-6">
                  <span>Dimanche</span>
                  <span>Ferm&eacute;</span>
                </li>
              </ul>
            </div>

            {/* Adresse */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--sable)" }}>
                Adresse
              </p>
              <address className="not-italic text-sm space-y-1 leading-relaxed" style={{ color: "#FCFAF4cc" }}>
                <p>12 rue des Filatiers</p>
                <p>31000 Toulouse</p>
              </address>
            </div>

            {/* Contact */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--sable)" }}>
                Contact
              </p>
              <ul className="space-y-2 text-sm" style={{ color: "#FCFAF4cc" }}>
                <li>
                  <a href="tel:+33561234567" className="underline underline-offset-2 transition-opacity hover:opacity-70">
                    05 61 23 45 67
                  </a>
                </li>
                <li>
                  <a href="mailto:bonjour@sld-cafe.fr" className="underline underline-offset-2 transition-opacity hover:opacity-70">
                    bonjour@sld-cafe.fr
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t" style={{ borderColor: "#ffffff20" }}>
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs" style={{ color: "#FCFAF488" }}>
              &copy; 2026 SLD Caf&eacute; &middot; Toulouse
            </p>
            <p className="text-xs" style={{ color: "#FCFAF488" }}>
              Mentions l&eacute;gales &middot; CGV &middot; Confidentialit&eacute;
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

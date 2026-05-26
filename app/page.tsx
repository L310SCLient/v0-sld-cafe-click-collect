import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { CatalogFilter } from "@/components/catalog-filter"
import { DailySpecialBanner } from "@/components/daily-special-banner"
import type { Product } from "@/types"

/* ─── category config ──────────────────────────────────────────────────────── */

const categoryMeta: Record<string, { name: string }> = {
  viennoiseries: { name: "Viennoiseries" },
  salades: { name: "Salades" },
  sandwichs: { name: "Sandwichs" },
  chaud: { name: "Chaud" },
  desserts: { name: "Desserts" },
}

const categoryOrder = ["viennoiseries", "salades", "sandwichs", "chaud", "desserts"]

/* ─── formules data ────────────────────────────────────────────────────────── */

const FORMULES = [
  {
    id: "f-midi",
    name: "La Formule Midi",
    tagline: "Le d\u00e9jeuner complet, \u00e9quilibr\u00e9 comme \u00e0 la maison.",
    price: 9.5,
    photo: "",
    slots: [
      "Un sandwich ou un wrap",
      "Une boisson 33 cl",
      "Un dessert ou une viennoiserie",
    ],
  },
  {
    id: "f-legere",
    name: "La Formule L\u00e9g\u00e8re",
    tagline: "Une grande salade, et tout ce qu\u2019il faut autour.",
    price: 10.5,
    photo: "light",
    slots: [
      "Une salade",
      "Une boisson 33 cl",
      "Un dessert",
    ],
  },
  {
    id: "f-express",
    name: "La Formule Express",
    tagline: "Pour les jours press\u00e9s, sans rien sacrifier.",
    price: 6.5,
    photo: "dark",
    slots: [
      "Un mini sandwich",
      "Une viennoiserie",
      "Une boisson 33 cl",
    ],
  },
]

/* ─── page ─────────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("display_order", { ascending: true })

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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FORMULES.map((f) => {
            const photoClass =
              f.photo === "dark"
                ? "sld-photo-dark"
                : f.photo === "light"
                  ? "sld-photo-light"
                  : "sld-photo"
            return (
              <article
                key={f.id}
                className="flex flex-col overflow-hidden"
                style={{
                  background: "var(--creme-surface)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-sm)",
                  border: "1px solid var(--sable-soft)",
                }}
              >
                {/* Photo header */}
                <div className={photoClass} style={{ height: 120, position: "relative" }}>
                  <span
                    className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-white"
                    style={{
                      background: "var(--terracotta)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                    }}
                  >
                    &#9733; Formule
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 p-5">
                  <h3
                    className="font-serif"
                    style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.15 }}
                  >
                    {f.name}
                  </h3>
                  <p
                    className="font-serif italic mt-1"
                    style={{ fontSize: 13, color: "var(--espresso-60)", lineHeight: 1.4 }}
                  >
                    {f.tagline}
                  </p>

                  <ul className="mt-3 flex flex-col gap-1.5">
                    {f.slots.map((slot, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2"
                        style={{ fontSize: 13, color: "var(--espresso-80)" }}
                      >
                        <span
                          className="shrink-0 inline-flex items-center justify-center"
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "var(--argile)",
                            color: "var(--terracotta)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                        >
                          {i + 1}
                        </span>
                        {slot}
                      </li>
                    ))}
                  </ul>

                  {/* Price footer */}
                  <div
                    className="mt-auto pt-4 flex items-center justify-between"
                    style={{ borderTop: "1px solid var(--sable-soft)" }}
                  >
                    <div>
                      <span
                        className="font-mono text-[9px] uppercase tracking-widest"
                        style={{ color: "var(--espresso-60)" }}
                      >
                        Tout compris
                      </span>
                      <p className="font-serif" style={{ fontSize: 24, fontWeight: 500, marginTop: -2 }}>
                        {f.price.toFixed(2).replace(".", ",")}&nbsp;&euro;
                      </p>
                    </div>
                    <a
                      href="#catalogue"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-colors bg-[var(--terracotta)] hover:bg-[var(--terracotta-hover)]"
                    >
                      Commander <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
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
                <span className="font-mono text-xs uppercase tracking-widest ml-1" style={{ color: "var(--espresso-60)" }}>
                  Caf&eacute;
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed max-w-[18rem]" style={{ color: "var(--espresso-60)" }}>
                Sandwicherie artisanale &agrave; Toulouse. On p&eacute;trit chaque matin,
                on garnit &agrave; la commande, on tutoie le bon go&ucirc;t.
              </p>
            </div>

            {/* Horaires */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--sable)" }}>
                Horaires
              </p>
              <ul className="space-y-2 text-sm" style={{ color: "var(--espresso-60)" }}>
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
              <address className="not-italic text-sm space-y-1 leading-relaxed" style={{ color: "var(--espresso-60)" }}>
                <p>12 rue des Filatiers</p>
                <p>31000 Toulouse</p>
              </address>
            </div>

            {/* Contact */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--sable)" }}>
                Contact
              </p>
              <ul className="space-y-2 text-sm" style={{ color: "var(--espresso-60)" }}>
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

        <div className="border-t" style={{ borderColor: "var(--espresso-20)" }}>
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs" style={{ color: "var(--espresso-60)" }}>
              &copy; 2026 SLD Caf&eacute; &middot; Toulouse
            </p>
            <p className="text-xs" style={{ color: "var(--espresso-60)" }}>
              Mentions l&eacute;gales &middot; CGV &middot; Confidentialit&eacute;
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

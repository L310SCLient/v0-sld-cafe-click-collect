import { createClient } from "@/lib/supabase/server"
import { CatalogFilter } from "@/components/catalog-filter"
import { DailySpecialBanner } from "@/components/daily-special-banner"
import type { Product } from "@/types"

/* ============================================================
   CATEGORY CONFIG — unchanged business logic
   ============================================================ */
const categoryMeta: Record<string, { name: string; emoji: string }> = {
  viennoiseries: { name: "Viennoiseries", emoji: "\u{1F950}" },
  salades: { name: "Salades", emoji: "\u{1F957}" },
  sandwichs: { name: "Sandwichs", emoji: "\u{1F959}" },
  chaud: { name: "Chaud", emoji: "\u{1FAD5}" },
  desserts: { name: "Desserts", emoji: "\u{1F36E}" },
}

const categoryOrder = ["viennoiseries", "salades", "sandwichs", "chaud", "desserts"]

/* ============================================================
   PAGE
   ============================================================ */
export default async function HomePage() {
  const supabase = await createClient()

  /* Fetch products — untouched Supabase logic */
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("display_order", { ascending: true })

  /* Group by category */
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
    <div
      className="text-[var(--espresso)]"
      style={{ backgroundColor: "var(--creme-bg)" }}
    >
      {/* ============================================================
          1. HERO
         ============================================================ */}
      <section
        className="relative w-full min-h-screen flex items-center"
        style={{ backgroundColor: "var(--creme-bg)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full py-24 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* ---- Text column ---- */}
            <div className="flex flex-col">
              {/* Eyebrow */}
              <p
                className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: "var(--espresso-60)" }}
              >
                Sandwicherie artisanale &middot; Toulouse
              </p>

              {/* Main heading */}
              <h1
                className="mt-6 font-serif font-normal leading-[1.05]"
                style={{
                  fontSize: "clamp(44px, 7vw, 88px)",
                  color: "var(--espresso)",
                }}
              >
                Pain chaud,
                <br />
                <em style={{ color: "var(--terracotta)" }}>
                  main d&apos;artisan.
                </em>
              </h1>

              {/* Descriptor */}
              <p
                className="mt-6 font-serif italic text-lg sm:text-xl leading-relaxed max-w-md"
                style={{ color: "var(--espresso-60)" }}
              >
                Sandwicherie de comptoir, rue des Filatiers &mdash; chaque
                pain sort du four, chaque garniture est montée à la commande.
              </p>

              {/* CTA */}
              <div className="mt-10">
                <a
                  href="#catalogue"
                  className="inline-flex items-center gap-2 px-8 py-4 text-sm font-medium tracking-wide text-white transition-colors rounded-full bg-[var(--terracotta)] hover:bg-[var(--terracotta-hover)]"
                >
                  Commander pour midi &rarr;
                </a>
              </div>

              {/* Time markers */}
              <div className="mt-12 flex flex-col sm:flex-row gap-6 sm:gap-10">
                {[
                  { time: "07:30", label: "Première fournée" },
                  { time: "11:30", label: "Service midi" },
                  { time: "16:00", label: "Dernier sandwich" },
                ].map(({ time, label }) => (
                  <div key={time} className="flex items-start gap-3">
                    <span
                      className="font-mono text-sm font-medium tabular-nums leading-none pt-0.5"
                      style={{ color: "var(--sable)" }}
                    >
                      {time}
                    </span>
                    <span
                      className="text-sm leading-none"
                      style={{ color: "var(--espresso-60)" }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ---- Photo column ---- */}
            <div className="relative hidden lg:block">
              {/* Main photo placeholder */}
              <div
                className="sld-photo w-full aspect-[4/5] rounded-[var(--radius-lg)]"
                style={{ boxShadow: "var(--shadow-lg)" }}
                aria-hidden="true"
              />

              {/* Floating "Plat du jour" card */}
              <div
                className="absolute bottom-8 left-[-2.5rem] flex items-center gap-4 px-5 py-4 rounded-[14px]"
                style={{
                  backgroundColor: "var(--espresso)",
                  boxShadow: "var(--shadow-md)",
                  border: "1px solid #C9A66B66",
                  minWidth: "220px",
                }}
              >
                <div>
                  <p
                    className="font-mono text-[9px] uppercase tracking-widest"
                    style={{ color: "var(--sable)" }}
                  >
                    Plat du jour
                  </p>
                  <p
                    className="mt-1 font-serif italic text-base leading-snug"
                    style={{ color: "var(--creme-surface)" }}
                  >
                    Tartine jambon-beurre
                  </p>
                  <p
                    className="mt-0.5 font-serif text-base font-medium"
                    style={{ color: "var(--sable)" }}
                  >
                    6,90 €
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. CTA CENTERED
         ============================================================ */}
      <section
        className="py-24 sm:py-32"
        style={{ backgroundColor: "var(--argile)" }}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
          <h2
            className="font-serif font-normal leading-[1.15] text-3xl sm:text-4xl md:text-5xl"
            style={{ color: "var(--espresso)" }}
          >
            On garde un sandwich{" "}
            <em style={{ color: "var(--terracotta)" }}>au chaud.</em>
          </h2>

          <div className="mt-10">
            <a
              href="#catalogue"
              className="inline-flex items-center gap-2 px-8 py-4 text-sm font-medium tracking-wide text-white transition-colors rounded-full bg-[var(--terracotta)] hover:bg-[var(--terracotta-hover)]"
            >
              Voir la carte du jour &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================
          4. RÉASSURANCE
         ============================================================ */}
      <section
        className="py-16 sm:py-20 border-t border-b"
        style={{
          backgroundColor: "var(--creme-bg)",
          borderColor: "var(--espresso-20)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {[
              {
                title: "Pétri à 5h",
                desc: "Le pain sort du four avant que vous vous réveilliez.",
              },
              {
                title: "Garni à la commande",
                desc: "Chaque sandwich est assemblé au moment de votre commande.",
              },
              {
                title: "Produits régionaux",
                desc: "Charcuterie, fromages et légumes sourcés en Occitanie.",
              },
              {
                title: "Retrait sans attente",
                desc: "Votre commande est prête en 15 minutes, pas une de plus.",
              },
            ].map(({ title, desc }) => (
              <div key={title}>
                <p
                  className="font-serif italic text-lg"
                  style={{ color: "var(--espresso)" }}
                >
                  {title}
                </p>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: "var(--espresso-60)" }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          5. DAILY SPECIAL BANNER
         ============================================================ */}
      <DailySpecialBanner />

      {/* ============================================================
          6. CATALOGUE
         ============================================================ */}
      <section
        id="catalogue"
        className="scroll-mt-20"
        style={{ backgroundColor: "var(--creme-bg)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 sm:pt-24">
          <div className="text-center">
            <h2
              className="font-serif font-normal leading-tight"
              style={{
                fontSize: "clamp(40px, 5vw, 64px)",
                color: "var(--espresso)",
              }}
            >
              La carte du jour
            </h2>
            <p
              className="mt-4 font-serif italic text-lg"
              style={{ color: "var(--espresso-60)" }}
            >
              Commandez en ligne, récupérez en boutique
            </p>
          </div>
        </div>

        <div className="mt-10">
          <CatalogFilter categories={grouped} />
        </div>
      </section>

      {/* ============================================================
          7. FOOTER
         ============================================================ */}
      <footer
        style={{
          backgroundColor: "var(--espresso)",
          color: "var(--creme-surface)",
        }}
      >
        {/* Main footer columns */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-16 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-baseline gap-0.5">
                <span
                  className="font-serif text-3xl font-normal leading-none"
                  style={{ color: "var(--creme-surface)" }}
                >
                  SLD
                </span>
                <span
                  className="font-serif italic text-3xl"
                  style={{ color: "var(--terracotta)" }}
                >
                  .
                </span>
                <span
                  className="font-mono text-xs uppercase tracking-widest ml-1"
                  style={{ color: "var(--espresso-60)" }}
                >
                  Café
                </span>
              </div>
              <p
                className="mt-4 text-sm leading-relaxed max-w-[18rem]"
                style={{ color: "var(--espresso-60)" }}
              >
                Sandwicherie artisanale depuis 2012. Pain frais chaque matin,
                garnitures faites à la commande.
              </p>
            </div>

            {/* Horaires */}
            <div>
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: "var(--sable)" }}
              >
                Horaires
              </p>
              <ul className="space-y-2 text-sm" style={{ color: "var(--espresso-60)" }}>
                <li className="flex justify-between gap-6">
                  <span>Lundi &ndash; Vendredi</span>
                  <span className="tabular-nums">7h &ndash; 19h</span>
                </li>
                <li className="flex justify-between gap-6">
                  <span>Samedi</span>
                  <span className="tabular-nums">8h &ndash; 17h</span>
                </li>
                <li className="flex justify-between gap-6">
                  <span>Dimanche</span>
                  <span>Fermé</span>
                </li>
              </ul>
            </div>

            {/* Adresse */}
            <div>
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: "var(--sable)" }}
              >
                Adresse
              </p>
              <address
                className="not-italic text-sm space-y-1 leading-relaxed"
                style={{ color: "var(--espresso-60)" }}
              >
                <p>Rue des Filatiers</p>
                <p>31000 Toulouse</p>
                <p className="mt-3">
                  <a
                    href="https://maps.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 transition-opacity hover:opacity-70"
                  >
                    Voir sur la carte &rarr;
                  </a>
                </p>
              </address>
            </div>

            {/* Contact */}
            <div>
              <p
                className="font-mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: "var(--sable)" }}
              >
                Contact
              </p>
              <ul className="space-y-2 text-sm" style={{ color: "var(--espresso-60)" }}>
                <li>
                  <a
                    href="tel:+33512345678"
                    className="underline underline-offset-2 transition-opacity hover:opacity-70"
                  >
                    05 12 34 56 78
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:bonjour@sldcafe.fr"
                    className="underline underline-offset-2 transition-opacity hover:opacity-70"
                  >
                    bonjour@sldcafe.fr
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="border-t"
          style={{ borderColor: "var(--espresso-20)" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p
              className="text-xs"
              style={{ color: "var(--espresso-60)" }}
            >
              &copy; {new Date().getFullYear()} SLD Café &middot; Toulouse
            </p>
            <nav className="flex items-center gap-6">
              {[
                { label: "Mentions légales", href: "/mentions-legales" },
                { label: "CGV", href: "/cgv" },
                { label: "Confidentialité", href: "/confidentialite" },
              ].map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="text-xs underline-offset-2 transition-opacity hover:opacity-70"
                  style={{ color: "var(--espresso-60)" }}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}

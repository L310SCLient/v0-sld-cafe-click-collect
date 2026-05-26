import Link from "next/link"
import { ArrowRight } from "lucide-react"

interface FormuleSlot {
  label: string
  cats: string[]
}

interface Formule {
  id: string
  name: string
  tagline: string
  price: number
  photo: string
  active: boolean
  slots: FormuleSlot[]
}

const FORMULES: Formule[] = [
  {
    id: "f-midi",
    name: "La Formule Midi",
    tagline: "Le d\u00e9jeuner complet, \u00e9quilibr\u00e9 comme \u00e0 la maison.",
    price: 9.5,
    photo: "",
    active: true,
    slots: [
      { label: "Un sandwich ou un wrap", cats: ["Sandwichs", "Wraps"] },
      { label: "Une boisson 33 cl", cats: ["Boissons"] },
      {
        label: "Un dessert ou une viennoiserie",
        cats: ["Desserts", "P\u00e2tisseries", "Viennoiseries"],
      },
    ],
  },
  {
    id: "f-legere",
    name: "La Formule L\u00e9g\u00e8re",
    tagline: "Une grande salade, et tout ce qu\u2019il faut autour.",
    price: 10.5,
    photo: "light",
    active: true,
    slots: [
      { label: "Une salade", cats: ["Salades"] },
      { label: "Une boisson 33 cl", cats: ["Boissons"] },
      { label: "Un dessert", cats: ["Desserts", "P\u00e2tisseries"] },
    ],
  },
  {
    id: "f-express",
    name: "La Formule Express",
    tagline: "Pour les jours press\u00e9s, sans rien sacrifier.",
    price: 6.5,
    photo: "dark",
    active: true,
    slots: [
      { label: "Un mini sandwich", cats: ["Mini sandwichs"] },
      { label: "Une viennoiserie", cats: ["Viennoiseries"] },
      { label: "Une boisson 33 cl", cats: ["Boissons"] },
    ],
  },
]

function FormuleCard({ f }: { f: Formule }) {
  const photoClass = f.photo === "dark"
    ? "sld-photo-dark"
    : f.photo === "light"
      ? "sld-photo-light"
      : "sld-photo"

  return (
    <article
      className="flex flex-col overflow-hidden"
      style={{
        background: "var(--creme-surface)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        border: "1px solid var(--sable-soft)",
      }}
    >
      {/* Photo or dark header */}
      {f.photo !== undefined ? (
        <div className={photoClass} style={{ height: 150, position: "relative" }}>
          <span
            className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full text-white"
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
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            height: 80,
            background: "var(--espresso)",
            position: "relative",
          }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              inset: 8,
              border: "1px solid #C9A66B66",
              borderRadius: 10,
            }}
          />
          <span
            className="px-2.5 py-1 rounded-full text-white"
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
      )}

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <h3
          className="font-serif"
          style={{
            fontSize: 22,
            fontWeight: 500,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
          }}
        >
          {f.name}
        </h3>
        <p
          className="font-serif italic mt-1"
          style={{
            fontSize: 13,
            color: "var(--espresso-60)",
            lineHeight: 1.4,
          }}
        >
          {f.tagline}
        </p>

        {/* Slots */}
        <ul className="mt-3.5 flex flex-col gap-2">
          {f.slots.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5"
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
              <span>{s.label}</span>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div
          className="mt-auto pt-4 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--sable-soft)" }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--espresso-60)",
              }}
            >
              Tout compris
            </div>
            <div
              className="font-serif"
              style={{ fontSize: 26, fontWeight: 500, marginTop: -2 }}
            >
              {f.price.toFixed(2).replace(".", ",")}&nbsp;&euro;
            </div>
          </div>
          <Link
            href="/carte"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium transition-colors bg-[var(--terracotta)] hover:bg-[var(--terracotta-hover)]"
          >
            Composer <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function FormulesPage() {
  const activeFormules = FORMULES.filter((f) => f.active)

  return (
    <div style={{ background: "var(--creme-bg)", minHeight: "100vh" }}>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 pt-16 pb-6">
        <div className="grid md:grid-cols-[1fr_0.7fr] gap-10 md:gap-14 items-end">
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--espresso-60)",
              }}
            >
              Composez votre d&eacute;jeuner
            </p>
            <h1
              className="font-serif mt-3.5"
              style={{
                fontSize: "clamp(44px, 8vw, 88px)",
                fontWeight: 500,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
              }}
            >
              Nos
              <br />
              <em style={{ color: "var(--terracotta)" }}>formules</em>.
            </h1>
          </div>
          <p
            className="font-serif italic pb-4"
            style={{
              fontSize: "clamp(14px, 2vw, 20px)",
              color: "var(--espresso-80)",
              lineHeight: 1.5,
            }}
          >
            Quatre fa&ccedil;ons de composer votre pause &mdash; un sandwich,
            une salade, une boisson, un dessert. Vous choisissez chaque
            pi&egrave;ce dans la carte du jour.
          </p>
        </div>
      </section>

      {/* Formules grid */}
      <section className="max-w-6xl mx-auto px-6 sm:px-10 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeFormules.map((f) => (
            <FormuleCard key={f.id} f={f} />
          ))}
        </div>
      </section>

      {/* Comment ca marche */}
      <section
        className="max-w-6xl mx-auto px-6 sm:px-10 py-10 md:py-16"
        style={{ borderTop: "1px solid var(--sable)" }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--espresso-60)",
          }}
        >
          &mdash; Comment &ccedil;a marche
        </p>
        <h2
          className="font-serif mt-2.5"
          style={{
            fontSize: "clamp(24px, 3vw, 36px)",
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          Trois clics,{" "}
          <em style={{ color: "var(--terracotta)" }}>
            et c&rsquo;est pli&eacute;
          </em>
          .
        </h2>

        <div className="grid sm:grid-cols-3 gap-8 mt-8">
          {[
            [
              "01",
              "Choisissez votre formule",
              "Midi, L\u00e9g\u00e8re, Express ou Gourmande \u2014 chacune avec sa logique.",
            ],
            [
              "02",
              "Composez chaque emplacement",
              "Picorez dans la carte du jour, comme au comptoir.",
            ],
            [
              "03",
              "On la pr\u00e9pare pour votre cr\u00e9neau",
              "Garnie \u00e0 la commande, pr\u00eate \u00e0 l\u2019heure dite.",
            ],
          ].map(([n, t, d]) => (
            <div key={n}>
              <div
                className="font-serif italic"
                style={{
                  fontSize: 48,
                  color: "var(--terracotta)",
                  lineHeight: 1,
                }}
              >
                {n}
              </div>
              <h3
                className="font-serif mt-2.5"
                style={{ fontSize: 22, fontWeight: 500 }}
              >
                {t}
              </h3>
              <p
                className="mt-1.5"
                style={{
                  fontSize: 14,
                  color: "var(--espresso-80)",
                  lineHeight: 1.6,
                }}
              >
                {d}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        className="max-w-6xl mx-auto px-6 sm:px-10 py-16 text-center"
        style={{ borderTop: "1px solid var(--sable)" }}
      >
        <h3
          className="font-serif italic"
          style={{
            fontSize: "clamp(28px, 5vw, 56px)",
            fontWeight: 500,
          }}
        >
          <em style={{ color: "var(--terracotta)" }}>Go&ucirc;ter</em>,
          c&rsquo;est mieux que lire.
        </h3>
        <div className="mt-6">
          <Link
            href="/carte"
            className="inline-flex items-center gap-2 px-8 py-4 text-sm font-medium tracking-wide text-white transition-colors rounded-full bg-[var(--terracotta)] hover:bg-[var(--terracotta-hover)]"
          >
            Voir la carte du jour <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}

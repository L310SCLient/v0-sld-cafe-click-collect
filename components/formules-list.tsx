"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { FormuleConfigurator } from "./formule-configurator"
import { formatPrice } from "@/lib/utils"
import type { Formule, FormuleEtape } from "@/types"

type FormuleWithEtapes = Formule & { etapes: FormuleEtape[] }

interface FormulesListProps {
  formules: FormuleWithEtapes[]
}

export function FormulesList({ formules }: FormulesListProps) {
  const [activeFormule, setActiveFormule] = useState<FormuleWithEtapes | null>(null)

  if (formules.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {formules.map((f) => {
          // Derive a photo class from image_url presence or fallback
          const photoClass = !f.image_url
            ? "sld-photo"
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
                {f.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.image_url}
                    alt={f.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
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

                {/* Étapes list */}
                {f.etapes.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {f.etapes.map((etape, i) => (
                      <li
                        key={etape.id}
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
                        {etape.label}
                      </li>
                    ))}
                  </ul>
                )}

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
                      {formatPrice(f.price)}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveFormule(f)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium text-white transition-colors active:opacity-80 min-h-[44px]"
                    style={{
                      backgroundColor: "var(--terracotta)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    Commander <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Formule Configurator Modal */}
      {activeFormule && (
        <FormuleConfigurator
          formule={activeFormule}
          open={activeFormule !== null}
          onOpenChange={(open) => {
            if (!open) setActiveFormule(null)
          }}
        />
      )}
    </>
  )
}

"use client"

import { useEffect, useState, useCallback } from "react"
import { X, Check, ShoppingBag } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "./cart-provider"
import { formatPrice } from "@/lib/utils"
import type { Formule, FormuleEtape, Product, FormuleChosenProduct } from "@/types"

interface FormuleConfiguratorProps {
  formule: Formule & { etapes: FormuleEtape[] }
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Map étape category -> products fetched from Supabase
type ProductsByCategory = Record<string, Product[]>

// Map étape id -> chosen product
type Selections = Record<string, Product>

function ToastNotification({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300"
      style={{
        backgroundColor: "var(--espresso)",
        color: "var(--creme-surface)",
        fontFamily: "var(--font-sans)",
        fontSize: "14px",
        fontWeight: 500,
        boxShadow: "var(--shadow-md)",
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? "0" : "12px"})`,
        pointerEvents: "none",
      }}
    >
      <Check className="h-4 w-4" style={{ color: "var(--terracotta)" }} />
      {message}
    </div>
  )
}

export function FormuleConfigurator({ formule, open, onOpenChange }: FormuleConfiguratorProps) {
  const { addFormuleItem } = useCart()
  const [productsByCategory, setProductsByCategory] = useState<ProductsByCategory>({})
  const [selections, setSelections] = useState<Selections>({})
  const [loading, setLoading] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)

  // Fetch products for all étape categories when modal opens
  useEffect(() => {
    if (!open || formule.etapes.length === 0) return

    const uniqueCategories = Array.from(new Set(formule.etapes.map((e) => e.category)))

    setLoading(true)
    const supabase = createClient()

    Promise.all(
      uniqueCategories.map((cat) =>
        supabase
          .from("products")
          .select("*")
          .eq("category", cat)
          .eq("available", true)
          .order("display_order")
          .then(({ data }) => ({ cat, products: (data ?? []) as Product[] }))
      )
    )
      .then((results) => {
        const map: ProductsByCategory = {}
        for (const { cat, products } of results) {
          map[cat] = products
        }
        setProductsByCategory(map)
      })
      .catch(() => {
        // Silently fail — products just won't appear
      })
      .finally(() => setLoading(false))
  }, [open, formule.etapes])

  // Reset selections when modal closes
  useEffect(() => {
    if (!open) {
      setSelections({})
    }
  }, [open])

  const etapesSorted = [...formule.etapes].sort((a, b) => a.display_order - b.display_order)

  const allStepsChosen = etapesSorted.every((etape) => selections[etape.id] !== undefined)

  const handleSelect = useCallback((etapeId: string, product: Product) => {
    setSelections((prev) => ({ ...prev, [etapeId]: product }))
  }, [])

  const handleAddToCart = useCallback(() => {
    if (!allStepsChosen) return

    const formuleDetails: FormuleChosenProduct[] = etapesSorted.map((etape) => ({
      product_id: selections[etape.id].id,
      name: selections[etape.id].name,
      etape_label: etape.label,
    }))

    addFormuleItem({
      id: `formule-${formule.id}-${Date.now()}`,
      name: formule.name,
      price: formule.price,
      category: "formule",
      formuleId: formule.id,
      formuleDetails,
    })

    onOpenChange(false)

    // Show toast
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2800)
  }, [allStepsChosen, etapesSorted, selections, formule, addFormuleItem, onOpenChange])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return <ToastNotification message="Formule ajoutée au panier" visible={toastVisible} />

  return (
    <>
      {/* Toast (rendered outside modal so it survives after close) */}
      <ToastNotification message="Formule ajoutée au panier" visible={toastVisible} />

      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] backdrop-blur-[2px]"
        style={{ backgroundColor: "rgba(36, 30, 26, 0.35)" }}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Configurer ${formule.name}`}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full z-[70] flex flex-col max-h-[92vh]"
        style={{
          maxWidth: "512px",
          backgroundColor: "var(--creme-surface)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 25px 50px -12px rgba(36,30,26,0.35)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 pt-6 pb-5 shrink-0"
          style={{ borderBottom: "1px solid var(--espresso-08)" }}
        >
          <div className="flex-1 pr-4">
            <p
              className="uppercase tracking-widest mb-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "9px",
                color: "var(--espresso-60)",
                letterSpacing: "0.14em",
              }}
            >
              Configurer votre formule
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "28px",
                fontWeight: 500,
                color: "var(--espresso)",
                lineHeight: 1.1,
              }}
            >
              {formule.name}
            </h2>
            {formule.tagline && (
              <p
                className="mt-1 italic"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "13px",
                  color: "var(--espresso-60)",
                  lineHeight: 1.4,
                }}
              >
                {formule.tagline}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                fontWeight: 500,
                color: "var(--terracotta)",
                lineHeight: 1,
              }}
            >
              {formatPrice(formule.price)}
            </p>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-full transition-opacity hover:opacity-60"
              style={{ color: "var(--espresso-60)" }}
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable steps */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--espresso-60)",
                }}
              >
                Chargement des produits…
              </span>
            </div>
          )}

          {!loading &&
            etapesSorted.map((etape, stepIdx) => {
              const products = productsByCategory[etape.category] ?? []
              const chosen = selections[etape.id]

              return (
                <div key={etape.id}>
                  {/* Step header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="inline-flex items-center justify-center shrink-0"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        backgroundColor: chosen ? "var(--terracotta)" : "var(--argile)",
                        color: chosen ? "var(--creme-surface)" : "var(--terracotta)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        fontWeight: 600,
                        transition: "background-color 0.2s, color 0.2s",
                      }}
                    >
                      {chosen ? <Check className="h-3.5 w-3.5" /> : stepIdx + 1}
                    </span>
                    <div>
                      <p
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--espresso)",
                          lineHeight: 1.2,
                        }}
                      >
                        {etape.label}
                      </p>
                      {etape.choix_count > 1 && (
                        <p
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "9px",
                            color: "var(--espresso-60)",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          Choisissez {etape.choix_count}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Product grid */}
                  {products.length === 0 ? (
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "13px",
                        color: "var(--espresso-60)",
                        fontStyle: "italic",
                      }}
                    >
                      Aucun produit disponible dans cette catégorie.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {products.map((product) => {
                        const isSelected = chosen?.id === product.id
                        return (
                          <button
                            key={product.id}
                            onClick={() => handleSelect(etape.id, product)}
                            className="text-left transition-all duration-150"
                            style={{
                              padding: "12px 14px",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: isSelected ? "var(--creme-bg)" : "var(--creme-bg)",
                              border: isSelected
                                ? "2px solid var(--terracotta)"
                                : "1px solid var(--sable-soft)",
                              boxShadow: isSelected
                                ? "0 0 0 3px rgba(168, 90, 46, 0.18)"
                                : "none",
                              position: "relative",
                            }}
                          >
                            {/* Checkmark badge */}
                            {isSelected && (
                              <span
                                className="absolute top-2 right-2 flex items-center justify-center"
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  backgroundColor: "var(--terracotta)",
                                }}
                              >
                                <Check className="h-2.5 w-2.5" style={{ color: "white" }} />
                              </span>
                            )}

                            <p
                              style={{
                                fontFamily: "var(--font-sans)",
                                fontSize: "13px",
                                fontWeight: isSelected ? 600 : 400,
                                color: "var(--espresso)",
                                lineHeight: 1.35,
                                paddingRight: isSelected ? "20px" : "0",
                              }}
                            >
                              {product.name}
                            </p>
                            <p
                              className="mt-1"
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "11px",
                                color: isSelected ? "var(--terracotta)" : "var(--espresso-60)",
                              }}
                            >
                              {formatPrice(product.price)}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        {/* Footer CTA */}
        <div
          className="px-6 pt-4 pb-6 shrink-0"
          style={{ borderTop: "1px solid var(--espresso-08)" }}
        >
          {/* Progress indicator */}
          <p
            className="mb-3 text-center"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--espresso-60)",
            }}
          >
            {Object.keys(selections).length} / {etapesSorted.length} étape
            {etapesSorted.length > 1 ? "s" : ""} complète
            {etapesSorted.length > 1 ? "s" : ""}
          </p>

          <button
            onClick={handleAddToCart}
            disabled={!allStepsChosen}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--terracotta)",
              color: "var(--creme-surface)",
              borderRadius: "var(--radius-pill)",
              fontFamily: "var(--font-sans)",
              fontSize: "15px",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled)
                e.currentTarget.style.backgroundColor = "var(--terracotta-hover)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--terracotta)"
            }}
          >
            <ShoppingBag className="h-4 w-4" />
            Ajouter au panier · {formatPrice(formule.price)}
          </button>
        </div>
      </div>
    </>
  )
}

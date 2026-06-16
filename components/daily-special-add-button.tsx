"use client"

import { useState } from "react"
import { ShoppingBag, Check } from "lucide-react"
import { useCart } from "./cart-provider"
import { toast } from "sonner"
import type { CartItem } from "@/types"

interface DailySpecialAddButtonProps {
  item: Omit<CartItem, "quantity">
  displayName: string
}

export function DailySpecialAddButton({ item, displayName }: DailySpecialAddButtonProps) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const handleClick = () => {
    addItem(item)
    setAdded(true)
    toast.success(`${displayName} ajouté au panier`)
    setTimeout(() => setAdded(false), 600)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] active:opacity-80"
      style={{
        backgroundColor: "var(--terracotta)",
        color: "#ffffff",
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        fontWeight: 500,
        borderRadius: "var(--radius-pill)",
        minHeight: "44px",
        padding: "10px 20px",
        border: "none",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--terracotta-hover)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--terracotta)"
      }}
    >
      {added ? (
        <>
          <Check className="h-4 w-4" />
          Ajouté !
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4" />
          Ajouter au panier
        </>
      )}
    </button>
  )
}

'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createRecipesFromProducts } from '@/app/actions/recipes'
import { formatCents } from '@/lib/interface/units'
import type { Product } from '@/types'
import { PrimaryButton, inputStyle } from './form-bits'

/**
 * Création des recettes depuis les produits réellement en vente sur le site.
 *
 * Ne liste que les produits sans recette : une fois la recette créée, le
 * produit disparaît de cette liste. Il n'y a donc jamais de doublon possible,
 * et l'écran montre en permanence ce qui reste à faire.
 */
export function RecipesFromCatalogue({
  open,
  onOpenChange,
  products,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: Pick<Product, 'id' | 'name' | 'price'>[]
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (query === '') return products
    return products.filter((product) => product.name.toLowerCase().includes(query))
  }, [products, search])

  function toggle(productId: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  function toggleAllVisible() {
    const visibleIds = filtered.map((product) => product.id)
    const allSelected = visibleIds.every((id) => selected.has(id))
    setSelected((current) => {
      const next = new Set(current)
      for (const id of visibleIds) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  function submit() {
    setError('')
    if (selected.size === 0) {
      setError('Choisis au moins un produit.')
      return
    }
    startTransition(async () => {
      const result = await createRecipesFromProducts({ product_ids: [...selected] })
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success(result.message ?? 'Recettes créées.')
      setSelected(new Set())
      onOpenChange(false)
    })
  }

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((product) => selected.has(product.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[480px]"
        style={{ backgroundColor: 'var(--creme-bg)', borderColor: 'var(--espresso-20)' }}
      >
        <DialogHeader>
          <DialogTitle className="font-serif" style={{ color: 'var(--espresso)' }}>
            Recettes depuis le catalogue
          </DialogTitle>
          <DialogDescription style={{ fontSize: '12px', color: 'var(--espresso-60)' }}>
            {products.length === 0
              ? 'Tous les produits du site ont déjà une recette.'
              : `${products.length} produit${products.length > 1 ? 's' : ''} du site sans recette. La recette est créée rattachée au produit, prête à recevoir ses ingrédients.`}
          </DialogDescription>
        </DialogHeader>

        {products.length > 0 && (
          <>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                style={{ color: 'var(--espresso-40)' }}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un produit"
                aria-label="Rechercher un produit"
                style={{ ...inputStyle, paddingLeft: '42px' }}
              />
            </div>

            <button
              type="button"
              onClick={toggleAllVisible}
              className="self-start rounded-full px-3 active:opacity-70"
              style={{
                minHeight: '34px',
                border: '1px solid var(--espresso-20)',
                fontSize: '12px',
                color: 'var(--espresso-80)',
              }}
            >
              {allVisibleSelected ? 'Tout décocher' : `Tout cocher (${filtered.length})`}
            </button>

            <ul
              className="overflow-y-auto -mx-1 px-1"
              style={{ maxHeight: '320px' }}
            >
              {filtered.map((product) => (
                <li key={product.id}>
                  <label
                    className="flex items-center gap-3 py-2 cursor-pointer"
                    style={{ borderBottom: '1px solid var(--espresso-08)' }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggle(product.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--terracotta)' }}
                    />
                    <span
                      className="flex-1 min-w-0 truncate"
                      style={{ fontSize: '14px', color: 'var(--espresso)' }}
                    >
                      {product.name}
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--espresso-60)',
                      }}
                    >
                      {formatCents(product.price)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            {error && <p style={{ fontSize: '13px', color: '#B4302A' }}>{error}</p>}

            <DialogFooter>
              <PrimaryButton type="button" onClick={submit} disabled={isPending}>
                {isPending
                  ? 'Création…'
                  : `Créer ${selected.size} recette${selected.size > 1 ? 's' : ''}`}
              </PrimaryButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

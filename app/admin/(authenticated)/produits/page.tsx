'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toggleProductAvailability } from '@/app/actions/products'
import type { Product } from '@/types'
import { Pencil, Trash2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORIES: { key: Product['category'] | 'all'; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'viennoiseries', label: 'Viennoiseries' },
  { key: 'sandwichs', label: 'Sandwichs' },
  { key: 'salades', label: 'Salades' },
  { key: 'chaud', label: 'Plats chauds' },
  { key: 'desserts', label: 'Desserts' },
]

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function categoryLabel(key: Product['category']): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function AvailabilityToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="relative inline-flex items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
      style={{
        width: '38px',
        height: '21px',
        backgroundColor: checked ? 'var(--status-ready)' : 'var(--espresso-20)',
      }}
    >
      <span
        className="inline-block rounded-full bg-white transition-transform"
        style={{
          width: '15px',
          height: '15px',
          transform: checked ? 'translateX(20px)' : 'translateX(3px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }}
      />
    </button>
  )
}

// ─── Product row ──────────────────────────────────────────────────────────────

function ProductRow({
  product,
  onToggle,
}: {
  product: Product
  onToggle: (id: string, available: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()

  async function handleToggle(checked: boolean) {
    onToggle(product.id, checked)
    startTransition(async () => {
      const result = await toggleProductAvailability(product.id, checked)
      if (result.error) {
        onToggle(product.id, !checked)
        toast.error(result.error)
      }
    })
  }

  return (
    <tr
      className="group transition-colors"
      style={{ borderBottom: '1px solid var(--espresso-08)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile)'
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
      }}
    >
      {/* Photo */}
      <td className="px-4 py-3">
        <div
          className="sld-photo rounded-lg"
          style={{ width: '48px', height: '48px', flexShrink: 0 }}
        />
      </td>

      {/* Name */}
      <td className="px-4 py-3">
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--espresso)',
          }}
        >
          {product.name}
        </span>
      </td>

      {/* Catégorie */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <span
          className="px-2.5 py-1 rounded-full"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            backgroundColor: 'var(--argile)',
            color: 'var(--espresso-60)',
          }}
        >
          {categoryLabel(product.category)}
        </span>
      </td>

      {/* Prix */}
      <td className="px-4 py-3">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            color: 'var(--espresso)',
            tabularNums: 'true',
          } as React.CSSProperties}
        >
          {formatPriceCents(product.price)}
        </span>
      </td>

      {/* Disponible */}
      <td className="px-4 py-3">
        <AvailabilityToggle
          checked={product.available}
          onChange={handleToggle}
          disabled={isPending}
        />
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--argile)',
              color: 'var(--espresso-60)',
              border: '1px solid var(--espresso-20)',
            }}
            aria-label="Modifier"
            onClick={() => toast('Modification à venir')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              border: '1px solid #FECACA',
            }}
            aria-label="Supprimer"
            onClick={() => toast('Suppression à venir')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Product table ────────────────────────────────────────────────────────────

function ProductTable({
  products,
  onToggle,
}: {
  products: Product[]
  onToggle: (id: string, available: boolean) => void
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--creme-surface)',
        borderRadius: '14px',
        border: '1px solid var(--sable-soft)',
        boxShadow: 'var(--shadow-xs)',
        overflow: 'hidden',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--espresso-08)' }}>
              {['Photo', 'Nom', 'Catégorie', 'Prix', 'Disponible', ''].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-left ${h === 'Catégorie' ? 'hidden sm:table-cell' : ''} ${h === '' ? 'text-right' : ''}`}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--espresso-60)',
                    letterSpacing: '0.07em',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    backgroundColor: 'var(--argile)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <ProductRow key={product.id} product={product} onToggle={onToggle} />
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--espresso-40)',
                  }}
                >
                  Aucun produit dans cette catégorie
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('*')
        .order('display_order', { ascending: true })
      setProducts((data as Product[]) ?? [])
      setLoading(false)
    }
    fetchProducts()
  }, [])

  function handleToggle(id: string, available: boolean) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, available } : p))
    )
  }

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory
    const matchSearch =
      search.trim() === '' ||
      p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="sld-shimmer rounded-xl"
            style={{ height: '64px' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p
            className="mb-1 uppercase tracking-wider"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--espresso-60)',
              letterSpacing: '0.06em',
            }}
          >
            {products.length} produit{products.length !== 1 ? 's' : ''}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '40px',
              fontWeight: 500,
              color: 'var(--espresso)',
              lineHeight: 1.1,
            }}
          >
            Produits
          </h1>
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl mt-2 transition-colors"
          style={{
            backgroundColor: 'var(--terracotta)',
            color: '#ffffff',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 500,
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta-hover)'
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta)'
          }}
          onClick={() => toast('Ajout produit à venir')}
        >
          <Plus className="h-4 w-4" />
          Ajouter un produit
        </button>
      </div>

      {/* Search + category tabs */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: 'var(--espresso-40)' }}
          />
          <input
            type="text"
            placeholder="Rechercher un produit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg focus:outline-none"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              backgroundColor: 'var(--creme-surface)',
              border: '1px solid var(--espresso-20)',
              color: 'var(--espresso)',
              boxShadow: 'var(--shadow-xs)',
            }}
          />
        </div>

        {/* Category tabs */}
        <div
          className="flex items-center rounded-xl p-1 gap-1"
          style={{ backgroundColor: 'var(--argile)' }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className="px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? 'var(--creme-surface)' : 'transparent',
                  color: isActive ? 'var(--espresso)' : 'var(--espresso-60)',
                  boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <ProductTable products={filtered} onToggle={handleToggle} />
    </div>
  )
}

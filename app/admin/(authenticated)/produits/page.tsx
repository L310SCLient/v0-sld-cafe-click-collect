'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  toggleProductAvailability,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/app/actions/products'
import type { Product } from '@/types'
import { Pencil, Trash2, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { ImageUploadField } from '@/components/admin/image-upload-field'

const CATEGORY_OPTIONS: { key: Product['category']; label: string }[] = [
  { key: 'viennoiseries', label: 'Viennoiseries' },
  { key: 'sandwichs', label: 'Sandwichs' },
  { key: 'salades', label: 'Salades' },
  { key: 'chaud', label: 'Plats chauds' },
  { key: 'desserts', label: 'Desserts' },
  { key: 'boissons', label: 'Boissons' },
]

const CATEGORIES: { key: Product['category'] | 'all'; label: string }[] = [
  { key: 'all', label: 'Tous' },
  ...CATEGORY_OPTIONS,
]

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function parsePriceEurToCents(value: string): number {
  return Math.round(parseFloat(value.replace(',', '.')) * 100)
}

function categoryLabel(key: Product['category']): string {
  return CATEGORY_OPTIONS.find((c) => c.key === key)?.label ?? key
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '13px',
  backgroundColor: 'var(--creme-surface)',
  border: '1px solid var(--espresso-20)',
  color: 'var(--espresso)',
  borderRadius: 'var(--radius-md)',
  padding: '13px 16px',
  width: '100%',
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-1 uppercase tracking-wider"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--espresso-60)',
        letterSpacing: '0.07em',
      }}
    >
      {children}
    </label>
  )
}

// ─── Toggle switch ───────────────────────────────────────────────────────────

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
        width: '48px',
        height: '28px',
        backgroundColor: checked ? 'var(--status-ready)' : 'var(--espresso-20)',
      }}
    >
      <span
        className="inline-block rounded-full bg-white transition-transform"
        style={{
          width: '20px',
          height: '20px',
          transform: checked ? 'translateX(24px)' : 'translateX(4px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }}
      />
    </button>
  )
}

// ─── Product Modal ───────────────────────────────────────────────────────────

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = product !== null

  const [name, setName] = useState(product?.name ?? '')
  const [priceEur, setPriceEur] = useState(
    product ? (product.price / 100).toFixed(2).replace('.', ',') : ''
  )
  const [category, setCategory] = useState<Product['category']>(product?.category ?? 'sandwichs')
  const [imageUrl, setImageUrl] = useState<string | null>(product?.image_url ?? null)
  const [available, setAvailable] = useState(product?.available ?? true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()

    if (!name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    const priceCents = parsePriceEurToCents(priceEur)
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      toast.error('Veuillez saisir un prix valide')
      return
    }

    setSaving(true)
    const payload = {
      name: name.trim(),
      price: priceCents,
      category,
      image_url: imageUrl || undefined,
      available,
    }

    const result = isEdit
      ? await updateProduct(product.id, payload)
      : await createProduct(payload)

    if (result.error) {
      toast.error(result.error)
      setSaving(false)
      return
    }

    toast.success(isEdit ? 'Produit mis à jour' : 'Produit créé')
    setSaving(false)
    onSaved()
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(30,18,8,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={handleBackdrop}
    >
      <div
        style={{
          backgroundColor: 'var(--creme-bg)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--sable-soft)',
          width: '100%',
          maxWidth: '480px',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: '1px solid var(--espresso-08)' }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '22px',
              fontWeight: 500,
              color: 'var(--espresso)',
            }}
          >
            {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--argile)',
              color: 'var(--espresso-60)',
              border: '1px solid var(--espresso-20)',
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">
          {/* Image */}
          <ImageUploadField
            value={imageUrl}
            onChange={setImageUrl}
            prefix="products"
            aspect="square"
          />

          <div>
            <FieldLabel htmlFor="prod-name">Nom</FieldLabel>
            <input
              id="prod-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Croissant beurre"
              required
              className="focus:outline-none"
              style={inputStyle}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="prod-price">Prix (€)</FieldLabel>
              <input
                id="prod-price"
                type="text"
                inputMode="decimal"
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
                placeholder="2,50"
                required
                className="focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel htmlFor="prod-cat">Catégorie</FieldLabel>
              <select
                id="prod-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as Product['category'])}
                className="focus:outline-none"
                style={inputStyle}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AvailabilityToggle checked={available} onChange={setAvailable} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--espresso-60)',
              }}
            >
              {available ? 'Disponible' : 'Indisponible'}
            </span>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 pt-2"
            style={{ borderTop: '1px solid var(--espresso-08)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl transition-colors"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: 'var(--argile)',
                color: 'var(--espresso-60)',
                border: '1px solid var(--espresso-20)',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--terracotta)',
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Product row ─────────────────────────────────────────────────────────────

function ProductRow({
  product,
  onToggle,
  onEdit,
  onDelete,
}: {
  product: Product
  onToggle: (id: string, available: boolean) => void
  onEdit: (p: Product) => void
  onDelete: (p: Product) => void
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
      <td className="px-4 py-3">
        <div
          className="sld-photo rounded-lg"
          style={{ width: '48px', height: '48px', flexShrink: 0 }}
        />
      </td>
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
      <td className="px-4 py-3">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--espresso)' }}>
          {formatPriceCents(product.price)}
        </span>
      </td>
      <td className="px-4 py-3">
        <AvailabilityToggle
          checked={product.available}
          onChange={handleToggle}
          disabled={isPending}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 justify-end lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors active:opacity-70"
            style={{
              backgroundColor: 'var(--argile)',
              color: 'var(--espresso-60)',
              border: '1px solid var(--espresso-20)',
            }}
            aria-label="Modifier"
            onClick={() => onEdit(product)}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center rounded-lg transition-colors active:opacity-70"
            style={{
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              border: '1px solid #FECACA',
            }}
            aria-label="Supprimer"
            onClick={() => onDelete(product)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Product table ───────────────────────────────────────────────────────────

function ProductTable({
  products,
  onToggle,
  onEdit,
  onDelete,
}: {
  products: Product[]
  onToggle: (id: string, available: boolean) => void
  onEdit: (p: Product) => void
  onDelete: (p: Product) => void
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
              <ProductRow
                key={product.id}
                product={product}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
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

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)

  async function fetchProducts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('display_order', { ascending: true })
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  function handleToggle(id: string, available: boolean) {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, available } : p))
    )
  }

  function openCreate() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setEditTarget(p)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
  }

  async function handleSaved() {
    closeModal()
    setLoading(true)
    await fetchProducts()
  }

  async function handleDelete(p: Product) {
    const confirmed = window.confirm(`Supprimer « ${p.name} » ? Cette action est irréversible.`)
    if (!confirmed) return

    setProducts((prev) => prev.filter((x) => x.id !== p.id))
    const result = await deleteProduct(p.id)
    if (result.error) {
      toast.error(result.error)
      await fetchProducts()
    } else {
      toast.success('Produit supprimé')
    }
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
          <div key={i} className="sld-shimmer rounded-xl" style={{ height: '64px' }} />
        ))}
      </div>
    )
  }

  return (
    <>
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
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Ajouter un produit
          </button>
        </div>

        {/* Search + category tabs */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
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
        <ProductTable
          products={filtered}
          onToggle={handleToggle}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Modal */}
      {modalOpen && (
        <ProductModal
          product={editTarget}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

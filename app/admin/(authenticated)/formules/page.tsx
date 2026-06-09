'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getFormules,
  createFormule,
  updateFormule,
  deleteFormule,
  toggleFormuleActive,
} from '@/app/actions/formules'
import type { Formule, FormuleEtape } from '@/types'
import { Plus, Pencil, Trash2, Star, X, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { ImageUploadField } from '@/components/admin/image-upload-field'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'sandwichs', label: 'Sandwichs' },
  { key: 'salades', label: 'Salades' },
  { key: 'chaud', label: 'Plats chauds' },
  { key: 'desserts', label: 'Desserts' },
  { key: 'viennoiseries', label: 'Viennoiseries' },
  { key: 'boissons', label: 'Boissons' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPriceCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function parsePriceEurToCents(value: string): number {
  return Math.round(parseFloat(value.replace(',', '.')) * 100)
}

function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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

function ActiveToggle({
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

// ─── Étape draft type ─────────────────────────────────────────────────────────

interface EtapeDraft {
  id: string // temporary client ID
  label: string
  category: string
  choix_count: number
}

function newEtapeDraft(): EtapeDraft {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: '',
    category: 'sandwichs',
    choix_count: 1,
  }
}

// ─── Formule card ─────────────────────────────────────────────────────────────

function FormuleCard({
  formule,
  onEdit,
  onDelete,
  onToggle,
}: {
  formule: Formule
  onEdit: (f: Formule) => void
  onDelete: (id: string) => void
  onToggle: (id: string, active: boolean) => void
}) {
  const [isPending, startTransition] = useTransition()

  function handleToggle(val: boolean) {
    onToggle(formule.id, val)
    startTransition(async () => {
      const result = await toggleFormuleActive(formule.id, val)
      if (result.error) {
        onToggle(formule.id, !val)
        toast.error(result.error)
      }
    })
  }

  const etapeCount = formule.etapes?.length ?? 0

  return (
    <div
      className="group"
      style={{
        backgroundColor: 'var(--creme-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--sable-soft)',
        boxShadow: 'var(--shadow-xs)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: 'var(--argile)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
        }}
      >
        <Star
          className="h-5 w-5"
          style={{ color: formule.is_active ? 'var(--terracotta)' : 'var(--espresso-40)' }}
        />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        {/* Name + price row */}
        <div className="flex items-baseline gap-3 flex-wrap">
          <h3
            className="leading-tight"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 500,
              color: 'var(--espresso)',
            }}
          >
            {formule.name}
          </h3>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--terracotta)',
            }}
          >
            {formatPriceCents(formule.price)}
          </span>
        </div>

        {/* Tagline */}
        {formule.tagline && (
          <p
            className="mt-0.5 truncate"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              fontStyle: 'italic',
              color: 'var(--espresso-60)',
            }}
          >
            {formule.tagline}
          </p>
        )}

        {/* Meta badges */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Active badge */}
          <span
            className="px-2 py-0.5 rounded-full"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              backgroundColor: formule.is_active ? '#D1FAE5' : 'var(--argile)',
              color: formule.is_active ? '#065F46' : 'var(--espresso-40)',
            }}
          >
            {formule.is_active ? 'Active' : 'Inactive'}
          </span>

          {/* Étapes count */}
          <span
            className="px-2 py-0.5 rounded-full"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              backgroundColor: 'var(--argile)',
              color: 'var(--espresso-60)',
            }}
          >
            {etapeCount} étape{etapeCount !== 1 ? 's' : ''}
          </span>

          {/* Étape labels */}
          {formule.etapes?.map((e) => (
            <span
              key={e.id}
              className="px-2 py-0.5 rounded-full"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                backgroundColor: 'var(--sable-soft)',
                color: 'var(--espresso-80)',
              }}
            >
              {categoryLabel(e.category)}
              {e.choix_count > 1 ? ` ×${e.choix_count}` : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 shrink-0 mt-1">
        {/* Active toggle */}
        <ActiveToggle checked={formule.is_active} onChange={handleToggle} disabled={isPending} />

        {/* Edit */}
        <button
          onClick={() => onEdit(formule)}
          aria-label="Modifier"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          style={{
            backgroundColor: 'var(--argile)',
            color: 'var(--espresso-60)',
            border: '1px solid var(--espresso-20)',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sable-soft)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--espresso)'
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--espresso-60)'
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(formule.id)}
          aria-label="Supprimer"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          style={{
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            border: '1px solid #FECACA',
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#FCA5A5'
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#FEE2E2'
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function FormuleModal({
  formule,
  onClose,
  onSaved,
}: {
  formule: Formule | null // null = create
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = formule !== null

  const [name, setName] = useState(formule?.name ?? '')
  const [tagline, setTagline] = useState(formule?.tagline ?? '')
  const [priceEur, setPriceEur] = useState(
    formule ? (formule.price / 100).toFixed(2).replace('.', ',') : ''
  )
  const [imageUrl, setImageUrl] = useState<string | null>(formule?.image_url ?? null)
  const [isActive, setIsActive] = useState(formule?.is_active ?? true)
  const [etapes, setEtapes] = useState<EtapeDraft[]>(
    formule?.etapes?.map((e) => ({
      id: e.id,
      label: e.label,
      category: e.category,
      choix_count: e.choix_count,
    })) ?? [newEtapeDraft()]
  )
  const [saving, setSaving] = useState(false)

  function addEtape() {
    setEtapes((prev) => [...prev, newEtapeDraft()])
  }

  function removeEtape(id: string) {
    setEtapes((prev) => prev.filter((e) => e.id !== id))
  }

  function updateEtape(id: string, patch: Partial<Omit<EtapeDraft, 'id'>>) {
    setEtapes((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()

    const priceCents = parsePriceEurToCents(priceEur)
    if (!name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      toast.error('Veuillez saisir un prix valide')
      return
    }
    for (const e of etapes) {
      if (!e.label.trim()) {
        toast.error('Chaque étape doit avoir un libellé')
        return
      }
    }

    setSaving(true)

    const payload = {
      name: name.trim(),
      tagline: tagline.trim(),
      price: priceCents,
      image_url: imageUrl || undefined,
      is_active: isActive,
      etapes: etapes.map((e) => ({
        label: e.label.trim(),
        category: e.category,
        choix_count: e.choix_count,
      })),
    }

    if (isEdit) {
      const result = await updateFormule(formule.id, payload)
      if (result.error) {
        toast.error(result.error)
        setSaving(false)
        return
      }
      toast.success('Formule mise à jour')
    } else {
      const result = await createFormule(payload)
      if (result.error) {
        toast.error(result.error)
        setSaving(false)
        return
      }
      toast.success('Formule créée')
    }

    setSaving(false)
    onSaved()
  }

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  const primaryBtnStyle: React.CSSProperties = {
    backgroundColor: 'var(--terracotta)',
    color: '#ffffff',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '10px',
    padding: '11px 22px',
    border: 'none',
    cursor: saving ? 'not-allowed' : 'pointer',
    opacity: saving ? 0.7 : 1,
    transition: 'background-color 0.15s',
    whiteSpace: 'nowrap' as const,
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
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Modal header */}
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
            {isEdit ? 'Modifier la formule' : 'Nouvelle formule'}
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
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sable-soft)'
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile)'
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-6">

          {/* Image */}
          <ImageUploadField
            value={imageUrl}
            onChange={setImageUrl}
            prefix="formules"
            aspect="16/9"
          />

          {/* Nom + Tagline */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="fm-name">Nom</FieldLabel>
              <input
                id="fm-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : Formule Midi"
                required
                className="focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel htmlFor="fm-price">Prix (€)</FieldLabel>
              <input
                id="fm-price"
                type="text"
                inputMode="decimal"
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
                placeholder="9,50"
                required
                className="focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <FieldLabel htmlFor="fm-tagline">Tagline</FieldLabel>
            <input
              id="fm-tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Ex : Le bon plan du midi, complet et savoureux"
              className="focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <ActiveToggle checked={isActive} onChange={setIsActive} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--espresso-60)',
              }}
            >
              {isActive ? 'Formule active (visible à la commande)' : 'Formule inactive (masquée)'}
            </span>
          </div>

          {/* Étapes section */}
          <div>
            <div
              className="flex items-center justify-between mb-3"
              style={{ borderTop: '1px solid var(--espresso-08)', paddingTop: '20px' }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--espresso-60)',
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                Étapes · {etapes.length}
              </p>
              <button
                type="button"
                onClick={addEtape}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: 'var(--argile)',
                  color: 'var(--espresso)',
                  border: '1px solid var(--espresso-20)',
                }}
                onMouseOver={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sable-soft)'
                }}
                onMouseOut={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile)'
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une étape
              </button>
            </div>

            {etapes.length === 0 && (
              <p
                className="py-4 text-center"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--espresso-40)',
                  backgroundColor: 'var(--argile)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--espresso-20)',
                }}
              >
                Aucune étape — cliquez sur «&thinsp;Ajouter une étape&thinsp;» pour commencer
              </p>
            )}

            <div className="space-y-3">
              {etapes.map((etape, idx) => (
                <div
                  key={etape.id}
                  style={{
                    backgroundColor: 'var(--creme-surface)',
                    border: '1px solid var(--espresso-08)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                  }}
                >
                  {/* Step header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4" style={{ color: 'var(--espresso-40)' }} />
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: 'var(--espresso-40)',
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Étape {idx + 1}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEtape(etape.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: '#B91C1C',
                        backgroundColor: '#FEE2E2',
                        border: '1px solid #FECACA',
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#FCA5A5'
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '#FEE2E2'
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Supprimer
                    </button>
                  </div>

                  {/* Step fields */}
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                    {/* Label */}
                    <div>
                      <FieldLabel htmlFor={`etape-label-${etape.id}`}>Libellé</FieldLabel>
                      <input
                        id={`etape-label-${etape.id}`}
                        type="text"
                        value={etape.label}
                        onChange={(e) => updateEtape(etape.id, { label: e.target.value })}
                        placeholder="Ex : Choisis ton sandwich"
                        className="focus:outline-none"
                        style={{ ...inputStyle, padding: '10px 13px' }}
                      />
                    </div>

                    {/* Catégorie */}
                    <div>
                      <FieldLabel htmlFor={`etape-cat-${etape.id}`}>Catégorie</FieldLabel>
                      <select
                        id={`etape-cat-${etape.id}`}
                        value={etape.category}
                        onChange={(e) => updateEtape(etape.id, { category: e.target.value })}
                        className="focus:outline-none"
                        style={{ ...inputStyle, padding: '10px 13px', width: 'auto', minWidth: '140px' }}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.key} value={cat.key}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nb choix */}
                    <div>
                      <FieldLabel htmlFor={`etape-choix-${etape.id}`}>Nb de choix</FieldLabel>
                      <input
                        id={`etape-choix-${etape.id}`}
                        type="number"
                        min={1}
                        max={10}
                        value={etape.choix_count}
                        onChange={(e) =>
                          updateEtape(etape.id, { choix_count: Math.max(1, parseInt(e.target.value) || 1) })
                        }
                        className="focus:outline-none"
                        style={{ ...inputStyle, padding: '10px 13px', width: '80px' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer actions */}
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
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--sable-soft)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--espresso)'
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--argile)'
                ;(e.currentTarget as HTMLElement).style.color = 'var(--espresso-60)'
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              style={primaryBtnStyle}
              onMouseOver={(e) => {
                if (!saving)
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta-hover)'
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta)'
              }}
            >
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer la formule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FormulesPage() {
  const [formules, setFormules] = useState<Formule[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Formule | null>(null)

  async function fetchFormules() {
    const result = await getFormules()
    if (result.error) {
      toast.error(result.error)
    } else {
      setFormules((result.formules as Formule[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFormules()
  }, [])

  function openCreate() {
    setEditTarget(null)
    setModalOpen(true)
  }

  function openEdit(f: Formule) {
    setEditTarget(f)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
  }

  async function handleSaved() {
    closeModal()
    setLoading(true)
    await fetchFormules()
  }

  function handleToggle(id: string, active: boolean) {
    setFormules((prev) => prev.map((f) => (f.id === id ? { ...f, is_active: active } : f)))
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Supprimer cette formule ? Cette action est irréversible.')
    if (!confirmed) return

    setFormules((prev) => prev.filter((f) => f.id !== id))
    const result = await deleteFormule(id)
    if (result.error) {
      toast.error(result.error)
      // Reload to restore state
      await fetchFormules()
    } else {
      toast.success('Formule supprimée')
    }
  }

  // ─── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="sld-shimmer rounded-xl"
            style={{ height: '100px' }}
          />
        ))}
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const activeCount = formules.filter((f) => f.is_active).length

  return (
    <>
      <div>
        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
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
              {formules.length} formule{formules.length !== 1 ? 's' : ''} · {activeCount} active{activeCount !== 1 ? 's' : ''}
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
              Formules
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
            onMouseOver={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta-hover)'
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--terracotta)'
            }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle formule
          </button>
        </div>

        {/* Formule list */}
        {formules.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{
              backgroundColor: 'var(--creme-surface)',
              border: '1px dashed var(--espresso-20)',
            }}
          >
            <Star className="h-10 w-10 mb-4" style={{ color: 'var(--espresso-20)' }} />
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                color: 'var(--espresso-60)',
                marginBottom: '6px',
              }}
            >
              Aucune formule pour l&apos;instant
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--espresso-40)',
                marginBottom: '20px',
              }}
            >
              Créez votre première formule pour qu&apos;elle apparaisse ici
            </p>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors"
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
            >
              <Plus className="h-4 w-4" />
              Créer une formule
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {formules.map((f) => (
              <FormuleCard
                key={f.id}
                formule={f}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <FormuleModal
          formule={editTarget}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

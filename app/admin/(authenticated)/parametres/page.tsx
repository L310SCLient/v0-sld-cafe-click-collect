'use client'

import { useState } from 'react'
import { toast } from 'sonner'

const DAYS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
]

type DaySchedule = {
  open: string
  close: string
  enabled: boolean
}

const defaultSchedule: Record<string, DaySchedule> = {
  lundi: { open: '11:30', close: '14:30', enabled: true },
  mardi: { open: '11:30', close: '14:30', enabled: true },
  mercredi: { open: '11:30', close: '14:30', enabled: true },
  jeudi: { open: '11:30', close: '14:30', enabled: true },
  vendredi: { open: '11:30', close: '14:30', enabled: true },
  samedi: { open: '11:30', close: '14:00', enabled: true },
  dimanche: { open: '11:30', close: '14:00', enabled: false },
}

// ─── Toggle switch component ──────────────────────────────────────────────────

function ToggleSwitch({
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
      className="relative inline-flex items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        width: '40px',
        height: '22px',
        backgroundColor: checked ? 'var(--status-ready)' : 'var(--espresso-20)',
        flexShrink: 0,
      }}
    >
      <span
        className="inline-block rounded-full bg-white transition-transform"
        style={{
          width: '16px',
          height: '16px',
          transform: checked ? 'translateX(21px)' : 'translateX(3px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }}
      />
    </button>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function SettingsCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
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
      <div
        className="px-6 py-4"
        style={{ borderBottom: '1px solid var(--espresso-08)' }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--espresso)',
          }}
        >
          {title}
        </h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
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

// ─── Styled input ─────────────────────────────────────────────────────────────

function SettingsInput({
  value,
  onChange,
  type = 'text',
  disabled,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg px-3 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
      style={{
        backgroundColor: 'var(--argile)',
        border: '1px solid var(--espresso-20)',
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--espresso)',
      }}
    />
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ParametresPage() {
  const [interval, setInterval] = useState('15')
  const [maxPerSlot, setMaxPerSlot] = useState('10')
  const [minDelay, setMinDelay] = useState('15')
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(defaultSchedule)

  const [shop, setShop] = useState({
    name: 'SLD Café',
    phone: '05 61 00 00 00',
    address: '1 Rue Example, 31000 Toulouse',
    email: 'contact@sldcafe.fr',
    siret: '',
  })

  const [serviceOpen, setServiceOpen] = useState(true)

  function updateDay(
    day: string,
    field: keyof DaySchedule,
    value: string | boolean
  ) {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }))
  }

  function handleSaveSlots(e: React.FormEvent) {
    e.preventDefault()
    toast.success('Créneaux & horaires mis à jour')
  }

  function handleSaveShop(e: React.FormEvent) {
    e.preventDefault()
    toast.success('Informations boutique mises à jour')
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <p
          className="mb-1 uppercase tracking-wider"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--espresso-60)',
            letterSpacing: '0.06em',
          }}
        >
          Administration
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
          Paramètres
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">

        {/* LEFT: Créneaux & ouverture */}
        <SettingsCard title="Créneaux & ouverture">
          <form onSubmit={handleSaveSlots} className="space-y-6">

            {/* 3-field row on argile bg */}
            <div
              className="grid grid-cols-3 gap-4 rounded-xl p-4"
              style={{ backgroundColor: 'var(--argile)' }}
            >
              <div>
                <FieldLabel>Intervalle</FieldLabel>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--creme-surface)',
                    border: '1px solid var(--espresso-20)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--espresso)',
                  }}
                >
                  <option value="10">10 min</option>
                  <option value="15">15 min</option>
                  <option value="20">20 min</option>
                  <option value="30">30 min</option>
                </select>
              </div>

              <div>
                <FieldLabel>Cmd max / créneau</FieldLabel>
                <input
                  type="number"
                  min="1"
                  value={maxPerSlot}
                  onChange={(e) => setMaxPerSlot(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--creme-surface)',
                    border: '1px solid var(--espresso-20)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--espresso)',
                  }}
                />
              </div>

              <div>
                <FieldLabel>Délai mini (min)</FieldLabel>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={minDelay}
                  onChange={(e) => setMinDelay(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--creme-surface)',
                    border: '1px solid var(--espresso-20)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--espresso)',
                  }}
                />
              </div>
            </div>

            {/* Day-by-day schedule */}
            <div>
              <div
                className="grid gap-2 mb-2 px-2"
                style={{ gridTemplateColumns: '1fr 90px 90px 44px' }}
              >
                {['Jour', 'Ouverture', 'Fermeture', ''].map((h) => (
                  <span
                    key={h}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--espresso-40)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div className="space-y-1">
                {DAYS.map((day) => {
                  const s = schedule[day.key]
                  const isDimanche = day.key === 'dimanche'
                  return (
                    <div
                      key={day.key}
                      className="grid items-center gap-2 px-2 py-2 rounded-lg"
                      style={{
                        gridTemplateColumns: '1fr 90px 90px 44px',
                        backgroundColor: s.enabled ? 'transparent' : 'var(--espresso-08)',
                        opacity: isDimanche ? 0.6 : 1,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          color: 'var(--espresso)',
                        }}
                      >
                        {day.label}
                      </span>

                      <input
                        type="time"
                        value={s.open}
                        disabled={!s.enabled || isDimanche}
                        onChange={(e) => updateDay(day.key, 'open', e.target.value)}
                        className="rounded-lg px-2 py-1.5 w-full focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          backgroundColor: 'var(--argile)',
                          border: '1px solid var(--espresso-20)',
                          color: 'var(--espresso)',
                        }}
                      />

                      <input
                        type="time"
                        value={s.close}
                        disabled={!s.enabled || isDimanche}
                        onChange={(e) => updateDay(day.key, 'close', e.target.value)}
                        className="rounded-lg px-2 py-1.5 w-full focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          backgroundColor: 'var(--argile)',
                          border: '1px solid var(--espresso-20)',
                          color: 'var(--espresso)',
                        }}
                      />

                      <div className="flex justify-center">
                        <ToggleSwitch
                          checked={s.enabled}
                          onChange={(v) => updateDay(day.key, 'enabled', v)}
                          disabled={isDimanche}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl transition-colors"
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
              Enregistrer les créneaux
            </button>
          </form>
        </SettingsCard>

        {/* RIGHT column */}
        <div className="space-y-5">

          {/* Informations boutique */}
          <SettingsCard title="Informations boutique">
            <form onSubmit={handleSaveShop} className="space-y-4">
              <div>
                <FieldLabel>Nom de la boutique</FieldLabel>
                <SettingsInput
                  value={shop.name}
                  onChange={(v) => setShop((s) => ({ ...s, name: v }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Téléphone</FieldLabel>
                  <SettingsInput
                    type="tel"
                    value={shop.phone}
                    onChange={(v) => setShop((s) => ({ ...s, phone: v }))}
                  />
                </div>
                <div>
                  <FieldLabel>E-mail</FieldLabel>
                  <SettingsInput
                    type="email"
                    value={shop.email}
                    onChange={(v) => setShop((s) => ({ ...s, email: v }))}
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Adresse</FieldLabel>
                <SettingsInput
                  value={shop.address}
                  onChange={(v) => setShop((s) => ({ ...s, address: v }))}
                />
              </div>

              <div>
                <FieldLabel>SIRET</FieldLabel>
                <SettingsInput
                  value={shop.siret}
                  placeholder="000 000 000 00000"
                  onChange={(v) => setShop((s) => ({ ...s, siret: v }))}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl transition-colors"
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
                Sauvegarder
              </button>
            </form>
          </SettingsCard>

          {/* Mode service */}
          <SettingsCard title="Mode service">
            <div className="flex items-center justify-between">
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: 'var(--espresso)',
                    marginBottom: '2px',
                  }}
                >
                  {serviceOpen ? 'Accepter les commandes' : 'Commandes suspendues'}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--espresso-60)',
                  }}
                >
                  {serviceOpen
                    ? 'La boutique est ouverte et reçoit des commandes.'
                    : 'La boutique est fermée. Aucune commande n\'est acceptée.'}
                </p>
              </div>
              <ToggleSwitch
                checked={serviceOpen}
                onChange={(v) => {
                  setServiceOpen(v)
                  toast(v ? 'Service activé' : 'Service suspendu')
                }}
              />
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  )
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(cents: number): string {
  const euros = Math.floor(cents / 100)
  const centsPart = cents % 100
  return `${euros},${centsPart.toString().padStart(2, '0')} \u20AC`
}

export function getTimeSlots(start: string, end: string, interval: number): string[] {
  const slots: string[] = []
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  for (let m = startMinutes; m <= endMinutes; m += interval) {
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`)
  }
  return slots
}

/**
 * Returns a human-readable relative time string in French.
 * Handles timezone correctly by comparing UTC timestamps directly.
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now()
  // Date.parse handles ISO strings with timezone info correctly
  const then = Date.parse(dateStr)
  if (isNaN(then)) return ''
  const diffMs = now - then
  if (diffMs < 0) return "à l'instant"
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `il y a ${diffD}j`
}

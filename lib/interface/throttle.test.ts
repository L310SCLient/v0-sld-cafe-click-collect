import { describe, expect, it } from 'vitest'
import {
  MAX_FAILED_ATTEMPTS,
  THROTTLE_WINDOW_MS,
  evaluateThrottle,
  throttleMessage,
} from './throttle'

const NOW = 1_800_000_000_000

describe('evaluateThrottle', () => {
  it('laisse passer quand il n y a aucune tentative', () => {
    expect(evaluateThrottle([], NOW)).toEqual({
      blocked: false,
      remaining: MAX_FAILED_ATTEMPTS,
      retryAfterMs: 0,
    })
  })

  it('décompte les tentatives restantes', () => {
    const failures = [NOW - 1000, NOW - 2000]
    expect(evaluateThrottle(failures, NOW).remaining).toBe(MAX_FAILED_ATTEMPTS - 2)
  })

  it('bloque à la 5e tentative ratée', () => {
    const failures = Array.from({ length: MAX_FAILED_ATTEMPTS }, (_, i) => NOW - i * 1000)
    const decision = evaluateThrottle(failures, NOW)
    expect(decision.blocked).toBe(true)
    expect(decision.remaining).toBe(0)
  })

  it('ignore les tentatives sorties de la fenêtre', () => {
    const failures = Array.from(
      { length: MAX_FAILED_ATTEMPTS },
      () => NOW - THROTTLE_WINDOW_MS - 1
    )
    expect(evaluateThrottle(failures, NOW).blocked).toBe(false)
  })

  it('lève le blocage quand la plus ancienne tentative sort de la fenêtre', () => {
    const oldest = NOW - THROTTLE_WINDOW_MS + 60_000
    const failures = [oldest, NOW - 4000, NOW - 3000, NOW - 2000, NOW - 1000]
    const decision = evaluateThrottle(failures, NOW)
    expect(decision.blocked).toBe(true)
    expect(decision.retryAfterMs).toBe(60_000)
  })

  it('reste bloqué au-delà de 5 tentatives, sans attente négative', () => {
    const failures = Array.from({ length: 12 }, (_, i) => NOW - i * 1000)
    const decision = evaluateThrottle(failures, NOW)
    expect(decision.blocked).toBe(true)
    expect(decision.retryAfterMs).toBeGreaterThan(0)
  })
})

describe('throttleMessage', () => {
  it('arrondit à la minute supérieure', () => {
    expect(throttleMessage(60_001)).toBe('Trop de tentatives. Réessaie dans 2 minutes.')
  })

  it('reste lisible sous la minute', () => {
    expect(throttleMessage(5_000)).toBe('Trop de tentatives. Réessaie dans une minute.')
  })
})

/**
 * Anti-force-brute du code PIN.
 *
 * 4 chiffres = 10 000 combinaisons : sans limite, le code tombe en quelques
 * minutes. Le comptage se fait sur des horodatages venus de la base, jamais en
 * mémoire du processus — sur Vercel, deux requêtes consécutives peuvent
 * atterrir sur deux instances différentes, et un compteur local ne compterait
 * qu'une fraction des tentatives.
 *
 * La décision est une fonction pure : la base ne fait que fournir les dates.
 */

export const MAX_FAILED_ATTEMPTS = 5
export const THROTTLE_WINDOW_MS = 15 * 60 * 1000

export interface ThrottleDecision {
  blocked: boolean
  /** Tentatives restantes avant blocage. 0 si déjà bloqué. */
  remaining: number
  /** Attente avant la prochaine tentative possible, en ms. 0 si non bloqué. */
  retryAfterMs: number
}

/**
 * @param failedAtMs horodatages des tentatives ratées (ordre indifférent)
 */
export function evaluateThrottle(failedAtMs: number[], now: number): ThrottleDecision {
  const inWindow = failedAtMs
    .filter((at) => now - at < THROTTLE_WINDOW_MS)
    .sort((a, b) => a - b)

  if (inWindow.length < MAX_FAILED_ATTEMPTS) {
    return {
      blocked: false,
      remaining: MAX_FAILED_ATTEMPTS - inWindow.length,
      retryAfterMs: 0,
    }
  }

  // Le blocage se lève quand la plus ancienne tentative sort de la fenêtre.
  const oldest = inWindow[inWindow.length - MAX_FAILED_ATTEMPTS]
  return {
    blocked: true,
    remaining: 0,
    retryAfterMs: Math.max(0, oldest + THROTTLE_WINDOW_MS - now),
  }
}

/** Message affiché à l'écran quand l'accès est bloqué. */
export function throttleMessage(retryAfterMs: number): string {
  const minutes = Math.ceil(retryAfterMs / 60_000)
  if (minutes <= 1) return 'Trop de tentatives. Réessaie dans une minute.'
  return `Trop de tentatives. Réessaie dans ${minutes} minutes.`
}

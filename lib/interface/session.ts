import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Cookie de session de l'interface cuisine.
 *
 * Le cookie est SIGNÉ. Un cookie à valeur fixe (le patron actuel de
 * `admin_session=authenticated`) se falsifie en trois clics dans les devtools
 * du navigateur : httpOnly empêche le JavaScript de la page de le lire, pas
 * l'utilisateur de l'écrire. La signature rend la valeur infalsifiable sans
 * le secret serveur, et porte l'expiration.
 *
 * Format : `<expiration en ms>.<hmac sha256 hex>`
 */

export const INTERFACE_COOKIE = 'interface_session'

/** Durée d'une session : un service en cuisine. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000

/** Séparateur de domaine : le secret ne signe que des sessions d'interface. */
const DOMAIN = 'interface_session:v1:'

function digest(secret: string, expiresAt: number): string {
  return createHmac('sha256', secret).update(`${DOMAIN}${expiresAt}`).digest('hex')
}

export function signSessionValue(secret: string, expiresAt: number): string {
  return `${expiresAt}.${digest(secret, expiresAt)}`
}

/**
 * Vérifie signature ET expiration. Toute valeur douteuse renvoie `false` :
 * pas d'exception à rattraper côté appelant, donc pas de chemin d'erreur
 * susceptible de laisser passer.
 */
export function verifySessionValue(
  secret: string,
  value: string | undefined | null,
  now: number = Date.now()
): boolean {
  if (!value) return false

  const separator = value.indexOf('.')
  if (separator <= 0) return false

  const expiresAtRaw = value.slice(0, separator)
  const signature = value.slice(separator + 1)
  if (!/^\d+$/.test(expiresAtRaw) || signature.length === 0) return false

  const expiresAt = Number(expiresAtRaw)
  if (expiresAt <= now) return false

  const expected = Buffer.from(digest(secret, expiresAt), 'utf8')
  const received = Buffer.from(signature, 'utf8')
  if (expected.length !== received.length) return false

  return timingSafeEqual(expected, received)
}

/** Comparaison du code PIN à temps constant. */
export function pinMatches(expected: string, submitted: string): boolean {
  const a = createHmac('sha256', 'pin-compare').update(expected).digest()
  const b = createHmac('sha256', 'pin-compare').update(submitted).digest()
  return timingSafeEqual(a, b)
}

/** Un code PIN valide, c'est exactement quatre chiffres. */
export function isWellFormedPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

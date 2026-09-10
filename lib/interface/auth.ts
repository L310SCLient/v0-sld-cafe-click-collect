import { cookies, headers } from 'next/headers'
import {
  INTERFACE_COOKIE,
  SESSION_TTL_MS,
  signSessionValue,
  verifySessionValue,
} from './session'

/**
 * Garde d'accès de l'interface cuisine.
 *
 * À importer côté serveur uniquement. Le garde de `layout.tsx` protège
 * l'AFFICHAGE ; la vraie barrière est ici, appelée par chaque server action et
 * chaque lecture de données — une server action est un endpoint HTTP public.
 */

/**
 * Secret de signature du cookie. Dérivé de la clé service role, qui est déjà
 * un secret serveur à haute entropie : ça évite une variable d'environnement
 * de plus à configurer, et le séparateur de domaine dans `session.ts`
 * garantit que ce secret ne signe rien d'autre que des sessions d'interface.
 */
function sessionSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY manquante : impossible de signer la session interface.'
    )
  }
  return secret
}

export async function isInterfaceAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return verifySessionValue(sessionSecret(), cookieStore.get(INTERFACE_COOKIE)?.value)
}

export async function openInterfaceSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(INTERFACE_COOKIE, signSessionValue(sessionSecret(), Date.now() + SESSION_TTL_MS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  })
}

export async function closeInterfaceSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(INTERFACE_COOKIE)
}

export interface GuardFailure {
  error: string
}

/**
 * À appeler en première ligne de chaque server action :
 *
 *   const denied = await guardInterface()
 *   if (denied) return denied
 *
 * Renvoie `null` si l'accès est légitime, sinon l'erreur à retourner tel quel.
 */
export async function guardInterface(): Promise<GuardFailure | null> {
  return (await isInterfaceAuthenticated())
    ? null
    : { error: 'Session expirée. Ressaisis le code.' }
}

/**
 * Pour les lectures serveur : lève si l'accès n'est pas légitime, plutôt que
 * de renvoyer une liste vide qui passerait pour « aucune donnée ».
 */
export async function assertInterfaceAuth(): Promise<void> {
  if (!(await isInterfaceAuthenticated())) {
    throw new Error('Accès interface refusé.')
  }
}

/**
 * Adresse de l'appelant, pour le compteur anti-force-brute.
 * Derrière Vercel, `x-forwarded-for` est posé par la plateforme ; en local il
 * est absent, d'où le repli explicite.
 */
export async function callerIp(): Promise<string> {
  const headerStore = await headers()
  const forwarded = headerStore.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return headerStore.get('x-real-ip')?.trim() || 'inconnue'
}

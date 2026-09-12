'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { callerIp, closeInterfaceSession, openInterfaceSession } from '@/lib/interface/auth'
import { isWellFormedPin, pinMatches } from '@/lib/interface/session'
import {
  THROTTLE_WINDOW_MS,
  evaluateThrottle,
  throttleMessage,
} from '@/lib/interface/throttle'

/**
 * Ouverture de session de l'interface cuisine par code à 4 chiffres.
 *
 * Fail closed : si le comptage des tentatives est impossible (table absente,
 * base injoignable), on refuse. Laisser passer donnerait un code à 4 chiffres
 * sans aucune limite de tentatives.
 */
export async function interfaceLogin(pin: string): Promise<{ ok?: true; error?: string }> {
  if (!isWellFormedPin(pin)) {
    return { error: 'Le code fait quatre chiffres.' }
  }

  const expected = process.env.INTERFACE_PIN
  if (!expected || !isWellFormedPin(expected)) {
    return {
      error:
        "Aucun code à 4 chiffres n'est configuré côté serveur (INTERFACE_PIN). Accès impossible.",
    }
  }

  const supabase = createAdminClient()
  const ip = await callerIp()
  const since = new Date(Date.now() - THROTTLE_WINDOW_MS).toISOString()

  const { data: attempts, error: attemptsError } = await supabase
    .from('pin_attempts')
    .select('attempted_at')
    .eq('ip', ip)
    .eq('succeeded', false)
    .gte('attempted_at', since)

  if (attemptsError) {
    return {
      error: `Contrôle des tentatives impossible, accès refusé : ${attemptsError.message}`,
    }
  }

  const decision = evaluateThrottle(
    (attempts as { attempted_at: string }[] | null ?? []).map((attempt) =>
      new Date(attempt.attempted_at).getTime()
    ),
    Date.now()
  )

  if (decision.blocked) {
    return { error: throttleMessage(decision.retryAfterMs) }
  }

  const correct = pinMatches(expected, pin)
  await supabase.from('pin_attempts').insert({ ip, succeeded: correct })

  if (!correct) {
    const remaining = decision.remaining - 1
    return {
      error:
        remaining > 0
          ? `Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} avant blocage.`
          : 'Code incorrect. Accès bloqué 15 minutes.',
    }
  }

  // Session ouverte : le compteur de cette adresse repart de zéro.
  await supabase.from('pin_attempts').delete().eq('ip', ip).eq('succeeded', false)
  await openInterfaceSession()

  // La navigation est laissée au client plutôt qu'à `redirect()` : le cookie
  // part dans la réponse de l'action, et l'appelant sait distinguer un succès
  // d'une erreur sans avoir à rattraper l'exception de redirection.
  return { ok: true }
}

export async function interfaceLogout(): Promise<void> {
  await closeInterfaceSession()
  redirect('/interface')
}

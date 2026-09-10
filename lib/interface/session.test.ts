import { describe, expect, it } from 'vitest'
import {
  SESSION_TTL_MS,
  isWellFormedPin,
  pinMatches,
  signSessionValue,
  verifySessionValue,
} from './session'

const SECRET = 'secret-de-test-a-haute-entropie'
const NOW = 1_800_000_000_000

describe('signature de session', () => {
  it('accepte un cookie qu elle vient de signer', () => {
    const value = signSessionValue(SECRET, NOW + SESSION_TTL_MS)
    expect(verifySessionValue(SECRET, value, NOW)).toBe(true)
  })

  it('refuse un cookie expiré', () => {
    const value = signSessionValue(SECRET, NOW - 1)
    expect(verifySessionValue(SECRET, value, NOW)).toBe(false)
  })

  it('refuse une valeur fabriquée à la main', () => {
    expect(verifySessionValue(SECRET, 'authenticated', NOW)).toBe(false)
    expect(verifySessionValue(SECRET, `${NOW + 1000}.deadbeef`, NOW)).toBe(false)
  })

  it('refuse un cookie dont on a repoussé l expiration', () => {
    const value = signSessionValue(SECRET, NOW + 1000)
    const signature = value.split('.')[1]
    const forged = `${NOW + SESSION_TTL_MS}.${signature}`
    expect(verifySessionValue(SECRET, forged, NOW)).toBe(false)
  })

  it('refuse un cookie signé avec un autre secret', () => {
    const value = signSessionValue('autre-secret', NOW + SESSION_TTL_MS)
    expect(verifySessionValue(SECRET, value, NOW)).toBe(false)
  })

  it('refuse l absence de cookie et les valeurs malformées', () => {
    expect(verifySessionValue(SECRET, undefined, NOW)).toBe(false)
    expect(verifySessionValue(SECRET, null, NOW)).toBe(false)
    expect(verifySessionValue(SECRET, '', NOW)).toBe(false)
    expect(verifySessionValue(SECRET, '.abc', NOW)).toBe(false)
    expect(verifySessionValue(SECRET, 'abc.', NOW)).toBe(false)
    expect(verifySessionValue(SECRET, 'pasunnombre.abc', NOW)).toBe(false)
  })
})

describe('pinMatches', () => {
  it('reconnaît le bon code', () => {
    expect(pinMatches('4207', '4207')).toBe(true)
  })

  it('rejette un code faux, y compris de longueur différente', () => {
    expect(pinMatches('4207', '4208')).toBe(false)
    expect(pinMatches('4207', '42')).toBe(false)
    expect(pinMatches('4207', '')).toBe(false)
  })
})

describe('isWellFormedPin', () => {
  it('exige exactement quatre chiffres', () => {
    expect(isWellFormedPin('0000')).toBe(true)
    expect(isWellFormedPin('123')).toBe(false)
    expect(isWellFormedPin('12345')).toBe(false)
    expect(isWellFormedPin('12a4')).toBe(false)
    expect(isWellFormedPin(' 1234')).toBe(false)
  })
})

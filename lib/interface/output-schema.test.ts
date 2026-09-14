import { describe, expect, it } from 'vitest'
import { OUTPUT_SCHEMA as SCHEMA_FACTURE } from './invoice-parser'
import { OUTPUT_SCHEMA as SCHEMA_RECETTE } from './recipe-parser'

/**
 * Les schémas envoyés à l'API ne sont validés qu'à l'appel, c'est-à-dire en
 * cuisine, une facture à la main. Ce test les vérifie avant.
 *
 * La règle qui a cassé la première lecture réelle : l'API refuse un `enum`
 * combiné à un `type` multiple (« Enum value 'g' does not match declared type
 * '['string', 'null']' »). Une valeur facultative passe par `anyOf`.
 */

type Noeud = Record<string, unknown>

function noeudsAvecEnum(valeur: unknown, chemin = '$'): { chemin: string; noeud: Noeud }[] {
  if (Array.isArray(valeur)) {
    return valeur.flatMap((item, index) => noeudsAvecEnum(item, `${chemin}[${index}]`))
  }
  if (valeur === null || typeof valeur !== 'object') return []

  const noeud = valeur as Noeud
  const trouves = 'enum' in noeud ? [{ chemin, noeud }] : []
  return [
    ...trouves,
    ...Object.entries(noeud).flatMap(([cle, sous]) => noeudsAvecEnum(sous, `${chemin}.${cle}`)),
  ]
}

describe('schémas envoyés à l’API', () => {
  const schemas: [string, unknown][] = [
    ['lecture de facture', SCHEMA_FACTURE],
    ['lecture de fiche recette', SCHEMA_RECETTE],
  ]

  it.each(schemas)('%s : aucun enum mêlé à un type multiple', (_nom, schema) => {
    const fautifs = noeudsAvecEnum(schema)
      .filter(({ noeud }) => Array.isArray(noeud.type))
      .map(({ chemin }) => chemin)

    expect(fautifs).toEqual([])
  })

  it.each(schemas)('%s : une valeur facultative passe par anyOf', (_nom, schema) => {
    for (const { chemin, noeud } of noeudsAvecEnum(schema)) {
      const valeurs = noeud.enum as unknown[]
      expect(valeurs.includes(null), `${chemin} ne doit pas lister null dans enum`).toBe(false)
    }
  })
})

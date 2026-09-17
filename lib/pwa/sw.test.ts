import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

/**
 * Le vrai `public/sw.js` est exécuté tel quel dans un bac à sable. Seuls le
 * cache et le réseau du navigateur, absents de Node, sont simulés.
 */

const ORIGIN = 'https://sld-cafe.vercel.app'
const ORIGIN_DEV = 'http://localhost:3000'
const SOURCE = readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf8')

type FakeRequest = { url: string; method: string; mode: string }
type Handler = (event: Record<string, unknown>) => void

const keyOf = (r: string | FakeRequest) => new URL(typeof r === 'string' ? r : r.url, ORIGIN).href

class FakeCache {
  entries = new Map<string, Response>()
  async match(r: string | FakeRequest) {
    return this.entries.get(keyOf(r))?.clone()
  }
  async put(r: string | FakeRequest, response: Response) {
    this.entries.set(keyOf(r), response)
  }
  async addAll(urls: string[]) {
    for (const url of urls) this.entries.set(keyOf(url), new Response(`précache ${url}`))
  }
}

class FakeCacheStorage {
  stores = new Map<string, FakeCache>()
  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache())
    return this.stores.get(name)!
  }
  async keys() {
    return [...this.stores.keys()]
  }
  async delete(name: string) {
    return this.stores.delete(name)
  }
  async match(r: string | FakeRequest) {
    for (const cache of this.stores.values()) {
      const hit = await cache.match(r)
      if (hit) return hit
    }
    return undefined
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function startWorker(storage = new FakeCacheStorage(), origine = ORIGIN) {
  const handlers: Record<string, Handler> = {}
  const network = { online: true }
  const self = {
    location: { origin: origine, hostname: new URL(origine).hostname },
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler
    },
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  }
  const fetch = async () => {
    if (!network.online) throw new TypeError('Failed to fetch')
    return new Response('RÉPONSE SERVEUR', { status: 200 })
  }
  vm.runInNewContext(SOURCE, { self, caches: storage, fetch, Response, URL, Promise, console })

  const lifecycle = async (type: 'install' | 'activate') => {
    let pending: unknown = undefined
    handlers[type]({ waitUntil: (p: unknown) => (pending = p) })
    await pending
  }
  await lifecycle('install')
  await lifecycle('activate')

  const request = async (pathname: string, mode = 'navigate') => {
    let responded: Promise<Response> | undefined
    handlers.fetch({
      request: { url: origine + pathname, method: 'GET', mode },
      respondWith: (p: Promise<Response>) => (responded = p),
    })
    const response = responded ? await responded : undefined
    await flush()
    return response
  }

  const [cacheName] = await storage.keys()
  return { storage, network, request, cache: () => storage.open(cacheName) }
}

describe('service worker — pages privées', () => {
  it("ne stocke pas une page /interface consultée en ligne", async () => {
    const sw = await startWorker()
    await sw.request('/interface/recettes')
    expect(await sw.storage.match('/interface/recettes')).toBeUndefined()
  })

  it("ne stocke pas une page /admin consultée en ligne", async () => {
    const sw = await startWorker()
    await sw.request('/admin/commandes')
    expect(await sw.storage.match('/admin/commandes')).toBeUndefined()
  })

  it("hors ligne, ne ressert jamais une ancienne copie d'une page /interface", async () => {
    const sw = await startWorker()
    ;(await sw.cache()).entries.set(keyOf('/interface'), new Response('VIEILLE COPIE'))
    sw.network.online = false
    const response = await sw.request('/interface')
    expect(await response?.text()).not.toContain('VIEILLE COPIE')
    expect(response?.status).toBe(503)
  })
})

describe('service worker — hors ligne', () => {
  it("ne remplace pas une page absente du cache par l'accueil", async () => {
    const sw = await startWorker()
    ;(await sw.cache()).entries.set(keyOf('/'), new Response('ACCUEIL'))
    sw.network.online = false
    const response = await sw.request('/interface/comparatif')
    const text = await response?.text()
    expect(text).not.toContain('ACCUEIL')
    expect(response?.status).toBe(503)
    expect(text).toMatch(/connexion/i)
  })

  it('garde une page publique déjà consultée disponible hors ligne', async () => {
    const sw = await startWorker()
    await sw.request('/carte')
    sw.network.online = false
    const response = await sw.request('/carte')
    expect(await response?.text()).toBe('RÉPONSE SERVEUR')
  })

  it('sert les fichiers statiques depuis le cache', async () => {
    const sw = await startWorker()
    ;(await sw.cache()).entries.set(keyOf('/_next/static/chunks/a.js'), new Response('CHUNK'))
    sw.network.online = false
    const response = await sw.request('/_next/static/chunks/a.js', 'no-cors')
    expect(await response?.text()).toBe('CHUNK')
  })
})

describe('service worker — mise à jour', () => {
  it('efface le cache sld-cafe-v1 déjà présent sur les appareils', async () => {
    const storage = new FakeCacheStorage()
    ;(await storage.open('sld-cafe-v1')).entries.set(keyOf('/interface/recettes'), new Response('PRIX'))
    await startWorker(storage)
    expect(await storage.keys()).not.toContain('sld-cafe-v1')
  })
})

describe('service worker — en développement', () => {
  it('ne met rien en cache : les noms de fichiers ne changent pas entre deux recompilations', async () => {
    const sw = await startWorker(new FakeCacheStorage(), ORIGIN_DEV)
    await sw.request('/_next/static/chunks/page.js', 'no-cors')
    await sw.request('/carte')
    const cache = await sw.cache()
    expect([...cache.entries.keys()].some((url) => url.includes('/_next/static/'))).toBe(false)
    expect([...cache.entries.keys()].some((url) => url.endsWith('/carte'))).toBe(false)
  })

  it('laisse passer la requête au serveur plutôt que de répondre à sa place', async () => {
    const sw = await startWorker(new FakeCacheStorage(), ORIGIN_DEV)
    expect(await sw.request('/interface/recettes')).toBeUndefined()
  })
})

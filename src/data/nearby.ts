import { distM, type LatLng } from './routing'

// Rider-useful stops, as OpenStreetMap tags (queried live via Overpass)
export const CATEGORIES = {
  fuel: { label: 'Gas', icon: '⛽', tags: ['amenity=fuel'] },
  vulcanizing: { label: 'Vulcanizing', icon: '◎', tags: ['shop=tyres', 'craft=vulcanizer'] },
  moto: { label: 'Moto shop', icon: '🔧', tags: ['shop=motorcycle', 'shop=motorcycle_repair', 'amenity=motorcycle_repair'] },
  parking: { label: 'Moto parking', icon: 'P', tags: ['amenity=motorcycle_parking'] },
  hospital: { label: 'Hospital', icon: '✚', tags: ['amenity=hospital', 'amenity=clinic'] },
} as const
export type Category = keyof typeof CATEGORIES

export type Poi = { id: number; name: string; lat: number; lng: number; dist: number; open?: string; brand?: string; cat: Category; tags: Record<string, string> }

const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const cache = new Map<string, Poi[]>()

export async function findNearby(cat: Category, at: LatLng, radius = 3000): Promise<Poi[]> {
  const key = `${cat}:${at[0].toFixed(3)},${at[1].toFixed(3)}`
  if (cache.has(key)) return cache.get(key)!
  const parts = CATEGORIES[cat].tags.map((t) => {
    const [k, v] = t.split('=')
    return `nwr["${k}"="${v}"](around:${radius},${at[0]},${at[1]});`
  })
  const q = `[out:json][timeout:15];(${parts.join('')});out center 40;`
  let json: any
  for (const host of MIRRORS) {
    try {
      const res = await fetch(`${host}?data=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        json = await res.json()
        break
      }
    } catch {}
  }
  if (!json) throw new Error('Nearby search is busy. Try again in a moment.')
  const pois: Poi[] = json.elements
    .map((e: any) => {
      const lat = e.lat ?? e.center?.lat
      const lng = e.lon ?? e.center?.lon
      const t = e.tags ?? {}
      return { id: e.id, lat, lng, name: t.name || t.brand || CATEGORIES[cat].label, brand: t.brand, open: t.opening_hours, cat, tags: t, dist: distM(at, [lat, lng]) }
    })
    .filter((p: Poi) => p.lat)
    .sort((a: Poi, b: Poi) => a.dist - b.dist)
    .slice(0, 8)
  cache.set(key, pois)
  return pois
}

// Photos for a place: mapped photo / Wikimedia Commons / Wikidata image, then an aerial view of the spot
const commons = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/^File:/, ''))}?width=800`
export const aerial = (lat: number, lng: number, d = 0.0012) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lng - d * 2},${lat - d},${lng + d * 2},${lat + d}&bboxSR=4326&size=800,400&format=jpg&f=image`

export async function poiPhotos(p: Poi): Promise<{ src: string; label: string }[]> {
  const t = p.tags
  const out: { src: string; label: string }[] = []
  if (t.image?.startsWith('http')) out.push({ src: t.image, label: 'Photo' })
  if (t.wikimedia_commons?.startsWith('File:')) out.push({ src: commons(t.wikimedia_commons), label: 'Photo · Wikimedia' })
  const qid = t.wikidata || t['brand:wikidata']
  if (qid) {
    try {
      const j = await (await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&property=P18&format=json&origin=*`)).json()
      const f = j.claims?.P18?.[0]?.mainsnak?.datavalue?.value
      if (f) out.push({ src: commons(f), label: t.wikidata ? 'Photo · Wikimedia' : `${p.brand ?? 'Brand'} · Wikimedia` })
    } catch {}
  }
  out.push({ src: aerial(p.lat, p.lng), label: 'Satellite view' })
  return out
}

const YES = (v?: string) => v === 'yes'
export function poiFacts(p: Poi) {
  const t = p.tags
  const address = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'] || t['addr:city']].filter(Boolean).join(' ').trim()
  const features: string[] = []
  if (t.fee) features.push(YES(t.fee) ? 'Paid' : t.fee === 'no' ? 'Free' : `Fee: ${t.fee}`)
  if (t.capacity) features.push(`${t.capacity} slots`)
  if (YES(t.covered)) features.push('Covered')
  if (t.surveillance && t.surveillance !== 'no') features.push('CCTV')
  if (YES(t.supervised)) features.push('Guarded')
  if (YES(t.toilets)) features.push('Restroom')
  if (YES(t.compressed_air)) features.push('Air pump')
  if (YES(t['fuel:octane_95']) || YES(t['fuel:octane_91'])) features.push('Unleaded')
  if (YES(t['fuel:diesel'])) features.push('Diesel')
  if (YES(t.shop) || t.shop === 'convenience' || YES(t['shop:convenience'])) features.push('Convenience store')
  if (YES(t.emergency)) features.push('Emergency room')
  if (t.opening_hours === '24/7') features.push('Open 24 hours')
  const kind: Record<Category, string> = { fuel: 'Gas station', vulcanizing: 'Tire & vulcanizing shop', moto: 'Motorcycle shop & repair', parking: 'Motorcycle parking', hospital: t.amenity === 'clinic' ? 'Clinic' : 'Hospital' }
  return {
    kind: kind[p.cat],
    description: t.description || t.note,
    address,
    hours: t.opening_hours,
    phone: t.phone || t['contact:phone'],
    website: t.website || t['contact:website'],
    operator: t.operator && t.operator !== p.name ? t.operator : undefined,
    features,
  }
}

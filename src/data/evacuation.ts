import { distM, type LatLng } from './routing'

export type SearchArea = { id: string; label: string; at: LatLng }
export type EvacuationSite = { id: string; name: string; at: LatLng; address: string; addressStatus: 'missing' | 'partial' | 'unreviewed'; distance: number; sourceUrl: string }
const HOSTS = ['https://overpass.private.coffee/api/interpreter', 'https://overpass-api.de/api/interpreter']
const cooldown = new Map<string, number>()
const cache = new Map<string, { time: number; sites: EvacuationSite[] }>()
const placeCache = new Map<string, { time: number; areas: SearchArea[] }>()
let lastPlaceRequest = 0
const coordinate = (at: LatLng) => at.every(Number.isFinite) && at[0] >= 4 && at[0] <= 22 && at[1] >= 116 && at[1] <= 127

export function evacuationQuery(at: LatLng, radius: number) {
  if (!coordinate(at) || ![10000,25000,50000].includes(radius)) throw new Error('Choose a location in the Philippines and a supported search range.')
  const around = `(area.ph)(around:${radius},${at[0]},${at[1]})`
  return `[out:json][timeout:15];area["ISO3166-1"="PH"]["admin_level"="2"]->.ph;(` +
    `nwr${around}["emergency:social_facility"="shelter"];` +
    `nwr${around}["evacuation_center"="yes"];` +
    `nwr${around}["social_facility"="shelter"]["social_facility:for"~"disaster|evacuee|displaced",i];` +
    `nwr${around}["name"~"evacuation (cent(er|re)|shelter)",i];);out center tags;`
}

export function parseSites(payload: unknown, at: LatLng, radius: number): EvacuationSite[] {
  const p = payload as { elements?: unknown[]; remark?: unknown }
  if (!p || !Array.isArray(p.elements) || p.remark) throw new Error('The map service could not complete the search. Try again.')
  const seen = new Set<string>()
  return p.elements.flatMap((raw): EvacuationSite[] => {
    const e = raw as { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string,string> }
    if (!e || !['node','way','relation'].includes(e.type) || !Number.isSafeInteger(e.id) || e.id <= 0) return []
    const t = e.tags ?? {}, name = typeof t.name === 'string' ? t.name : ''
    // Exclude generic schools, covered courts, homeless shelters and assembly points.
    const explicit = t['emergency:social_facility'] === 'shelter' || t.evacuation_center === 'yes' ||
      (t.social_facility === 'shelter' && /disaster|evacuee|displaced/i.test(t['social_facility:for'] ?? '')) || /evacuation (cent(er|re)|shelter)/i.test(name)
    const pos: LatLng = [e.lat ?? e.center?.lat ?? NaN, e.lon ?? e.center?.lon ?? NaN]
    if (!explicit || !coordinate(pos)) return []
    const distance = distM(at, pos)
    if (distance > radius) return []
    const id = `${e.type}/${e.id}`
    if (seen.has(id)) return []
    seen.add(id)
    const address = ['addr:housenumber','addr:street','addr:barangay','addr:suburb','addr:city','addr:town','addr:province'].map(k => t[k]).filter(v => typeof v === 'string' && v).join(', ')
    const locality = ['addr:city','addr:town','addr:province'].some(k => typeof t[k] === 'string' && !!t[k].trim())
    const street = typeof t['addr:street'] === 'string' && !!t['addr:street'].trim()
    const addressStatus = !address ? 'missing' : !locality || !street ? 'partial' : 'unreviewed'
    return [{ id, addressStatus, name: name || 'Mapped emergency shelter', at: pos, address: address || 'Address not provided on the map', distance, sourceUrl: `https://www.openstreetmap.org/${id}` }]
  }).sort((a,b) => a.distance - b.distance)
}

export async function searchAreas(query: string, signal: AbortSignal): Promise<SearchArea[]> {
  const q = query.trim()
  if (q.length < 3 || q.length > 160) throw new Error('Enter a city, municipality or barangay name (3–160 characters).')
  if (signal.aborted) throw new DOMException('Search cancelled', 'AbortError')
  const cacheKey = q.toLocaleLowerCase(), cached = placeCache.get(cacheKey)
  if (cached && Date.now() - cached.time < 3600000) return cached.areas
  if (Date.now() - lastPlaceRequest < 1100) throw new Error('Please wait a moment before searching again.')
  lastPlaceRequest = Date.now()
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=ph&limit=5&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal: AbortSignal.any([signal,AbortSignal.timeout(10000)]) })
  if (!res.ok) throw new Error('Location search is unavailable. Try again later.')
  const json = await res.json()
  if (!Array.isArray(json)) throw new Error('Location search returned an unexpected response.')
  const areas = json.flatMap((p): SearchArea[] => {
    const at: LatLng = [Number(p.lat),Number(p.lon)]
    return p.address?.country_code === 'ph' && coordinate(at) && typeof p.display_name === 'string' && Number.isSafeInteger(p.place_id)
      ? [{id:String(p.place_id),label:p.display_name,at}] : []
  })
  placeCache.set(cacheKey, { time: Date.now(), areas })
  return areas
}

export async function findEvacuationSites(at: LatLng, radius: number, signal: AbortSignal): Promise<EvacuationSite[]> {
  const query = evacuationQuery(at,radius), key = `${at.join(',')}:${radius}`
  if (signal.aborted) throw new DOMException('Search cancelled','AbortError')
  const saved = cache.get(key)
  if (saved && Date.now() - saved.time < 300000) return saved.sites
  for (const host of HOSTS) {
    if (signal.aborted) throw new DOMException('Search cancelled','AbortError')
    if ((cooldown.get(host) ?? 0) > Date.now()) continue
    try {
      const res = await fetch(host, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({data:query}), signal:AbortSignal.any([signal,AbortSignal.timeout(18000)]) })
      if (!res.ok) { if (res.status === 429 || res.status === 406) cooldown.set(host,Date.now()+30000); continue }
      const sites = parseSites(await res.json(),at,radius)
      cache.set(key,{time:Date.now(),sites})
      return sites
    } catch { if (signal.aborted) throw new DOMException('Search cancelled','AbortError') }
  }
  throw new Error('Evacuation-site search is unavailable. Contact your local disaster office or try again later.')
}

export async function savedEvacuationSites(at: LatLng, radius: number, signal: AbortSignal) {
  evacuationQuery(at,radius)
  const res = await fetch('/evacuation-sites.json', { signal })
  if (!res.ok) throw new Error('Saved map data is unavailable.')
  const json = await res.json()
  if (json.snapshotDate !== '2024-07-21' || json.source !== 'OpenStreetMap') throw new Error('Unrecognized saved map data.')
  return parseSites(json,at,radius)
}

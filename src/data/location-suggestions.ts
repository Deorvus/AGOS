import type { SearchArea } from './evacuation'

export type LocationSuggestion = SearchArea & { name: string; detail: string }
const cache = new Map<string, LocationSuggestion[]>()

export function parseSuggestions(payload: unknown): LocationSuggestion[] {
  const json = payload as { features?: unknown[] }
  if (!json || !Array.isArray(json.features)) throw new Error('Location suggestions are unavailable.')
  const seen = new Set<string>()
  return json.features.flatMap((value): LocationSuggestion[] => {
    const f = value as { properties?: Record<string,unknown>; geometry?: { coordinates?: unknown[]; type?: string } }
    const p = f?.properties, coords = f?.geometry?.coordinates
    if (!p || p.countrycode !== 'PH' || f.geometry?.type !== 'Point' || !Array.isArray(coords)) return []
    const [lng,lat] = coords
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 4 || lat > 22 || lng < 116 || lng > 127 || typeof p.name !== 'string' || !p.name.trim()) return []
    const name = p.name.trim()
    const parts = [p.district,p.locality,p.city,p.county,p.state].filter((v): v is string => typeof v === 'string' && !!v.trim() && v.trim().toLowerCase() !== name.toLowerCase()).map(v=>v.trim())
    const detail = [...new Set(parts), 'Philippines'].join(', ')
    const label = `${name}, ${detail}`, key = `${label.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{id:key,name,detail,label,at:[lat,lng]}]
  }).slice(0,5)
}

// Photon is designed for typeahead. Nominatim is used only for explicit form submission.
export async function suggestLocations(query: string, signal: AbortSignal) {
  const q = query.trim(), key = q.toLowerCase()
  if (q.length < 3 || q.length > 160) return []
  if (signal.aborted) throw new DOMException('Cancelled','AbortError')
  if (cache.has(key)) return cache.get(key)!
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&countrycode=PH&limit=8&lang=en`
  const res = await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(8000)])})
  if (!res.ok) throw new Error('Location suggestions are unavailable.')
  const rows = parseSuggestions(await res.json())
  cache.set(key,rows)
  return rows
}

import { suggestLocations } from './location-suggestions'
import type { Level, Node } from './sensors'

export type LatLng = [number, number]
export type Step = { type: string; modifier?: string; name: string; exit?: number; distance: number; loc: LatLng }
export type RawRoute = { coords: LatLng[]; steps: Step[]; duration: number; distance: number; detourAround?: string }
export type Evaluated = RawRoute & { hits: Node[]; worst: Level }

// Illustrative proximity rule; not a measured flood extent or road-closure boundary
export const FLOOD_RADIUS = 300

export function distM(a: LatLng, b: LatLng) {
  const R = 6371000
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function evaluate(r: RawRoute, nodes: Node[]): Evaluated {
  const hits = nodes.filter(n => n.level > 0 && (n.source !== 'community' || (Date.now() >= n.updated && Date.now() - n.updated < 21600000)) && nearRoute(r.coords, [n.lat, n.lng]))
  return { ...r, hits, worst: Math.max(0, ...hits.map((h) => h.level)) as Level }
}

// Check the intervening geometry too, rather than just sparse route vertices.
export function nearRoute(coords: LatLng[], p: LatLng, radius = FLOOD_RADIUS) {
  const metres = 6371000 * Math.PI / 180
  const project = (c: LatLng) => [(c[1] - p[1]) * metres * Math.cos(p[0] * Math.PI / 180), (c[0] - p[0]) * metres]
  return coords.some((c, i) => {
    if (distM(c, p) < radius) return true
    if (!i) return false
    const a = project(coords[i-1]), b = project(c)
    const dx = b[0] - a[0], dy = b[1] - a[1], square = dx*dx + dy*dy
    const t = square ? Math.max(0, Math.min(1, -(a[0]*dx + a[1]*dy) / square)) : 0
    return Math.hypot(a[0] + t*dx, a[1] + t*dy) < radius
  })
}

// Safest first (lowest flood level), then fastest
export const rank = (a: Evaluated, b: Evaluated) => a.worst - b.worst || a.duration - b.duration

async function osrm(points: LatLng[], alternatives: boolean, signal?: AbortSignal): Promise<RawRoute[]> {
  const path = points.map(([lat, lng]) => `${lng},${lat}`).join(';')
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson&steps=true&alternatives=${alternatives ? 3 : 'false'}`,
    { signal: signal ? AbortSignal.any([signal,AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000) },
  )
  if (!res.ok) throw new Error('Routing service unavailable')
  const json = await res.json()
  return (json.routes ?? []).map((r: any) => ({
    coords: r.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng]),
    // Flatten legs; drop the arrive/depart pair at each via point so detours read as one trip
    steps: r.legs.flatMap((leg: any, li: number, legs: any[]) =>
      leg.steps
        .filter((st: any) => !(st.maneuver.type === 'arrive' && li < legs.length - 1) && !(st.maneuver.type === 'depart' && li > 0))
        .map((st: any) => ({
          type: st.maneuver.type,
          modifier: st.maneuver.modifier,
          exit: st.maneuver.exit,
          name: st.name || st.ref || '',
          distance: st.distance,
          loc: [st.maneuver.location[1], st.maneuver.location[0]],
        })),
    ),
    duration: r.duration,
    distance: r.distance,
  }))
}

// Fetch normal alternatives; if every one crosses a sensor at the rider's avoid level, try detours via points around it
export async function planRoutes(from: LatLng, to: LatLng, nodes: Node[], avoid = 2, signal?: AbortSignal): Promise<RawRoute[]> {
  const base = await osrm([from, to], true, signal)
  if (!base.length) throw new Error('No route found. Try another destination.')
  if (base.map((r) => evaluate(r, nodes)).some((r) => r.worst < avoid)) return base

  const blockers = evaluate(base[0], nodes).hits.filter((n) => n.level >= avoid)
  const off = 0.012 // ≈ 1.3 km
  const vias: { via: LatLng; name: string }[] = blockers.flatMap((n) =>
    [
      [off, 0],
      [-off, 0],
      [0, off],
      [0, -off],
    ].map(([a, b]) => ({ via: [n.lat + a, n.lng + b] as LatLng, name: n.name })),
  )
  const detours = await Promise.all(
    vias.map(({ via, name }) =>
      osrm([from, via, to], false, signal)
        .then((r) => r.map((x) => ({ ...x, detourAround: name })))
        .catch(() => []),
    ),
  )
  return [...base, ...detours.flat()]
}

export type Suggestion = { name: string; detail?: string; lat: number; lng: number }

// Autocomplete: Photon handles partial words ("pinagk…") and typos; biased to the rider's area, Philippines-wide.
// Falls back to Nominatim if Photon is unreachable.
let near0: LatLng = [14.66, 121.045]
export const setSearchNear = (p: LatLng) => (near0 = p)

export async function geocode(q: string, _near: LatLng = near0): Promise<Suggestion[]> {
  return (await suggestLocations(q,new AbortController().signal)).map(p => ({name:p.label,detail:p.detail,lat:p.at[0],lng:p.at[1]}))
}

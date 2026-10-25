import type { Level, Node } from './sensors'

// Community flood reports. Stored on this device for now; swap load/save for a shared database
// (e.g. Supabase table + storage bucket) so every rider sees the same feed.
export type FloodReport = {
  id: string
  lat: number
  lng: number
  place: string
  level: Exclude<Level, 0>
  note: string
  photos: string[] // compressed JPEG data URLs
  takenAt: number // photo capture time (file timestamp)
  createdAt: number // upload time
  by: string
  stillFlooded: number
  cleared: number
}

const KEY = 'fw.reports'
export const REPORT_TTL = 6 * 60 * 60 * 1000 // reports fade after 6 hours

export const loadReports = (): FloodReport[] => {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(data) ? data.filter(r => r && typeof r.id === 'string' && Number.isFinite(r.lat) && Number.isFinite(r.lng) && Math.abs(r.lat) <= 90 && Math.abs(r.lng) <= 180 && [1,2,3].includes(r.level) && typeof r.place === 'string' && Array.isArray(r.photos) && Number.isFinite(r.createdAt) && Date.now() >= r.createdAt && Date.now() - r.createdAt < REPORT_TTL) : []
  } catch { return [] }
}

export function saveReports(list: FloodReport[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Storage full: keep the newest reports
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5)))
  }
}

// A report counts as active unless more riders say it's cleared than still flooded
export const isActive = (r: FloodReport) => r.cleared <= r.stillFlooded

// Treat active reports like monitored points so routing avoids them
export const reportsAsNodes = (list: FloodReport[]): Node[] =>
  list.filter(r => isActive(r) && Date.now() - r.createdAt < REPORT_TTL && Date.now() >= r.createdAt).map((r) => ({
    id: `CR-${r.id}`,
    name: r.place,
    area: 'Rider report',
    lat: r.lat,
    lng: r.lng,
    x: 0,
    y: 0,
    level: r.level,
    source: 'community',
    rain: null,
    updated: r.createdAt,
  }))

export function compressImage(file: File, max = 1024, quality = 0.7): Promise<string> {
  return new Promise((ok, no) => {
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s)
      c.height = Math.round(img.height * s)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(img.src)
      ok(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => no(new Error('Could not read that image.'))
    img.src = URL.createObjectURL(file)
  })
}

export async function placeName(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&lat=${lat}&lon=${lng}`)
    const j = await r.json()
    const a = j.address ?? {}
    return [a.road, a.suburb || a.village || a.town || a.city].filter(Boolean).join(', ') || j.display_name?.split(',').slice(0, 2).join(',') || 'Pinned location'
  } catch {
    return 'Pinned location'
  }
}

export const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ${m % 60} min ago`
}
export const stamp = (t: number) => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

import { useEffect, useState } from 'react'
import { PLACES, type Level } from './sensors'

export type Vehicle = 'motorcycle' | 'scooter' | 'bicycle' | 'car' | 'suv'

// Level at which a route is treated as blocked for that vehicle
export const VEHICLES: Record<Vehicle, { label: string; icon: string; avoid: Level; note: string }> = {
  motorcycle: { label: 'Motorcycle', icon: '🏍', avoid: 2, note: 'Default preference: avoid MID and HIGH categories. Not a clearance rating.' },
  scooter: { label: 'E-bike / scooter', icon: '🛵', avoid: 1, note: 'Default preference: avoid LOW and higher categories. Not a clearance rating.' },
  bicycle: { label: 'Bicycle', icon: '🚲', avoid: 2, note: 'Default preference: avoid MID and HIGH categories. Not a clearance rating.' },
  car: { label: 'Car / sedan', icon: '🚗', avoid: 2, note: 'Default preference: avoid MID and HIGH categories. Not a clearance rating.' },
  suv: { label: 'SUV / high clearance', icon: '🚙', avoid: 3, note: 'Default preference: avoid HIGH categories. Never implies lower levels are passable.' },
}

export type SavedPlace = { name: string; lat: number; lng: number }
export type Settings = {
  vehicle: Vehicle
  avoidOverride: Level | null
  voice: boolean
  notify: boolean
  minAlert: Level
  mapStyle: 'dark' | 'light'
  home: string
  work: string
  homePlace?: SavedPlace | null
  workPlace?: SavedPlace | null
}

export const DEFAULT_SETTINGS: Settings = {
  vehicle: 'motorcycle',
  avoidOverride: null,
  voice: true,
  notify: false,
  minAlert: 1,
  mapStyle: 'light',
  home: '',
  work: '',
}

// `id` is the stable key for database records (reports, votes); it never changes, even if the rider renames
export type User = { id: string; name: string; since: number; photo?: string; google?: { email: string; name: string; picture?: string } }

export const newUserId = () => crypto.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
// Short, readable form shown to riders, e.g. FW-3F9A-C21B
export const riderCode = (id: string) => `FW-${id.replace(/-/g, '').slice(0, 8).toUpperCase().replace(/(.{4})/, '$1-')}`

export const avoidLevel = (s: Settings) => s.avoidOverride ?? VEHICLES[s.vehicle].avoid
export const placeByName = (n: string) => PLACES.find((p) => p.name === n)

export function useStored<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return initial
      const parsed = JSON.parse(raw)
      if (typeof initial === 'boolean') return typeof parsed === 'boolean' ? parsed : initial
      return initial !== null && typeof initial === 'object' ? { ...initial, ...parsed } : parsed
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      if (v === null) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(v))
    } catch { /* Private browsing or full storage: the session still works. */ }
  }, [key, v])
  return [v, setV] as const
}

export function savedPlace(s: Settings, key: 'home' | 'work'): SavedPlace | null {
  const p = key === 'home' ? s.homePlace : s.workPlace
  if (p && typeof p.name === 'string' && p.name && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= 4 && p.lat <= 22 && p.lng >= 116 && p.lng <= 127) return p
  return placeByName(s[key]) ?? null // Preserve existing landmark choices without guessing new ones.
}

import { distM, type LatLng } from './routing'
import type { Level } from './sensors'
import { type FloodReport, isActive, REPORT_TTL } from './reports'
import { isNativeAndroid } from './device-location'
import { getStationLocation, stationState, type Station } from './monitoring'
import { LocalNotifications } from '@capacitor/local-notifications'

export type NearbyAlert = {
  id: string
  reportId: string
  place: string
  lat: number
  lng: number
  level: Exclude<Level, 0>
  distanceM: number
  detectedAt: number
  note?: string
  source: 'community' | 'prototype'
  stationCode?: string
  rain?: boolean | null
}

export const NEARBY_RADIUS_OPTIONS = [
  { value: 500, label: '500 m' },
  { value: 1000, label: '1 km (default)' },
  { value: 2000, label: '2 km' },
  { value: 3000, label: '3 km' },
] as const

export function formatDistance(distM: number): string {
  if (distM < 1000) {
    return `${Math.round(distM)} m`
  }
  return `${(distM / 1000).toFixed(1)} km`
}

/**
 * Filter and sort active, non-expired, validly-located rider reports within radius.
 * Demo stations and coordinate-less bench units are strictly excluded.
 */
export function findNearbyReports(
  userLoc: LatLng,
  reports: FloodReport[],
  radiusM: number,
  now = Date.now(),
): (FloodReport & { distanceM: number })[] {
  if (!Array.isArray(reports) || !userLoc || !Number.isFinite(userLoc[0]) || !Number.isFinite(userLoc[1])) {
    return []
  }

  return reports
    .filter((r) => {
      if (!r || typeof r !== 'object') return false
      // Must be an active rider report
      if (!isActive(r)) return false
      // Must be fresh within 6h TTL
      if (typeof r.createdAt !== 'number' || now < r.createdAt || now - r.createdAt >= REPORT_TTL) return false
      // Valid coordinates within Philippine territory
      if (
        !Number.isFinite(r.lat) ||
        !Number.isFinite(r.lng) ||
        r.lat < 4 ||
        r.lat > 22 ||
        r.lng < 116 ||
        r.lng > 127
      ) {
        return false
      }
      // Must have valid flood severity
      if (![1, 2, 3].includes(r.level)) return false

      const d = distM(userLoc, [r.lat, r.lng])
      return d <= radiusM
    })
    .map((r) => ({
      ...r,
      distanceM: distM(userLoc, [r.lat, r.lng]),
    }))
    .sort((a, b) => a.distanceM - b.distanceM)
}

export type NearbyPrototype = {
  station: Station
  stationCode: string
  name: string
  locationName: string
  lat: number
  lng: number
  level: Exclude<Level, 0>
  rain: boolean | null
  distanceM: number
  receivedAt: string
}

/**
 * Filter and sort active hardware prototype stations within radius
 * whose live sensor water level meets or exceeds the specified minimum alert level.
 */
export function findNearbyPrototypes(
  userLoc: LatLng,
  stations?: Station[],
  radiusM = 1000,
  minLevel: Level = 1,
  now = Date.now(),
): NearbyPrototype[] {
  if (!Array.isArray(stations) || !userLoc || !Number.isFinite(userLoc[0]) || !Number.isFinite(userLoc[1])) {
    return []
  }

  const results: NearbyPrototype[] = []

  for (const s of stations) {
    if (!s || typeof s !== 'object') continue
    const loc = getStationLocation(s)
    if (!loc) continue

    if (
      !Number.isFinite(loc.lat) ||
      !Number.isFinite(loc.lng) ||
      loc.lat < 4 ||
      loc.lat > 22 ||
      loc.lng < 116 ||
      loc.lng > 127
    ) {
      continue
    }

    const state = stationState(s, now)
    if (!state.current || !s.latest_reading) continue

    const r = s.latest_reading
    // Must meet or exceed the avoidance/alert threshold, and have valid discrete flood level
    if (r.water_level < minLevel || r.water_level === 0 || r.water_level > 3) continue

    const d = distM(userLoc, [loc.lat, loc.lng])
    if (d <= radiusM) {
      results.push({
        station: s,
        stationCode: s.station_code || 'QC-001',
        name: s.name.replace(/FloodWatch(\s+Prototype(\s*\d+)?)?/i, 'Agos Prototype'),
        locationName: loc.locationName,
        lat: loc.lat,
        lng: loc.lng,
        level: r.water_level as Exclude<Level, 0>,
        rain: r.rain_detected,
        distanceM: d,
        receivedAt: r.received_at,
      })
    }
  }

  return results.sort((a, b) => a.distanceM - b.distanceM)
}

/**
 * Evaluates proximity against active hardware prototype stations and community reports.
 * Returns only genuinely new or meaningfully changed alerts.
 * If an alert was already notified at the same level while inside the radius, it is not re-sent.
 * If the user leaves the radius and later re-enters, or if the water level changes, it fires again.
 */
export function evaluateNearbyDetections(
  userLoc: LatLng,
  reports: FloodReport[],
  radiusM: number,
  previouslyTracked: Map<string, number>,
  now = Date.now(),
  stations?: Station[],
  minLevel: Level = 1,
): { newAlerts: NearbyAlert[]; updatedTracked: Map<string, number> } {
  const nearbyReports = findNearbyReports(userLoc, reports, radiusM, now)
  const nearbyPrototypes = findNearbyPrototypes(userLoc, stations, radiusM, minLevel, now)
  const newAlerts: NearbyAlert[] = []
  const updatedTracked = new Map<string, number>()

  // 1. Evaluate physical hardware prototypes
  for (const p of nearbyPrototypes) {
    const protoKey = `proto-${p.station.id || p.stationCode}`
    const prevLevel = previouslyTracked.get(protoKey)
    const isNewToRadius = prevLevel === undefined
    const hasLevelChanged = prevLevel !== undefined && prevLevel !== p.level

    if (isNewToRadius || hasLevelChanged) {
      newAlerts.push({
        id: `NA-PROTO-${p.stationCode}-${p.level}-${now.toString(36)}`,
        reportId: protoKey,
        place: `${p.name} (${p.locationName})`,
        lat: p.lat,
        lng: p.lng,
        level: p.level,
        distanceM: Math.round(p.distanceM),
        detectedAt: now,
        note: `Live sensor telemetry: ${p.level === 3 ? 'HIGH' : p.level === 2 ? 'MID' : 'LOW'} water detected by prototype ${p.stationCode}.${p.rain ? ' Rain detected.' : ''}`,
        source: 'prototype',
        stationCode: p.stationCode,
        rain: p.rain,
      })
    }
    updatedTracked.set(protoKey, p.level)
  }

  // 2. Evaluate active community rider reports
  for (const r of nearbyReports) {
    const prevLevel = previouslyTracked.get(r.id)
    const isNewToRadius = prevLevel === undefined
    const hasLevelChanged = prevLevel !== undefined && prevLevel !== r.level

    if (isNewToRadius || hasLevelChanged) {
      newAlerts.push({
        id: `NA-${r.id}-${r.level}-${now.toString(36)}`,
        reportId: r.id,
        place: r.place,
        lat: r.lat,
        lng: r.lng,
        level: r.level,
        distanceM: Math.round(r.distanceM),
        detectedAt: now,
        note: r.note,
        source: 'community',
      })
    }
    // Track that this report is currently active inside the radius at this level
    updatedTracked.set(r.id, r.level)
  }

  // Sort nearest first
  newAlerts.sort((a, b) => a.distanceM - b.distanceM)

  return { newAlerts, updatedTracked }
}

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported'

let channelsInitialized = false

/**
 * Configure Android notification channels for local alerts and emergency warnings.
 */
export async function initNotificationChannels(): Promise<void> {
  if (channelsInitialized || !isNativeAndroid()) return
  try {
    await LocalNotifications.createChannel({
      id: 'flood_alerts',
      name: 'Flood & Hazard Alerts',
      description: 'Nearby flood detections and road hazard notifications',
      importance: 4,
      visibility: 1,
      vibration: true,
    })
    await LocalNotifications.createChannel({
      id: 'emergency_channel',
      name: 'Emergency & Safety Warnings',
      description: 'Urgent weather advisories and disaster warnings',
      importance: 5,
      visibility: 1,
      vibration: true,
    })
    channelsInitialized = true
  } catch (err) {
    console.warn('Failed to initialize notification channels:', err)
  }
}

export function hasNotificationSupport(): boolean {
  if (isNativeAndroid()) return true
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function checkAppNotificationPermission(): Promise<NotificationPermissionState> {
  if (isNativeAndroid()) {
    try {
      const res = await LocalNotifications.checkPermissions()
      if (res.display === 'granted') return 'granted'
      if (res.display === 'denied') return 'denied'
      return 'prompt'
    } catch {
      return 'unsupported'
    }
  }

  // Web path
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  const perm = Notification.permission
  if (perm === 'granted') return 'granted'
  if (perm === 'denied') return 'denied'
  return 'prompt'
}

/**
 * Synchronous helper for initial component state on web
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (isNativeAndroid()) {
    try {
      await initNotificationChannels()
      const current = await LocalNotifications.checkPermissions()
      if (current.display === 'granted') return 'granted'

      const res = await LocalNotifications.requestPermissions()
      return res.display === 'granted' ? 'granted' : res.display === 'denied' ? 'denied' : 'prompt'
    } catch {
      return 'denied'
    }
  }

  // Web path
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  try {
    const res = await Notification.requestPermission()
    return res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'prompt'
  } catch {
    return 'denied'
  }
}

export type NotificationPayload = {
  title: string
  body: string
  tag?: string
  icon?: string
  badge?: string
  data?: Record<string, unknown>
}

let notificationSeq = 1000

export async function sendLocalOrWebNotification(payload: NotificationPayload): Promise<boolean> {
  if (isNativeAndroid()) {
    try {
      const perm = await LocalNotifications.checkPermissions()
      if (perm.display !== 'granted') return false

      await initNotificationChannels()
      const notifId = (notificationSeq = (notificationSeq + 1) % 100000)

      await LocalNotifications.schedule({
        notifications: [
          {
            title: payload.title,
            body: payload.body,
            id: notifId,
            channelId: 'flood_alerts',
            schedule: { at: new Date(Date.now() + 50) },
            extra: payload.data,
          },
        ],
      })
      return true
    } catch (err) {
      console.warn('Native notification error:', err)
      return false
    }
  }

  // Web path
  if (!hasNotificationSupport() || Notification.permission !== 'granted') return false
  const icon = payload.icon || '/icon-192.png'
  const badge = payload.badge || '/icon-192.png'

  // ServiceWorker registration
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(payload.title, {
          body: payload.body,
          icon,
          badge,
          tag: payload.tag,
          data: payload.data ?? { url: '/' },
        })
        return true
      }
    } catch (swErr) {
      console.warn('Service worker notification fallback:', swErr)
    }
  }

  // Standard window Notification
  try {
    new Notification(payload.title, {
      body: payload.body,
      icon,
      tag: payload.tag,
    })
    return true
  } catch (err) {
    console.info('Could not send system notification:', err)
    return false
  }
}

export async function sendBackgroundNotification(payload: NotificationPayload): Promise<boolean> {
  return sendLocalOrWebNotification(payload)
}

export function sendNearbyNotification(alert: NearbyAlert): void {
  const levelLabel = alert.level === 3 ? 'HIGH' : alert.level === 2 ? 'MID' : 'LOW'
  const distanceText = formatDistance(alert.distanceM)

  if (alert.source === 'prototype') {
    const title = `⚠️ Prototype ${alert.stationCode || 'QC-001'}: ${levelLabel} flood ${distanceText} away`
    const body = `${levelLabel} flood contact detected at ${alert.place} by hardware station.${alert.rain ? ' Rain detected.' : ''} Avoid road segment.`
    void sendLocalOrWebNotification({
      title,
      body,
      tag: `agos-prototype-${alert.stationCode || alert.reportId}`,
      data: { reportId: alert.reportId, level: alert.level, source: 'prototype', stationCode: alert.stationCode },
    })
    return
  }

  const title = `Flood reported ${distanceText} away`
  const body = `${levelLabel} flood at ${alert.place}. Rider report · proceed with caution.`
  void sendLocalOrWebNotification({
    title,
    body,
    tag: `agos-nearby-${alert.reportId}`,
    data: { reportId: alert.reportId, level: alert.level, source: 'community' },
  })
}

export async function testBackgroundNotification(): Promise<boolean> {
  const perm = await requestNotificationPermission()
  if (perm !== 'granted') return false

  return await sendLocalOrWebNotification({
    title: 'Agos Flood Alert · Local Test',
    body: isNativeAndroid()
      ? 'Android local notifications are active! Agos will alert you to nearby flood reports while the app is open.'
      : 'Web notifications are active! Agos can alert you to nearby flood reports and sensor changes.',
    tag: 'agos-test-notification',
  })
}

import { stationState, type Station, WATER_LABELS } from './monitoring'
import type { Level } from './sensors'

export type MonitorEvent = {
  id: string; node: string; name: string; kind: 'water' | 'rain';
  from: Level; to: Level; rain: boolean; at: number; receivedAt: string;
  source: 'bench'; delivery: 'In-app only';
}
// Only contiguous fresh observations produce events. Historical catch-up is not an alert.
export function changes(previous: Station[], next: Station[], now: number, min: Level): MonitorEvent[] {
  return next.flatMap(s => {
    const old = previous.find(p => p.id === s.id)
    const a = old?.latest_reading, b = s.latest_reading
    if (!old || !a || !b || !stationState(old, now).current || !stationState(s, now).current ||
        Date.parse(b.received_at) <= Date.parse(a.received_at) ||
        Date.parse(b.device_observed_at!) <= Date.parse(a.device_observed_at!)) return []
    const events: MonitorEvent[] = []
    const stationName = s.name.replace(/FloodWatch(\s+Prototype(\s*\d+)?)?/i, 'Agos Prototype')
    const base = { node: s.station_code, name: stationName, from: a.water_level, to: b.water_level,
      rain: b.rain_detected, at: Date.parse(b.device_observed_at!), receivedAt: b.received_at,
      source: 'bench' as const, delivery: 'In-app only' as const }
    if (a.water_level !== b.water_level && Math.max(a.water_level, b.water_level) >= min)
      events.push({ ...base, id: `${s.id}:${b.received_at}:water`, kind: 'water' })
    if (a.rain_detected !== b.rain_detected)
      events.push({ ...base, id: `${s.id}:${b.received_at}:rain`, kind: 'rain' })
    return events
  })
}
export const eventText = (e: MonitorEvent) => e.kind === 'rain' ?
  `Rain ${e.rain ? 'detected' : 'not detected'}` : `${WATER_LABELS[e.from]} → ${WATER_LABELS[e.to]}`

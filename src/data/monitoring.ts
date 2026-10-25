import type { Level } from './sensors'

// Same read-only RPC and public browser key as the deployed FloodWatch website.
export const MONITORING_URL = 'https://vdhlljspghgqkdxsldcx.supabase.co/rest/v1/rpc/get_floodwatch_bench_data'
const PUBLIC_KEY = 'sb_publishable_33aimZky1mmUYKa6fDcamw_9IV9D03N'
export const POLL_MS = 15000
export const WATER_LABELS = ['Below LOW', 'LOW', 'MID', 'HIGH'] as const
export type Reading = {
  water_level: Level; rain_detected: boolean; received_at: string;
  device_observed_at: string | null; inconsistent: boolean;
  low_wet: boolean; mid_wet: boolean; high_wet: boolean;
  low_adc: number; mid_adc: number; high_adc: number; rain_adc: number;
}
export type Station = {
  id: string; station_code: string; name: string; mode: 'bench';
  latitude: null; longitude: null; maintenance: boolean; is_active: boolean;
  latest_reading: Reading | null;
}
export type MonitoringData = {
  mode: 'bench'; public_warning_eligible: false; stations: Station[];
  readings: Reading[]; server_time: string; data_label: string;
}
export type Snapshot = { data: MonitoringData | null; fetchedAt: number | null; cached: boolean; error: string; loading: boolean }
const CACHE_KEY = 'agos.bench-cache.v1'
const validTime = (s: unknown) => typeof s === 'string' && Number.isFinite(Date.parse(s))

function validateReading(value: unknown): asserts value is Reading {
  if (!value || typeof value !== 'object') throw new Error('Invalid sensor reading')
  const r = value as Reading
  const bools = [r.rain_detected, r.low_wet, r.mid_wet, r.high_wet, r.inconsistent]
  const adc = [r.low_adc, r.mid_adc, r.high_adc, r.rain_adc]
  if (!Number.isInteger(r.water_level) || r.water_level < 0 || r.water_level > 3 ||
      bools.some(v => typeof v !== 'boolean') || adc.some(v => !Number.isInteger(v) || v < 0 || v > 4095) ||
      !validTime(r.received_at) || (r.device_observed_at !== null && !validTime(r.device_observed_at)))
    throw new Error('Invalid sensor reading')
  const expected = r.high_wet ? 3 : r.mid_wet ? 2 : r.low_wet ? 1 : 0
  const inconsistent = (r.mid_wet && !r.low_wet) || (r.high_wet && (!r.low_wet || !r.mid_wet))
  if (r.water_level !== expected || r.inconsistent !== inconsistent) throw new Error('Sensor payload does not match contact states')
}

export function validateData(value: unknown): MonitoringData {
  if (!value || typeof value !== 'object') throw new Error('Unexpected monitoring format')
  const d = value as MonitoringData
  if (d.mode !== 'bench' || d.public_warning_eligible !== false || !Array.isArray(d.stations) ||
      !Array.isArray(d.readings) || !validTime(d.server_time) || typeof d.data_label !== 'string')
    throw new Error('Unexpected monitoring format')
  const ids = new Set<string>()
  for (const s of d.stations) {
    if (s.station_code !== 'QC-001' || s.mode !== 'bench' || s.latitude !== null || s.longitude !== null ||
        typeof s.id !== 'string' || ids.has(s.id) || typeof s.name !== 'string' ||
        typeof s.maintenance !== 'boolean' || typeof s.is_active !== 'boolean')
      throw new Error('Unverified station configuration')
    ids.add(s.id)
    if (s.latest_reading !== null) validateReading(s.latest_reading)
  }
  d.readings.forEach(validateReading)
  return d
}

// Match the website's 60s stale / 180s offline policy, and check sampling age too.
export function stationState(s: Station, now = Date.now(), failed = false) {
  const r = s.latest_reading
  if (!r) return { label: 'No readings', current: false }
  if (failed) return { label: 'Connection unavailable', current: false }
  if (s.maintenance) return { label: 'Maintenance', current: false }
  if (!s.is_active) return { label: 'Inactive', current: false }
  const receivedAge = now - Date.parse(r.received_at)
  const observedAge = r.device_observed_at ? now - Date.parse(r.device_observed_at) : NaN
  if (!Number.isFinite(receivedAge) || receivedAge < -60000 || (Number.isFinite(observedAge) && observedAge < -60000))
    return { label: 'Invalid timestamp', current: false }
  if (Math.max(receivedAge, Number.isFinite(observedAge) ? observedAge : receivedAge) > 180000)
    return { label: 'Offline', current: false }
  if (Math.max(receivedAge, Number.isFinite(observedAge) ? observedAge : receivedAge) > 60000)
    return { label: 'Stale', current: false }
  if (r.inconsistent) return { label: 'Check sensors', current: false }
  if (!r.device_observed_at) return { label: 'Sampling time unknown', current: false }
  return { label: 'Receiving', current: true }
}

export async function fetchMonitoring(signal?: AbortSignal): Promise<MonitoringData> {
  const timeout = AbortSignal.timeout(12000)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  const response = await fetch(MONITORING_URL, {
    method: 'POST', headers: { apikey: PUBLIC_KEY, 'Content-Type': 'application/json' },
    body: '{}', cache: 'no-store', signal: combined,
  })
  if (!response.ok) throw new Error(`Monitoring request failed (${response.status})`)
  return validateData(await response.json())
}

export function loadSnapshot(): Snapshot {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null')
    if (saved && typeof saved.fetchedAt === 'number') return {
      data: validateData(saved.data), fetchedAt: saved.fetchedAt, cached: true, error: '', loading: true,
    }
  } catch { /* Invalid cache is never treated as a reading. */ }
  return { data: null, fetchedAt: null, cached: false, error: '', loading: true }
}
export function saveSnapshot(data: MonitoringData, fetchedAt: number) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, fetchedAt })) } catch { /* Storage may be unavailable. */ }
}
export const formatTime = (s: string | number | null) => s === null ? 'Unknown' :
  new Date(s).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'medium' }) + ' PHT'

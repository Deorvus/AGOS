import type { Reading } from './monitoring'
export type Trial = {
  id: string; savedAt: string; mode: 'physical' | 'historical' | 'simulated'; condition: string;
  station: string; expectedLevel: number; expectedRain: boolean; reading: Reading | null;
  valid: boolean; reason: string; responseSeconds: number | null;
  notification: 'not-tested' | 'generated' | 'received' | 'failed';
}
export const TRIAL_KEY = 'agos.local-trials.v1'
export function csv(rows: Record<string, unknown>[]) {
  const columns = [...new Set(rows.flatMap(r => Object.keys(r)))]
  const cell = (v: unknown) => { const s = String(v ?? ''); return '"' + (/^[=+@-]/.test(s) ? "'" : '') + s.replace(/"/g, '""') + '"' }
  return '\uFEFF' + [columns.map(cell).join(','), ...rows.map(r => columns.map(c => cell(r[c])).join(','))].join('\r\n')
}
export function summarize(trials: Trial[]) {
  const physical = trials.filter(t => t.valid && t.mode === 'physical' && t.reading && !t.reading.inconsistent)
  const response = physical.flatMap(t => t.responseSeconds !== null && Number.isFinite(t.responseSeconds) && t.responseSeconds >= 0 ? [t.responseSeconds] : [])
  const tested = physical.filter(t => t.notification === 'received' || t.notification === 'failed')
  return {
    validTrials: physical.length,
    waterAccuracy: physical.length ? physical.filter(t => t.expectedLevel === t.reading!.water_level).length / physical.length * 100 : null,
    rainAccuracy: physical.length ? physical.filter(t => t.expectedRain === t.reading!.rain_detected).length / physical.length * 100 : null,
    responseSamples: response.length,
    meanResponseSeconds: response.length ? response.reduce((a,b) => a+b,0) / response.length : null,
    notificationTests: tested.length,
    receiptRate: tested.length ? tested.filter(t => t.notification === 'received').length / tested.length * 100 : null,
  }
}
export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = name; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

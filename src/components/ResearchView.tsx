import { useState, type FormEvent } from 'react'
import { formatTime, stationState, WATER_LABELS, type Snapshot } from '../data/monitoring'
import { type MonitorEvent } from '../data/events'
import { downloadCsv, summarize, TRIAL_KEY, type Trial } from '../data/research'

export default function ResearchView({ snapshot, events, onBack }: { snapshot: Snapshot; events: MonitorEvent[]; onBack: () => void }) {
  const [opened, setOpened] = useState(false)
  const [trials, setTrials] = useState<Trial[]>(() => {
    try { const rows = JSON.parse(localStorage.getItem(TRIAL_KEY) ?? '[]'); return Array.isArray(rows) ? rows.filter(t => t && typeof t.id === 'string' && ['physical','historical','simulated'].includes(t.mode) && typeof t.condition === 'string') : [] } catch { return [] }
  })
  const [message, setMessage] = useState('')
  const s = snapshot.data?.stations[0], r = s?.latest_reading ?? null
  const current = !!s && stationState(s, Date.now(), snapshot.cached || !!snapshot.error).current
  const stats = summarize(trials)
  const save = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const mode = f.get('mode') as Trial['mode']
    const seconds = String(f.get('seconds') ?? '').trim()
    const requestedValid = f.get('valid') === 'on'
    const reason = String(f.get('reason') ?? '').trim()
    if (requestedValid && !reason) { setMessage('Record validation evidence or an exclusion reason.'); return }
    const trial: Trial = { id: crypto.randomUUID(), savedAt: new Date().toISOString(), mode,
      condition: String(f.get('condition')).trim(), station: s?.station_code ?? 'Unavailable',
      expectedLevel: Number(f.get('level')), expectedRain: f.get('rain') === 'true', reading: r ? { ...r } : null,
      valid: requestedValid && current && mode === 'physical',
      reason: requestedValid && (!current || mode !== 'physical') ? 'Excluded from physical metrics: historical, simulated, unavailable or stale reading. ' + reason : reason,
      responseSeconds: seconds ? Number(seconds) : null, notification: f.get('notification') as Trial['notification'],
    }
    const next = [...trials, trial]
    setTrials(next)
    try { localStorage.setItem(TRIAL_KEY, JSON.stringify(next)); setMessage('Trial saved on this device. No data uploaded.') }
    catch { setMessage('Trial retained in this session only. Storage is unavailable; export before leaving.') }
  }
  return <div className="mx-auto grid max-w-3xl gap-5">
    <header className="flex items-center gap-3"><button onClick={onBack} className="min-h-11 rounded-lg border border-line px-4" aria-label="Back to developer tools">←</button><h1 className="text-2xl font-bold">Local research notebook</h1></header>
    <p className="rounded-xl border border-line bg-panel p-5 text-sm">For controlled research trials. This is a device-local notebook, not an authenticated researcher account. No station management or protected server data is exposed. Secure shared research access requires backend-enforced roles before launch.</p>
    {!opened ? <button onClick={() => setOpened(true)} className="rounded-xl bg-teal p-4 font-bold text-white">Open local trial tools</button> : <>
      <p className="text-sm text-fog">Current source: QC-001 bench testing. Latest measurement: {formatTime(r?.device_observed_at ?? null)}. {current ? 'Fresh bench reading available.' : 'Historical or unavailable. Excluded from physical trial metrics.'}</p>
      <form onSubmit={save} className="grid gap-4 rounded-xl border border-line bg-panel p-5">
        <label>Trial type<select name="mode" defaultValue="historical" className="mt-1 w-full rounded-lg border border-line p-3"><option value="historical">Historical reading review</option><option value="physical">Physical prototype trial</option><option value="simulated">Simulated test (separate)</option></select></label>
        <label>Actual controlled condition<textarea name="condition" required maxLength={1000} className="mt-1 w-full rounded-lg border border-line p-3" placeholder="Describe the actual setup or historical review." /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label>Expected water condition<select name="level" className="mt-1 w-full rounded-lg border border-line p-3">{WATER_LABELS.map((v,i) => <option key={v} value={i}>{v}</option>)}</select></label><label>Expected rain<select name="rain" className="mt-1 w-full rounded-lg border border-line p-3"><option value="false">Not detected</option><option value="true">Detected</option></select></label></div>
        <label>Measured condition-to-response time (seconds)<input name="seconds" type="number" min="0" step="any" className="mt-1 w-full rounded-lg border border-line p-3" placeholder="Leave blank if not measured" /></label>
        <p className="text-xs text-fog">Use a stopwatch or synchronized clocks. Backend receipt minus device time is not complete warning-delivery latency.</p>
        <label>Notification outcome<select name="notification" className="mt-1 w-full rounded-lg border border-line p-3"><option value="not-tested">Not tested</option><option value="generated">Generated only; receipt unconfirmed</option><option value="received">Receipt observed during controlled test</option><option value="failed">Controlled delivery test failed</option></select></label>
        <label className="flex items-center gap-3"><input type="checkbox" name="valid" className="h-5 w-5"/>Verified valid physical trial</label>
        <label>Validation evidence / exclusion reason<textarea name="reason" maxLength={1000} className="mt-1 w-full rounded-lg border border-line p-3" /></label>
        <button className="rounded-xl bg-teal p-4 font-bold text-white">Record trial snapshot</button>
      </form>
      <p role="status" className="text-sm font-semibold">{message}</p>
      <section className="rounded-xl border border-line bg-panel p-5"><h2 className="text-xl font-bold">Physical trial summary</h2><p className="mt-2 text-sm">Valid trials: {stats.validTrials}<br/>Water accuracy: {stats.waterAccuracy === null ? 'Not measured' : stats.waterAccuracy.toFixed(1) + '%'}<br/>Rain accuracy: {stats.rainAccuracy === null ? 'Not measured' : stats.rainAccuracy.toFixed(1) + '%'}<br/>Mean response: {stats.meanResponseSeconds === null ? 'Not measured' : stats.meanResponseSeconds.toFixed(2) + ' seconds'} ({stats.responseSamples} timed trials)<br/>Confirmed notification receipt: {stats.receiptRate === null ? 'Not measured' : stats.receiptRate.toFixed(1) + '%'} ({stats.notificationTests} delivery tests)</p><p className="mt-2 text-xs text-fog">Historical, simulated and invalid trials are retained, but excluded. Generated-only notifications are excluded from receipt rate.</p></section>
      <button disabled={!trials.length} onClick={() => downloadCsv('agos-research-trials.csv', trials.map(t => ({ ...t, reading: JSON.stringify(t.reading) })))} className="rounded-xl border border-line p-4 font-semibold disabled:opacity-40">Export all {trials.length} trials (CSV)</button>
      <button disabled={!events.length} onClick={() => downloadCsv('agos-bench-events.csv', events.map(e => ({ ...e })))} className="rounded-xl border border-line p-4 font-semibold disabled:opacity-40">Export {events.length} session events (CSV)</button>
      <ul className="grid gap-3">{trials.map(t => <li key={t.id} className="rounded-xl border border-line bg-panel p-4"><b>{t.mode} · {t.valid ? 'valid' : 'excluded / incomplete'}</b><p className="mt-1 break-words text-sm">{t.condition}</p><p className="text-xs text-fog">{formatTime(t.savedAt)} · {t.reason || 'No validation evidence recorded'}</p></li>)}</ul>
    </>}
  </div>
}


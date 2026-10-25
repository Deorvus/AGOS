import { formatTime, stationState, WATER_LABELS, type Snapshot } from '../data/monitoring'

export default function MonitoringPanel({ snapshot, now, retry }: { snapshot: Snapshot; now: number; retry: () => void }) {
  return <section className="mb-6 grid gap-4" aria-label="Prototype monitoring">
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-wider text-teal">Connected to FloodWatch</p>
          <h1 className="mt-1 text-2xl font-extrabold">Flood information</h1></div>
        <button onClick={retry} disabled={snapshot.loading} className="rounded-lg border border-line px-4 py-3 font-semibold disabled:opacity-50">{snapshot.loading ? 'Refreshing…' : 'Refresh readings'}</button>
      </div>
      <p className="mt-3 rounded-xl bg-page p-3 font-semibold">Current road conditions unknown</p>
      <p className="mt-3 text-sm text-fog">This is a test sensor with no installed road location. Follow official advisories before travelling.</p>
      <p role="status" className="mt-3 text-sm font-semibold">{snapshot.error ? 'Connection unavailable. Current conditions are unknown.' : snapshot.cached ? 'Cached snapshot. Current conditions are unknown until refreshed.' : snapshot.loading ? 'Checking the shared data source…' : 'Shared data source reached. See each reading’s age below.'}</p>
      {snapshot.error && <p className="mt-1 break-words text-sm text-fog">{snapshot.error}</p>}
      {!snapshot.data?.stations.length && <p className="mt-4 text-fog">No verified station readings available.</p>}
    </div>
    {snapshot.data?.stations.map(s => {
      const r = s.latest_reading
      const status = stationState(s, now, !!snapshot.error || snapshot.cached)
      return <article key={s.id} className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-bold">{s.name}</h2>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${status.current ? 'bg-teal/10 text-teal' : 'bg-line text-paper'}`}>{status.label}</span></div>
        <p className="mt-1 text-sm text-fog">{s.station_code} · Prototype Test Data — Bench Testing</p>
        {!status.current && <p className="mt-3 rounded-lg bg-page p-3 text-sm font-semibold">Historical values below. Current water and rain conditions are unknown.</p>}
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-fog">{status.current ? 'Water sensor condition' : 'Last known water condition'}</dt><dd className="text-lg font-bold">{r ? WATER_LABELS[r.water_level] : 'Unknown'}</dd></div>
          <div><dt className="text-fog">{status.current ? 'Rain detection' : 'Last known rain detection'}</dt><dd className="text-lg font-bold">{r ? r.rain_detected ? 'Detected' : 'Not detected' : 'Unknown'}</dd></div>
          <div><dt className="text-fog">Reading age</dt><dd className="font-semibold">{r?.device_observed_at ? (() => { const minutes = Math.max(0,Math.floor((now-Date.parse(r.device_observed_at!))/60000));return minutes < 1 ? 'Less than a minute old' : minutes < 60 ? `${minutes} minutes old` : minutes < 1440 ? `${Math.floor(minutes/60)} hours old` : `${Math.floor(minutes/1440)} days old` })() : 'Measurement time unknown'}</dd><dd className="mt-1 text-xs text-fog">{formatTime(r?.device_observed_at ?? null)}</dd></div>
        </dl>
        <details className="mt-4 border-t border-line pt-2 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-teal">Reading details</summary><dl className="grid gap-3 pb-3"><div><dt className="text-fog">Backend received time</dt><dd>{formatTime(r?.received_at ?? null)}</dd></div><div><dt className="text-fog">App fetched this snapshot</dt><dd>{formatTime(snapshot.fetchedAt)}</dd></div><div><dt className="text-fog">Station location</dt><dd>Not deployed · coordinates unavailable</dd></div></dl></details>
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-fog">LOW, MID and HIGH are contact-sensor conditions. Actual water depth and rainfall intensity are not measured. Follow official advisories.</p>
      </article>
    })}
  </section>
}

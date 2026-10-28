import { formatTime, getStationLocation, stationState, WATER_LABELS, type Snapshot } from '../data/monitoring'

export default function MonitoringPanel({
  snapshot,
  now,
  retry,
}: {
  snapshot: Snapshot
  now: number
  retry: () => void
}) {
  return (
    <section className="mb-6 grid gap-4" aria-label="Bench monitoring">
      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal">
              Bench Prototype · QC-001
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-paper">
              Sensor readings
            </h1>
          </div>
          <button
            onClick={retry}
            disabled={snapshot.loading}
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold transition hover:border-fog disabled:opacity-50"
          >
            {snapshot.loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {snapshot.error ? (
          <p role="status" className="mt-3 text-xs font-semibold text-l2">
            Connection unavailable. Showing last retained reading.
          </p>
        ) : snapshot.cached ? (
          <p role="status" className="mt-3 text-xs text-fog">
            Cached readings from previous session.
          </p>
        ) : null}

        {!snapshot.data?.stations.length && (
          <p className="mt-3 text-sm text-fog">No station readings currently available.</p>
        )}
      </div>

      {snapshot.data?.stations.map((s) => {
        const r = s.latest_reading
        const status = stationState(s, now, !!snapshot.error || snapshot.cached)
        const stationName = s.name.replace(/FloodWatch(\s+Prototype(\s*\d+)?)?/i, 'Agos Prototype')
        const loc = getStationLocation(s)
        return (
          <article key={s.id} className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-paper">{stationName}</h2>
                <p className="text-xs text-fog">
                  {s.station_code} · {loc ? loc.locationName : 'No road coordinates'}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  status.current ? 'bg-teal/10 text-teal' : 'bg-line text-paper'
                }`}
              >
                {status.label}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-page/60 p-3">
                <dt className="text-xs text-fog">Water sensor</dt>
                <dd className="mt-0.5 text-lg font-bold text-paper">
                  {r ? WATER_LABELS[r.water_level] : 'Unknown'}
                </dd>
              </div>
              <div className="rounded-xl bg-page/60 p-3">
                <dt className="text-xs text-fog">Rain detection</dt>
                <dd className="mt-0.5 text-lg font-bold text-paper">
                  {r ? (r.rain_detected ? 'Detected' : 'Not detected') : 'Unknown'}
                </dd>
              </div>
              <div className="sm:col-span-2 rounded-xl bg-page/60 p-3">
                <dt className="text-xs text-fog">Reading age</dt>
                <dd className="mt-0.5 font-semibold text-paper">
                  {r?.device_observed_at
                    ? (() => {
                        const minutes = Math.max(
                          0,
                          Math.floor((now - Date.parse(r.device_observed_at!)) / 60000),
                        )
                        return minutes < 1
                          ? 'Less than a minute old'
                          : minutes < 60
                            ? `${minutes} minutes old`
                            : minutes < 1440
                              ? `${Math.floor(minutes / 60)} hours old`
                              : `${Math.floor(minutes / 1440)} days old`
                      })()
                    : 'Measurement time unknown'}
                </dd>
                <dd className="mt-1 text-xs text-fog">
                  {formatTime(r?.device_observed_at ?? null)}
                </dd>
              </div>
            </dl>
          </article>
        )
      })}
    </section>
  )
}

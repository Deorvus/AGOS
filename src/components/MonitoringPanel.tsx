import { useState } from 'react'
import {
  formatTime,
  getStationLocation,
  stationState,
  type Reading,
  type Snapshot,
} from '../data/monitoring'
import { WaterLevelGraphic, RainGraphic } from './SensorGraphics'

export function getFriendlyWaterLevel(level: number | undefined) {
  switch (level) {
    case 0:
      return {
        title: 'Clear · No Water Contact',
        depth: 'Under 30 cm',
        subtitle: 'Road surface is clear at the sensor point',
        badge: 'text-ok bg-ok/10 border-ok/30',
        color: 'text-ok',
      }
    case 1:
      return {
        title: 'Shallow Flood (~30 cm)',
        depth: '30 cm · Gutter / Ankle depth',
        subtitle: 'Light water accumulation; proceed with high caution',
        badge: 'text-l1 bg-l1/10 border-l1/30',
        color: 'text-l1',
      }
    case 2:
      return {
        title: 'Hazardous Flood (~60 cm)',
        depth: '60 cm · Knee-high water',
        subtitle: 'Exhaust & engine submersion risk; avoid passing',
        badge: 'text-l2 bg-l2/10 border-l2/30',
        color: 'text-l2',
      }
    case 3:
      return {
        title: 'Severe Flood (~90 cm)',
        depth: '90 cm · Waist-deep water',
        subtitle: 'Extremely deep water; road is completely impassable',
        badge: 'text-l3 bg-l3/10 border-l3/30',
        color: 'text-l3',
      }
    default:
      return {
        title: 'Unknown',
        depth: 'Depth unknown',
        subtitle: 'No measurement available',
        badge: 'text-fog bg-page border-line',
        color: 'text-fog',
      }
  }
}

export function getFriendlyRainStatus(rain: boolean | undefined) {
  if (rain === undefined) {
    return {
      title: 'Unknown',
      subtitle: 'Rain sensor status unavailable',
      badge: 'text-fog bg-page',
      color: 'text-fog',
    }
  }
  if (rain) {
    return {
      title: 'Active Rainfall',
      subtitle: 'Rain sensor is actively recording wetness',
      badge: 'text-teal bg-teal/10',
      color: 'text-teal',
    }
  }
  return {
    title: 'Clear & Dry',
    subtitle: 'No rain or precipitation sensed',
    badge: 'text-fog bg-page',
    color: 'text-fog',
  }
}

export default function MonitoringPanel({
  snapshot,
  now,
  retry,
}: {
  snapshot: Snapshot
  now: number
  retry: () => void
}) {
  const [showHistory, setShowHistory] = useState(false)

  // Collect historical readings if available
  const historyReadings: Reading[] = snapshot.data?.readings ?? []

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
        const isOffline = !status.current
        const stationName = s.name.replace(/FloodWatch(\s+Prototype(\s*\d+)?)?/i, 'Agos Prototype')
        const loc = getStationLocation(s)

        const waterInfo = getFriendlyWaterLevel(r?.water_level)
        const rainInfo = getFriendlyRainStatus(r?.rain_detected)

        const allReadings = historyReadings.length > 0 ? historyReadings : (r ? [r] : [])

        return (
          <article key={s.id} className="rounded-2xl border border-line bg-panel p-5 transition">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
              <div>
                <h2 className="text-xl font-bold text-paper">{stationName}</h2>
                <p className="text-xs text-fog">
                  {s.station_code} · {loc ? loc.locationName : 'No road coordinates'}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  status.current
                    ? 'bg-teal/10 text-teal'
                    : 'bg-line/70 text-fog'
                }`}
              >
                {status.label}
              </span>
            </div>

            {/* Offline view: strictly displays offline state without live readings to prevent misinterpretation */}
            {isOffline ? (
              <div className="py-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-line/50 text-2xl text-fog">
                  ⊘
                </div>
                <h3 className="mt-3 text-lg font-bold text-paper">Device is currently offline</h3>
                <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-fog">
                  Live sensor readings are hidden while this station is disconnected to prevent
                  misinterpreting stale records as current road conditions.
                </p>
                {r?.device_observed_at && (
                  <p className="mt-2 text-xs font-medium text-fog">
                    Last recorded signal: {formatTime(r.device_observed_at)}
                  </p>
                )}

                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => setShowHistory((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-xl border border-line bg-page px-4 py-2.5 text-xs font-bold text-paper transition hover:border-fog active:scale-[0.98]"
                  >
                    <span>{showHistory ? 'Hide reading history' : 'View reading history'}</span>
                    <span className="text-fog">{showHistory ? '▲' : '▼'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Live view: animated graphics and user-friendly terminology */
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Water Sensor Card with Animated Graphics */}
                  <div className="flex flex-col justify-between rounded-xl border border-line bg-page/40 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-fog">
                          Water Sensor
                        </span>
                        <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${waterInfo.badge}`}>
                          {waterInfo.depth}
                        </span>
                      </div>
                      <h4 className={`mt-2 text-base font-extrabold ${waterInfo.color}`}>
                        {waterInfo.title}
                      </h4>
                      <p className="mt-1 text-xs text-fog leading-relaxed">
                        {waterInfo.subtitle}
                      </p>
                    </div>

                    <div className="mt-3">
                      <WaterLevelGraphic level={r?.water_level} isCurrent={true} />
                    </div>
                  </div>

                  {/* Rain Detection Card with Animated Graphics */}
                  <div className="flex flex-col justify-between rounded-xl border border-line bg-page/40 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-fog">
                          Rain Detection
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${rainInfo.badge}`}>
                          {rainInfo.title}
                        </span>
                      </div>
                      <h4 className={`mt-2 text-base font-extrabold ${rainInfo.color}`}>
                        {rainInfo.title}
                      </h4>
                      <p className="mt-1 text-xs text-fog leading-relaxed">
                        {rainInfo.subtitle}
                      </p>
                    </div>

                    <div className="mt-3">
                      <RainGraphic rainDetected={r?.rain_detected} isCurrent={true} />
                    </div>
                  </div>
                </div>

                {/* Live reading age banner & history toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-page/60 px-4 py-3 text-xs">
                  <div>
                    <span className="font-semibold text-paper">Live telemetry: </span>
                    <span className="text-fog">
                      {r?.device_observed_at
                        ? (() => {
                            const minutes = Math.max(
                              0,
                              Math.floor((now - Date.parse(r.device_observed_at!)) / 60000),
                            )
                            return minutes < 1
                              ? 'Updated less than a minute ago'
                              : `${minutes} minute${minutes === 1 ? '' : 's'} ago`
                          })()
                        : 'Sampling time unknown'}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowHistory((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 font-bold text-paper transition hover:border-fog active:scale-[0.98]"
                  >
                    <span>{showHistory ? 'Hide history' : 'View reading history'}</span>
                    <span className="text-xs text-fog">{showHistory ? '▲' : '▼'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Reading history expandable section */}
            {showHistory && (
              <div className="mt-4 border-t border-line pt-4 animate-fade-in">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-fog">
                    Historical Readings ({allReadings.length})
                  </h4>
                  <span className="text-[11px] text-fog">Recorded observations</span>
                </div>

                {allReadings.length === 0 ? (
                  <p className="rounded-xl bg-page/50 p-4 text-center text-xs text-fog">
                    No reading history recorded yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-line rounded-xl border border-line bg-page/30 overflow-hidden text-xs">
                    {allReadings.slice(0, 15).map((item, idx) => {
                      const itemWater = getFriendlyWaterLevel(item.water_level)
                      const itemRain = getFriendlyRainStatus(item.rain_detected)
                      const itemTime = item.device_observed_at ?? item.received_at
                      return (
                        <li key={idx} className="flex flex-wrap items-center justify-between gap-3 p-3 hover:bg-page/60 transition">
                          <div>
                            <span className="font-semibold text-paper">{formatTime(itemTime)}</span>
                            <div className="mt-0.5 flex items-center gap-2 text-fog text-[11px]">
                              <span>{itemWater.depth}</span>
                              <span>·</span>
                              <span>{itemRain.title}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded px-2 py-0.5 font-bold text-[11px] ${itemWater.badge}`}>
                              {itemWater.title.split('·')[0].trim()}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}

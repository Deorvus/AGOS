import type { FloodReport } from '../data/reports'
import { eventText, type MonitorEvent } from '../data/events'
import { formatTime } from '../data/monitoring'
import { LEVELS } from '../data/sensors'
import { formatDistance, type NearbyAlert } from '../data/nearby-alerts'
import CommunityReports from './CommunityReports'

export default function AlertFeed({
  alerts,
  reports,
  setReports,
  by,
  nearbyAlerts = [],
  nearbyEnabled = false,
  onClearNearby,
}: {
  alerts: MonitorEvent[]
  notify: boolean
  setNotify: (v: boolean) => void
  reports: FloodReport[]
  setReports: (r: FloodReport[]) => void
  by: string
  nearbyAlerts?: NearbyAlert[]
  nearbyEnabled?: boolean
  onClearNearby?: () => void
}) {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <section className="rounded-xl border border-line bg-panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Nearby flood alerts</h1>
            <p className="mt-1 text-sm text-fog">
              {nearbyEnabled
                ? 'Monitored against hardware prototypes and active rider reports while Agos is open.'
                : 'Turn on nearby alerts in Settings to receive warnings when prototypes or flood reports are near you.'}
            </p>
          </div>
          {nearbyAlerts.length > 0 && onClearNearby && (
            <button
              onClick={onClearNearby}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-fog hover:border-fog hover:text-paper"
            >
              Clear
            </button>
          )}
        </div>

        {nearbyEnabled ? (
          nearbyAlerts.length > 0 ? (
            <ul className="mt-4 grid gap-3">
              {nearbyAlerts.map((na) => {
                const lvl = LEVELS[na.level]
                return (
                  <li
                    key={na.id}
                    className="rounded-xl border border-line bg-page p-4 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase text-white ${lvl.color}`}
                        >
                          {lvl.short}
                        </span>
                        <span className="text-xs font-semibold text-fog">
                          · {formatDistance(na.distanceM)} away
                        </span>
                        {na.source === 'prototype' && (
                          <span className="rounded bg-teal/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal">
                            PROTOTYPE {na.stationCode || 'QC-001'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-fog">
                        {formatTime(na.detectedAt)}
                      </span>
                    </div>
                    <h2 className="mt-1.5 text-base font-bold text-paper">
                      {na.place}
                    </h2>
                    {na.note && (
                      <p className="mt-1 text-xs text-fog">"{na.note}"</p>
                    )}
                    <p className="mt-2 text-[11px] font-medium text-fog">
                      {na.source === 'prototype'
                        ? `Source: Hardware prototype ${na.stationCode || 'QC-001'} · live sensor reading${na.rain ? ' · rain detected' : ''}`
                        : 'Source: Rider report · not a verified sensor reading'}
                    </p>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg bg-page p-3.5 text-xs text-fog">
              No active flood reports currently detected within your nearby radius.
            </p>
          )
        ) : (
          <p className="mt-4 rounded-lg bg-page p-3.5 text-xs text-fog">
            Nearby detection is currently disabled.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-line bg-panel p-5">
        <h2 className="text-xl font-bold">Bench monitoring events</h2>
        <p className="mt-1 text-sm text-fog">
          QC-001 is a bench prototype without physical coordinates. These are test events while Agos is open, not public warnings.
        </p>
      </section>
      {!alerts.length && (
        <p role="status" className="rounded-xl bg-panel p-5 text-fog">
          No new events in this session. Historical readings do not generate alerts.
        </p>
      )}
      {alerts.length > 0 && (
        <ul className="grid gap-3">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-xl border border-line bg-panel p-5">
              <p className="text-xs font-bold uppercase text-teal">
                Bench test · {a.node}
              </p>
              <h3 className="mt-1 text-xl font-bold">
                {a.name}: {eventText(a)}
              </h3>
              <p className="mt-2 text-sm text-fog">
                Measured: {formatTime(a.at)}
                <br />
                Received by backend: {formatTime(a.receivedAt)}
                <br />
                Delivery: {a.delivery} · device receipt not confirmed
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-fog">
        Community reports below are user-submitted, stored only on this device, and expire after six hours. They are not sensor readings.
      </p>
      <CommunityReports reports={reports} setReports={setReports} by={by} />
    </div>
  )
}

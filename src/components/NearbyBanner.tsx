import { useEffect } from 'react'
import type { NearbyAlert } from '../data/nearby-alerts'
import { formatDistance } from '../data/nearby-alerts'
import { LEVELS } from '../data/sensors'

type Props = {
  alert: NearbyAlert
  onDismiss: () => void
  onViewAlerts: () => void
}

export default function NearbyBanner({ alert, onDismiss, onViewAlerts }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
    }, 12000)
    return () => clearTimeout(timer)
  }, [alert.id, onDismiss])

  const levelInfo = LEVELS[alert.level]

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-3 z-50 mx-auto max-w-lg px-3 animate-fade-in"
    >
      <div className="flex items-start gap-3 rounded-2xl border-2 border-line bg-panel p-4 shadow-xl ring-1 ring-black/5">
        <span
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${levelInfo.color}`}
        >
          △
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-extrabold uppercase tracking-wide ${levelInfo.text}`}>
              {levelInfo.short} FLOOD
            </span>
            <span className="text-xs font-semibold text-fog">
              · {formatDistance(alert.distanceM)} away
            </span>
          </div>
          <h2 className="mt-0.5 truncate text-base font-bold text-paper">
            {alert.place}
          </h2>
          <p className="mt-1 text-xs text-fog">
            Rider report · not a fixed sensor reading.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={onViewAlerts}
              className="rounded-lg bg-teal px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#005c66]"
            >
              View in Alerts
            </button>
            <button
              onClick={onDismiss}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-fog hover:text-paper"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Close nearby alert banner"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-fog hover:bg-page"
        >
          ✕
        </button>
      </div>
    </aside>
  )
}

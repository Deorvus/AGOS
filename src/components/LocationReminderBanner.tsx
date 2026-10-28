import { useEffect, useState } from 'react'
import {
  shouldShowLocationReminder,
  recordLocationReminderDismissed,
  checkLocationPermission,
  requestLocationPermission,
  openAppSettings,
  onAppResume,
  isLocationGranted,
  type LocationPermissionState,
} from '../data/device-location'

export default function LocationReminderBanner() {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<LocationPermissionState>('granted')

  const evaluate = async () => {
    const granted = await isLocationGranted()
    if (granted) {
      setVisible(false)
      return
    }

    const currentState = await checkLocationPermission()
    setState(currentState)

    const shouldShow = await shouldShowLocationReminder()
    setVisible(shouldShow)
  }

  useEffect(() => {
    evaluate()
    const unbind = onAppResume(evaluate)
    return unbind
  }, [])

  if (!visible) return null

  const handleAction = async () => {
    if (state === 'denied') {
      openAppSettings()
    } else {
      const ok = await requestLocationPermission()
      if (ok) {
        setVisible(false)
      } else {
        recordLocationReminderDismissed()
        setVisible(false)
      }
    }
  }

  const handleDismiss = () => {
    recordLocationReminderDismissed()
    setVisible(false)
  }

  return (
    <aside
      role="region"
      aria-label="Location permission reminder"
      className="mx-auto my-3 max-w-6xl px-3.5 sm:px-8"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/10 text-lg text-teal">
            ⌖
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal">
              Location is currently disabled
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-fog">
              {state === 'denied'
                ? 'Agos cannot automatically find detours around flooded roads from your location. Enable location in Android Settings, or continue entering places manually.'
                : 'Turn on foreground location to automatically center the map and detect nearby flood hazards while riding.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-fog hover:text-paper"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleAction}
            className="rounded-lg bg-teal px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#005c66] active:scale-95 transition"
          >
            {state === 'denied' ? 'Open Settings' : 'Allow location'}
          </button>
        </div>
      </div>
    </aside>
  )
}

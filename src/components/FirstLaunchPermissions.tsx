import { useState } from 'react'
import {
  requestLocationPermission,
  isNativeAndroid,
} from '../data/device-location'
import {
  requestNotificationPermission,
  initNotificationChannels,
} from '../data/nearby-alerts'
import { requestPushPermission } from '../data/push-notifications'

type Props = {
  onComplete: () => void
}

export default function FirstLaunchPermissions({ onComplete }: Props) {
  const [requesting, setRequesting] = useState(false)
  const isAndroid = isNativeAndroid()

  const handleAllow = async () => {
    setRequesting(true)
    try {
      // 1. Request foreground location permission (never background)
      await requestLocationPermission()

      // 2. Request notification permission & set up channels / register with FCM on Android
      await initNotificationChannels()
      if (isAndroid) {
        await requestPushPermission()
      } else {
        await requestNotificationPermission()
      }
    } catch (err) {
      console.warn('Initial permission setup notice:', err)
    } finally {
      setRequesting(false)
      onComplete()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-title"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md rounded-3xl border border-line bg-panel p-6 shadow-2xl animate-fade-up">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal/15 text-teal">
          <span className="text-2xl font-bold">≋</span>
        </div>

        <h2 id="perm-title" className="mt-4 text-center text-xl font-extrabold text-paper sm:text-2xl">
          Set up permissions for Agos
        </h2>
        <p className="mt-2 text-center text-xs leading-relaxed text-fog sm:text-sm">
          Agos uses on-device permissions to assist your ride safely. Permissions are optional; manual place entry is always available.
        </p>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-page/60 p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/10 text-lg text-teal">
              ⌖
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-paper">Foreground location</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-fog">
                Calculates detours around flood hazards and locates evacuation centers while the app is open.
                Agos does not request background location.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-page/60 p-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal/10 text-lg text-teal">
              🔔
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-paper">Nearby flood alerts</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-fog">
                Sends local notifications when rider-reported flooded roads are within your detection radius while using Agos.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-line/60 bg-page/30 p-2.5 text-center text-[11px] leading-relaxed text-fog">
          {isAndroid
            ? 'Android system permission prompts will appear for foreground location and alerts.'
            : 'Browser permission prompts will request foreground location and notifications.'}
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleAllow}
            disabled={requesting}
            className="w-full rounded-xl bg-teal py-3.5 text-base font-bold text-white shadow-md transition hover:bg-[#005c66] active:scale-[0.98] disabled:opacity-50"
          >
            {requesting ? 'Setting up…' : 'Allow location & alerts'}
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={requesting}
            className="w-full rounded-xl border border-line py-3 text-sm font-semibold text-fog transition hover:text-paper"
          >
            Continue with manual entry
          </button>
        </div>
      </div>
    </div>
  )
}

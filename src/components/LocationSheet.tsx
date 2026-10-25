import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

export type Loc = 'idle' | 'asking' | 'denied' | 'off' | 'unsupported'

// Embedded previews (like the Figma Make panel) block geolocation without ever showing a prompt
const embedded = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
const isAndroid = /Android/.test(navigator.userAgent)
const nativeAndroid = Capacitor.getPlatform() === 'android'
// Android Chrome can deep-link to system screens; iOS Safari blocks settings links, so we guide instead
const ANDROID_LOCATION = 'intent://#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end'
const ANDROID_APP = `intent://#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:${nativeAndroid ? 'ph.agos.trial' : 'com.android.chrome'};end`

const STEPS: Record<'ios' | 'android' | 'desktop', Record<'denied' | 'off', string[]>> = {
  ios: {
    off: ['Open Settings → Privacy & Security', 'Turn on Location Services', 'Come back here and tap Try again'],
    denied: ['Tap ᴀA in the Safari address bar → Website Settings', 'Set Location to Allow', 'Then Settings → Privacy → Location Services → Safari Websites → While Using, Precise ON'],
  },
  android: {
    off: ['Tap Open location settings below', 'Turn on Use location', 'Come back here and tap Try again'],
    denied: nativeAndroid
      ? ['Open Android Settings → Apps → Agos Trial', 'Permissions → Location → Allow while using the app', 'Return to Agos and try again, or enter a place manually']
      : ['Tap the ⓘ / lock icon in the address bar', 'Permissions → Location → Allow', 'Make sure Use precise location is ON'],
  },
  desktop: {
    off: ['Windows: Settings → Privacy & security → Location', 'Turn on Location services and Let apps access your location', 'Come back here and click Try again'],
    denied: ['Click the site-settings icon left of the address bar', 'Set Location to Allow', 'Reload the page, then click Try again'],
  },
}

export const locationAllowed = () =>
  navigator.permissions?.query({ name: 'geolocation' }).then((p) => p.state === 'granted').catch(() => false) ?? Promise.resolve(false)

// Pre-permission sheet: explains why, then triggers the browser prompt; guides recovery when blocked
export default function LocationSheet({ onGranted, onClose, onDemo }: { onGranted: () => void; onClose: () => void; onDemo?: () => void }) {
  const [loc, setLoc] = useState<Loc>('idle')

  const allow = () => {
    if (!('geolocation' in navigator)) return setLoc('unsupported')
    if (embedded) return setLoc('denied')
    setLoc('asking')
    navigator.geolocation.getCurrentPosition(
      () => onGranted(),
      (e) => setLoc(e.code === e.PERMISSION_DENIED ? 'denied' : 'off'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  // Returning from the settings app: check again automatically
  useEffect(() => {
    if (loc !== 'denied' && loc !== 'off') return
    const on = () => document.visibilityState === 'visible' && allow()
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [loc])

  const blocked = loc === 'denied' || loc === 'off' || loc === 'unsupported'
  return (
        <div onClick={(e) => e.target === e.currentTarget && onClose()} className="animate-fade-in fixed inset-0 z-[2000] flex items-end bg-navy/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="loc-title">
          <div className="animate-fade-up w-full rounded-t-3xl bg-panel px-6 pb-[max(1.5rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-3 shadow-2xl">
            <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" />
            <span className="mx-auto mt-5 grid h-14 w-14 place-items-center rounded-full bg-teal/10 text-2xl text-teal">◉</span>
            <h2 id="loc-title" className="mt-4 text-center text-2xl font-extrabold">
              {loc === 'off' ? 'Turn on location' : loc === 'denied' ? 'Location is blocked' : loc === 'unsupported' ? 'Location not available' : 'Use your location to navigate'}
            </h2>
            <p className="mt-2 text-center text-sm leading-relaxed text-fog">
              {loc === 'unsupported' ? 'Location is unavailable. You can still enter a start and destination manually.' : blocked ? 'You can continue without location by choosing places manually.' : 'Location is optional for guidance and nearby search. Coordinates are sent to mapping and routing providers when those features are used.'}
            </p>
            {embedded && loc === 'denied' ? (
              <p className="mt-5 rounded-xl bg-page p-4 text-sm leading-relaxed">
                You're viewing Agos inside an embedded preview, which can't ask for location. Open it in its own tab and the permission prompt will appear.
              </p>
            ) : blocked && loc !== 'unsupported' && (
              <ol className="mt-5 grid gap-3">
                {STEPS[isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'][loc as 'denied' | 'off'].map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-cyan">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-6 grid gap-2.5">
              {embedded && blocked && (
                <a href={location.href} target="_blank" rel="noopener" className="rounded-xl bg-navy py-4 text-center text-lg font-bold text-white active:scale-[0.98]">
                  Open in new tab ↗
                </a>
              )}
              {!embedded && isAndroid && loc !== 'unsupported' && (
                <a href={loc === 'off' ? ANDROID_LOCATION : ANDROID_APP} className="rounded-xl bg-navy py-4 text-center text-lg font-bold text-white active:scale-[0.98]">
                  {loc === 'off' ? 'Open location settings' : 'Open app settings'}
                </a>
              )}
              <button onClick={allow} disabled={loc === 'asking'} className="rounded-xl bg-teal py-4 text-lg font-bold text-white active:scale-[0.98] disabled:opacity-50">
                {loc === 'asking' ? 'Waiting for permission…' : blocked ? 'Try again' : 'Allow precise location'}
              </button>
              {onDemo && (
                <button onClick={onDemo} className="rounded-xl border border-line py-3.5 font-semibold">
                  Try a demo ride instead
                </button>
              )}
              <button onClick={onClose} className="py-2 text-sm font-semibold text-fog">
                Not now
              </button>
            </div>
          </div>
        </div>
  )
}

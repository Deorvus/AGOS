import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { App } from '@capacitor/app'

export const isNativeAndroid = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

export const locationError = (code: number) =>
  code === 1
    ? 'Location access is blocked. Check app or browser permission and device location settings, or enter a starting point manually.'
    : code === 3
      ? 'Getting your location took too long. Try again, or enter a starting point manually.'
      : 'Your device could not determine its location. Check that location services are on, or enter a starting point manually.'

export type LocationPermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'unavailable'

export const ANDROID_APP_SETTINGS_URL =
  'intent://#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:ph.agos.trial;end'

export const ANDROID_LOCATION_SETTINGS_URL =
  'intent://#Intent;action=android.settings.LOCATION_SOURCE_SETTINGS;end'

export function openAppSettings(): void {
  if (typeof window === 'undefined') return
  try {
    if (isNativeAndroid()) {
      window.location.href = ANDROID_APP_SETTINGS_URL
    } else {
      window.location.href = ANDROID_LOCATION_SETTINGS_URL
    }
  } catch {
    // Graceful fallback
  }
}

/**
 * Check the actual current Android/Browser permission state.
 * Never relies on a stored stale "granted" flag.
 */
export async function checkLocationPermission(): Promise<LocationPermissionState> {
  if (isNativeAndroid()) {
    try {
      const res = await Geolocation.checkPermissions()
      const loc = res.location || res.coarseLocation
      if (loc === 'granted') return 'granted'
      if (loc === 'denied') return 'denied'
      if (loc === 'prompt-with-rationale') return 'prompt-with-rationale'
      return 'prompt'
    } catch {
      return 'unavailable'
    }
  }

  // Web / PWA path
  if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
    try {
      const p = await navigator.permissions.query({ name: 'geolocation' })
      return p.state as LocationPermissionState
    } catch {
      return 'prompt'
    }
  }

  return typeof navigator !== 'undefined' && 'geolocation' in navigator ? 'prompt' : 'unavailable'
}

/**
 * Fast check: is location permission already granted in the OS?
 */
export async function isLocationGranted(): Promise<boolean> {
  const state = await checkLocationPermission()
  return state === 'granted'
}

/**
 * Centralized request for foreground location permission.
 * Before requesting, checks the actual OS state.
 * If already granted, returns true immediately without re-prompting.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const current = await checkLocationPermission()
  if (current === 'granted') return true

  if (isNativeAndroid()) {
    try {
      const res = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] })
      const loc = res.location || res.coarseLocation
      return loc === 'granted'
    } catch {
      return false
    }
  }

  // Browser path: trigger a quick check to prompt the user
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      )
    })
  }

  return false
}

// 7-day polite reminder for denied permissions
const LOC_REMINDER_KEY = 'agos.loc_reminder_timestamp'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function shouldShowLocationReminder(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const state = await checkLocationPermission()
  // Never show reminder if location is already granted or unavailable
  if (state === 'granted' || state === 'unavailable') {
    return false
  }

  // Only show for denied / prompt-with-rationale states
  if (state !== 'denied' && state !== 'prompt-with-rationale') {
    return false
  }

  const raw = localStorage.getItem(LOC_REMINDER_KEY)
  if (!raw) return true

  const lastShown = Number(raw)
  if (!Number.isFinite(lastShown)) return true

  return Date.now() - lastShown >= SEVEN_DAYS_MS
}

export function recordLocationReminderDismissed(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOC_REMINDER_KEY, Date.now().toString())
}

/**
 * Single-shot location fix.
 * Preserves the (signal, geo, deadline) signature for unit tests and web fallback.
 */
export async function getDeviceLocation(
  signal: AbortSignal,
  geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
  deadline = 20000,
): Promise<[number, number]> {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')

  // If a mock or custom provider is supplied (e.g. In unit tests), use it directly
  if (geo && geo !== (typeof navigator !== 'undefined' ? navigator.geolocation : undefined)) {
    return new Promise((resolve, reject) => {
      let done = false,
        watch: number | undefined
      const cleanup = () => {
        clearTimeout(timer)
        signal.removeEventListener('abort', cancel)
        if (watch !== undefined) geo.clearWatch(watch)
      }
      const finish = (error?: Error, at?: [number, number]) => {
        if (done) return
        done = true
        cleanup()
        error ? reject(error) : resolve(at!)
      }
      const cancel = () => finish(new DOMException('Cancelled', 'AbortError'))
      const timer = setTimeout(() => finish(new Error(locationError(3))), deadline)
      signal.addEventListener('abort', cancel, { once: true })
      try {
        watch = geo.watchPosition(
          (p: any) => {
            const at: [number, number] = [p.coords.latitude, p.coords.longitude]
            if (!at.every(Number.isFinite) || Math.abs(at[0]) > 90 || Math.abs(at[1]) > 180) {
              return finish(new Error(locationError(2)))
            }
            finish(undefined, at)
          },
          (e: any) => finish(new Error(locationError(e.code))),
          { enableHighAccuracy: false, timeout: deadline, maximumAge: 30000 },
        )
        if (done) geo.clearWatch(watch)
      } catch {
        finish(new Error(locationError(2)))
      }
    })
  }

  // Native Android path using Capacitor Geolocation
  if (isNativeAndroid()) {
    // Check permission first; don't trigger requestPermissions on simple lookup
    const state = await checkLocationPermission()
    if (state !== 'granted') {
      throw new Error(locationError(1))
    }

    return new Promise((resolve, reject) => {
      let done = false
      const timer = setTimeout(() => {
        if (done) return
        done = true
        reject(new Error(locationError(3)))
      }, deadline)

      const onAbort = () => {
        if (done) return
        done = true
        clearTimeout(timer)
        reject(new DOMException('Cancelled', 'AbortError'))
      }
      signal.addEventListener('abort', onAbort, { once: true })

      Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: deadline,
        maximumAge: 10000,
      })
        .then((pos) => {
          if (done) return
          done = true
          clearTimeout(timer)
          signal.removeEventListener('abort', onAbort)
          const at: [number, number] = [pos.coords.latitude, pos.coords.longitude]
          if (!at.every(Number.isFinite) || Math.abs(at[0]) > 90 || Math.abs(at[1]) > 180) {
            return reject(new Error(locationError(2)))
          }
          resolve(at)
        })
        .catch((err) => {
          if (done) return
          done = true
          clearTimeout(timer)
          signal.removeEventListener('abort', onAbort)
          const code = err?.code === 1 ? 1 : err?.code === 3 ? 3 : 2
          reject(new Error(locationError(code)))
        })
    })
  }

  // Web Browser fallback
  if (!geo) throw new Error('Location is unavailable in this browser. Enter a starting point manually.')

  return new Promise((resolve, reject) => {
    let done = false,
      watch: number | undefined
    const cleanup = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', cancel)
      if (watch !== undefined) geo.clearWatch(watch)
    }
    const finish = (error?: Error, at?: [number, number]) => {
      if (done) return
      done = true
      cleanup()
      error ? reject(error) : resolve(at!)
    }
    const cancel = () => finish(new DOMException('Cancelled', 'AbortError'))
    const timer = setTimeout(() => finish(new Error(locationError(3))), deadline)
    signal.addEventListener('abort', cancel, { once: true })
    try {
      watch = geo.watchPosition(
        (p) => {
          const at: [number, number] = [p.coords.latitude, p.coords.longitude]
          if (!at.every(Number.isFinite) || Math.abs(at[0]) > 90 || Math.abs(at[1]) > 180) {
            return finish(new Error(locationError(2)))
          }
          finish(undefined, at)
        },
        (e) => finish(new Error(locationError(e.code))),
        { enableHighAccuracy: false, timeout: deadline, maximumAge: 30000 },
      )
      if (done) geo.clearWatch(watch)
    } catch {
      finish(new Error(locationError(2)))
    }
  })
}

export type PositionUpdate = {
  latitude: number
  longitude: number
  heading?: number | null
  speed?: number | null
}

export type ClearWatchFn = () => void

/**
 * Centralized GPS watch. Only starts when the feature is actively in use.
 * Stops cleanly when cleared. Reuses shared permission checks.
 */
export function startDeviceLocationWatch(
  onUpdate: (pos: PositionUpdate) => void,
  onError?: (err: Error) => void,
  options: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number } = {},
): ClearWatchFn {
  let active = true

  if (isNativeAndroid()) {
    let watchIdPromise: Promise<string> | null = null

    // Ensure permission is granted before starting watch
    isLocationGranted().then((granted) => {
      if (!active) return
      if (!granted) {
        onError?.(new Error(locationError(1)))
        return
      }

      watchIdPromise = Geolocation.watchPosition(
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 20000,
          maximumAge: options.maximumAge ?? 5000,
        },
        (position, err) => {
          if (!active) return
          if (err) {
            onError?.(new Error(locationError(err.code === 1 ? 1 : 2)))
            return
          }
          if (position?.coords) {
            onUpdate({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              heading: position.coords.heading,
              speed: position.coords.speed,
            })
          }
        },
      )
    })

    return () => {
      active = false
      if (watchIdPromise) {
        watchIdPromise.then((id) => {
          Geolocation.clearWatch({ id }).catch(() => {})
        })
      }
    }
  }

  // Web fallback
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.(new Error('Location is unavailable in this browser.'))
    return () => {}
  }

  let nativeWatchId: number | undefined
  try {
    nativeWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!active) return
        onUpdate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        })
      },
      (err) => {
        if (!active) return
        onError?.(new Error(locationError(err.code)))
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 20000,
        maximumAge: options.maximumAge ?? 5000,
      },
    )
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(locationError(2)))
  }

  return () => {
    active = false
    if (nativeWatchId !== undefined && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(nativeWatchId)
    }
  }
}

/**
 * App Resume Listener: fires when the app returns from background or Android settings
 * so components can refresh OS permission states without relying on cached flags.
 */
export function onAppResume(callback: () => void): () => void {
  const cleanups: (() => void)[] = []

  // Capacitor native app state change
  if (isNativeAndroid()) {
    const handlePromise = App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        callback()
      }
    })
    cleanups.push(() => {
      handlePromise.then((h) => h.remove()).catch(() => {})
    })
  }

  // Web document visibility change
  if (typeof document !== 'undefined') {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        callback()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    cleanups.push(() => document.removeEventListener('visibilitychange', onVis))
  }

  return () => {
    for (const c of cleanups) c()
  }
}

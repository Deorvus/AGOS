export const locationError = (code: number) => code === 1
  ? 'Location access is blocked. Check app or browser permission and device location settings, or enter a starting point manually.'
  : code === 3
    ? 'Getting your location took too long. Try again, or enter a starting point manually.'
    : 'Your device could not determine its location. Check that location services are on, or enter a starting point manually.'

// One usable fix, then stop watching. Cancellation also ignores any late callbacks.
export function getDeviceLocation(signal: AbortSignal, geo = navigator.geolocation, deadline = 20000): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Cancelled', 'AbortError'))
    if (!geo) return reject(new Error('Location is unavailable in this browser. Enter a starting point manually.'))
    let done = false, watch: number | undefined
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); if (watch !== undefined) geo.clearWatch(watch) }
    const finish = (error?: Error, at?: [number, number]) => { if (done) return; done = true; cleanup(); error ? reject(error) : resolve(at!) }
    const cancel = () => finish(new DOMException('Cancelled', 'AbortError'))
    const timer = setTimeout(() => finish(new Error(locationError(3))), deadline)
    signal.addEventListener('abort', cancel, { once: true })
    try {
      watch = geo.watchPosition(p => {
        const at: [number, number] = [p.coords.latitude, p.coords.longitude]
        if (!at.every(Number.isFinite) || Math.abs(at[0]) > 90 || Math.abs(at[1]) > 180) return finish(new Error(locationError(2)))
        finish(undefined, at)
      }, e => finish(new Error(locationError(e.code))), { enableHighAccuracy: false, timeout: deadline, maximumAge: 30000 })
      if (done) geo.clearWatch(watch)
    } catch { finish(new Error(locationError(2))) }
  })
}

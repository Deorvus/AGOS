import { useState } from 'react'
import { LEVELS } from '../data/sensors'
import { geocode, type Suggestion } from '../data/routing'
import { compressImage, placeName, stamp, type FloodReport } from '../data/reports'
import { getDeviceLocation, isLocationGranted, requestLocationPermission } from '../data/device-location'

const MAX_PHOTOS = 3

type Spot = { lat: number; lng: number; place: string }

export default function ReportFlood({ by, onSubmit, onClose }: { by: string; onSubmit: (r: FloodReport) => void; onClose: () => void }) {
  const [spot, setSpot] = useState<Spot | null>(null)
  const [locState, setLocState] = useState<'idle' | 'finding' | 'error'>('idle')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Suggestion[]>([])
  const [level, setLevel] = useState<1 | 2 | 3 | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [takenAt, setTakenAt] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  const useGps = async () => {
    setLocState('finding')
    try {
      const granted = await isLocationGranted()
      if (!granted) {
        const ok = await requestLocationPermission()
        if (!ok) {
          setLocState('error')
          return
        }
      }
      const c = new AbortController()
      const [lat, lng] = await getDeviceLocation(c.signal)
      setSpot({ lat, lng, place: await placeName(lat, lng) })
      setLocState('idle')
    } catch {
      setLocState('error')
    }
  }

  const search = async (v: string) => {
    setQ(v)
    setHits(v.trim().length >= 3 ? await geocode(v.trim()).catch(() => []) : [])
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files) return
    setErr('')
    try {
      const list = [...files].slice(0, MAX_PHOTOS - photos.length)
      const urls = await Promise.all(list.map((f) => compressImage(f)))
      // File timestamp ≈ when the photo was taken (camera captures are "now")
      setTakenAt((t) => t ?? Math.min(...list.map((f) => f.lastModified || Date.now())))
      setPhotos((p) => [...p, ...urls])
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const stale = takenAt !== null && Date.now() - takenAt > 3 * 60 * 60 * 1000
  const ready = spot && level && photos.length > 0 && !stale

  const submit = () => {
    if (!ready) return
    const now = Date.now()
    onSubmit({ id: now.toString(36), ...spot, level, note: note.trim(), photos, takenAt: takenAt ?? now, createdAt: now, by, stillFlooded: 1, cleared: 0 })
  }

  const step = 'mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-fog'
  const num = (n: number, done: boolean) => (
    <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${done ? 'bg-teal text-white' : 'bg-line text-fog'}`}>{done ? '✓' : n}</span>
  )

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} className="animate-fade-in fixed inset-0 z-[2000] flex items-end bg-navy/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="rf-title">
      <div className="animate-fade-up mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-panel px-5 pb-[max(1.5rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-3 shadow-2xl">
        <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" />
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="rf-title" className="text-2xl font-extrabold">Report flooding</h2>
            <p className="mt-1 text-sm text-fog">Help riders avoid roads with no live reading.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-page text-fog">✕</button>
        </div>

        {/* 1 · Where */}
        <section className="mt-6">
          <h3 className={step}>{num(1, !!spot)} Where is it flooded?</h3>
          {spot ? (
            <div className="flex items-center gap-3 rounded-xl bg-teal/5 p-4 ring-1 ring-teal/30">
              <span className="text-teal">⌖</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{spot.place}</span>
                <span className="block font-mono text-xs text-fog">{spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}</span>
              </span>
              <button onClick={() => setSpot(null)} className="text-sm font-semibold text-teal">Change</button>
            </div>
          ) : (
            <div className="grid gap-2">
              <button onClick={useGps} disabled={locState === 'finding'} className="flex items-center gap-3 rounded-xl bg-page px-4 py-3.5 text-left font-semibold">
                <span className="text-teal">◉</span>
                {locState === 'finding' ? 'Finding your location…' : 'Use my current location'}
              </button>
              {locState === 'error' && <p className="px-1 text-sm text-l3">Location unavailable. Search for the road instead.</p>}
              <input value={q} onChange={(e) => search(e.target.value)} placeholder="Or search a road, e.g. Litex Road" className="rounded-xl border border-line bg-ink px-4 py-3.5 outline-none focus:border-teal" />
              {hits.length > 0 && (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {hits.map((h) => (
                    <li key={h.name + h.lat}>
                      <button onClick={() => (setSpot({ lat: h.lat, lng: h.lng, place: [h.name, h.detail?.split(',')[0]].filter(Boolean).join(', ') }), setHits([]), setQ(''))} className="w-full px-4 py-3 text-left hover:bg-page">
                        <span className="block truncate font-semibold">{h.name}</span>
                        {h.detail && <span className="block truncate text-xs text-fog">{h.detail}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* 2 · How deep */}
        <section className="mt-6">
          <h3 className={step}>{num(2, !!level)} How deep is the water?</h3>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                aria-pressed={level === l}
                className={`rounded-xl border-2 px-2 py-3 text-center transition ${level === l ? `${LEVELS[l].color} border-transparent text-white` : 'border-line bg-panel'}`}
              >
                <span className="block font-bold">{LEVELS[l].short}</span>
                <span className={`mt-0.5 block text-[11px] ${level === l ? 'text-white/85' : 'text-fog'}`}>{LEVELS[l].depth.split('·')[0]}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3 · Proof */}
        <section className="mt-6">
          <h3 className={step}>{num(3, photos.length > 0 && !stale)} Photo proof <span className="normal-case tracking-normal text-l3">required</span></h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                <img src={p} alt={`Flood photo ${i + 1}`} className="h-full w-full object-cover" />
                <button onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} aria-label="Remove photo" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-navy/80 text-xs text-white">✕</button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <>
                <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-teal/50 bg-teal/5 text-center text-teal">
                  <span>
                    <span className="block text-2xl">◎</span>
                    <span className="mt-1 block text-xs font-bold">Take photo</span>
                  </span>
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => (addPhotos(e.target.files), (e.target.value = ''))} />
                </label>
                {photos.length === 0 && (
                  <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-fog">
                    <span>
                      <span className="block text-2xl">▦</span>
                      <span className="mt-1 block text-xs font-bold">From gallery</span>
                    </span>
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => (addPhotos(e.target.files), (e.target.value = ''))} />
                  </label>
                )}
              </>
            )}
          </div>
          {takenAt && (
            <p className={`mt-2 px-1 text-xs ${stale ? 'font-semibold text-l3' : 'text-fog'}`}>
              {stale ? `Photo is from ${stamp(takenAt)}. Please take a new photo (within the last 3 hours).` : `Photo taken ${stamp(takenAt)}`}
            </p>
          )}
          {err && <p className="mt-2 px-1 text-sm text-l3">{err}</p>}
        </section>

        {/* 4 · Note */}
        <section className="mt-6">
          <h3 className={step}>{num(4, !!note.trim())} Details <span className="normal-case tracking-normal">(optional)</span></h3>
          <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={2} placeholder="e.g. Both lanes flooded near the toll plaza, cars turning back" className="w-full resize-none rounded-xl border border-line bg-ink px-4 py-3 outline-none focus:border-teal" />
        </section>

        <div className="mt-6 rounded-xl bg-page px-4 py-3 text-xs leading-relaxed text-fog">
          Posted as <b className="text-paper">{by}</b> · time stamped <b className="text-paper">{stamp(Date.now())}</b>. Reports show for 6 hours and can be marked cleared by other riders.
        </div>
        <button onClick={submit} disabled={!ready} className="mt-4 w-full rounded-xl bg-teal py-4 text-lg font-bold text-white transition hover:bg-[#005c66] active:scale-[0.98] disabled:opacity-40">
          Post report
        </button>
      </div>
    </div>
  )
}

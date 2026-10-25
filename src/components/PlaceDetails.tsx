import { useEffect, useState } from 'react'
import { CATEGORIES, poiFacts, poiPhotos, type Poi } from '../data/nearby'
import { LEVELS, type Level } from '../data/sensors'

const km = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`)

export default function PlaceDetails({ poi, flood, onGo, onClose }: { poi: Poi; flood: Level; onGo: () => void; onClose: () => void }) {
  const [photos, setPhotos] = useState<{ src: string; label: string }[] | null>(null)
  const [i, setI] = useState(0)
  const f = poiFacts(poi)

  useEffect(() => {
    let live = true
    setPhotos(null)
    setI(0)
    poiPhotos(poi).then((p) => live && setPhotos(p))
    return () => void (live = false)
  }, [poi.id])

  const gmaps = `https://www.google.com/maps/search/?api=1&query=${poi.lat},${poi.lng}`
  const street = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${poi.lat},${poi.lng}`
  const action = 'flex flex-col items-center gap-1.5 text-xs font-semibold text-teal'
  const ring = 'grid h-11 w-11 place-items-center rounded-full border border-line text-lg'

  return (
    <section className="animate-fade-up pointer-events-auto max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-2xl bg-panel shadow-[0_16px_40px_-16px_rgba(16,43,59,0.45)] ring-1 ring-line/70">
      {/* Photo strip */}
      <div className="relative aspect-[2/1] bg-page">
        {!photos && <div className="absolute inset-0 animate-pulse bg-line/60" />}
        {photos && (
          <div onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))} className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
            {photos.map((p) => (
              <img key={p.src} src={p.src} alt={`${poi.name} — ${p.label}`} loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} className="h-full w-full shrink-0 snap-center object-cover" />
            ))}
          </div>
        )}
        {photos && <span className="absolute bottom-2.5 left-3 rounded-full bg-navy/75 px-2.5 py-1 text-[11px] font-semibold text-white">{photos[i]?.label}{photos.length > 1 ? ` · ${i + 1}/${photos.length}` : ''}</span>}
        <button onClick={onClose} aria-label="Close details" className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-panel/95 text-fog shadow">✕</button>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-extrabold leading-tight">{poi.name}</h3>
        <p className="mt-1 text-sm text-fog">
          {CATEGORIES[poi.cat].icon} {f.kind} · {km(poi.dist)} away
        </p>
        {flood > 0 && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-white ${LEVELS[flood].color}`}>
            {LEVELS[flood].label} flooding reported nearby · {LEVELS[flood].rider}
          </p>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2 border-y border-line py-4">
          <button onClick={onGo} className={action}>
            <span className={`${ring} border-teal bg-teal text-white`}>➤</span>Directions
          </button>
          {f.phone ? (
            <a href={`tel:${f.phone.split(/[;,]/)[0].replace(/\s/g, '')}`} className={action}>
              <span className={ring}>✆</span>Call
            </a>
          ) : (
            <span className={`${action} opacity-35`}>
              <span className={ring}>✆</span>Call
            </span>
          )}
          <a href={street} target="_blank" rel="noreferrer" className={action}>
            <span className={ring}>◐</span>Street View
          </a>
          <a href={gmaps} target="_blank" rel="noreferrer" className={action}>
            <span className={ring}>↗</span>Open map
          </a>
        </div>

        {f.description && <p className="mt-4 leading-relaxed">{f.description}</p>}
        <dl className="mt-4 grid gap-3 text-sm">
          {f.address && <Row icon="⌖" label="Address">{f.address}</Row>}
          {f.hours && <Row icon="◷" label="Hours">{f.hours === '24/7' ? 'Open 24 hours' : f.hours}</Row>}
          {f.phone && <Row icon="✆" label="Phone">{f.phone}</Row>}
          {f.operator && <Row icon="▣" label="Operated by">{f.operator}</Row>}
          {f.website && (
            <Row icon="⌘" label="Website">
              <a href={f.website} target="_blank" rel="noreferrer" className="break-all text-teal underline">{f.website.replace(/^https?:\/\//, '')}</a>
            </Row>
          )}
        </dl>
        {f.features.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {f.features.map((x) => (
              <li key={x} className="rounded-full bg-page px-3 py-1 text-xs font-semibold">{x}</li>
            ))}
          </ul>
        )}
        {!f.address && !f.hours && !f.phone && !f.description && <p className="mt-4 text-sm text-fog">No extra details listed for this place yet.</p>}
      </div>
    </section>
  )
}

function Row({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-5 shrink-0 text-center text-fog">{icon}</span>
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  )
}

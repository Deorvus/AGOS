import { useState } from 'react'
import { LEVELS } from '../data/sensors'
import { ago, isActive, stamp, type FloodReport } from '../data/reports'
import ReportFlood from './ReportFlood'

export default function CommunityReports({ reports, setReports, by }: { reports: FloodReport[]; setReports: (r: FloodReport[]) => void; by: string }) {
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const [voted, setVoted] = useState<Record<string, true>>({})

  const vote = (id: string, k: 'stillFlooded' | 'cleared') => {
    if (voted[id]) return
    setVoted({ ...voted, [id]: true })
    setReports(reports.map((r) => (r.id === id ? { ...r, [k]: r[k] + 1 } : r)))
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Rider reports</h2>
          <p className="mt-1 text-sm text-fog">User-submitted observations on this device · not sensor data</p>
        </div>
      </div>
      <button onClick={() => setOpen(true)} className="flex items-center gap-4 rounded-xl bg-navy p-5 text-left text-white transition active:scale-[0.99]">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cyan/15 text-xl text-cyan">◎</span>
        <span className="flex-1">
          <span className="block text-lg font-bold">Report flooding</span>
          <span className="block text-sm text-white/70">Add a photo and location to your local notebook</span>
        </span>
        <span className="text-2xl text-cyan">+</span>
      </button>

      {reports.length === 0 && <p className="py-6 text-center text-sm text-fog">No rider reports in the last 6 hours.</p>}
      <ul className="grid gap-3">
        {reports.map((r) => {
          const L = LEVELS[r.level]
          const active = isActive(r)
          return (
            <li key={r.id} className={`animate-fade-up overflow-hidden rounded-xl border border-line bg-panel ${active ? '' : 'opacity-60'}`}>
              <button onClick={() => setViewing(r.photos[0])} className="relative block aspect-[16/9] w-full bg-page">
                <img src={r.photos[0]} alt={`Flooding at ${r.place}`} className="h-full w-full object-cover" />
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white ${active ? L.color : 'bg-ok'}`}>{active ? L.short : 'CLEARED'}</span>
                {r.photos.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-navy/80 px-2.5 py-1 text-xs font-semibold text-white">+{r.photos.length - 1} photos</span>}
              </button>
              {r.photos.length > 1 && (
                <div className="flex gap-2 px-4 pt-3">
                  {r.photos.slice(1).map((p, i) => (
                    <button key={i} onClick={() => setViewing(p)} className="h-14 w-14 overflow-hidden rounded-lg">
                      <img src={p} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="p-4">
                <p className="font-display text-xl font-semibold">{r.place}</p>
                <p className="mt-1 text-sm text-fog">{L.short} · Unverified user-selected category; not a measured depth.</p>
                {r.note && <p className="mt-2 leading-relaxed">“{r.note}”</p>}
                <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-page p-3 text-xs">
                  <div><dt className="text-fog">Uploaded</dt><dd className="font-semibold">{stamp(r.createdAt)} <span className="font-normal text-fog">· {ago(r.createdAt)}</span></dd></div>
                  <div><dt className="text-fog">Photo taken</dt><dd className="font-semibold">{stamp(r.takenAt)}</dd></div>
                  <div className="col-span-2"><dt className="sr-only">Reporter</dt><dd className="text-fog">Reported by <b className="text-paper">{r.by}</b></dd></div>
                </dl>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button onClick={() => vote(r.id, 'stillFlooded')} disabled={!!voted[r.id]} className="rounded-lg border border-line py-2.5 text-sm font-semibold disabled:opacity-50">
                    Still flooded · {r.stillFlooded}
                  </button>
                  <button onClick={() => vote(r.id, 'cleared')} disabled={!!voted[r.id]} className="rounded-lg border border-line py-2.5 text-sm font-semibold disabled:opacity-50">
                    Cleared · {r.cleared}
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {open && <ReportFlood by={by} onClose={() => setOpen(false)} onSubmit={(r) => (setReports([r, ...reports]), setOpen(false))} />}
      {viewing && (
        <button onClick={() => setViewing(null)} aria-label="Close photo" className="animate-fade-in fixed inset-0 z-[2000] grid place-items-center bg-black/90 p-4">
          <img src={viewing} alt="Flood evidence" className="max-h-full max-w-full rounded-lg" />
        </button>
      )}
    </section>
  )
}

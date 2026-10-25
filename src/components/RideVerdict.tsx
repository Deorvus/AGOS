import { LEVELS, ROUTES, type Node, type Level } from '../data/sensors'

export default function RideVerdict({ nodes, routeId, setRouteId, avoid, onNavigate }: { nodes: Node[]; routeId: string; setRouteId: (id: string) => void; avoid: Level; onNavigate: (r: (typeof ROUTES)[number]) => void }) {
  const route = ROUTES.find(r => r.id === routeId) ?? ROUTES[0]
  const onRoute = route.via.flatMap(id => nodes.filter(n => n.id === id))
  const worst = Math.max(0, ...onRoute.map(n => n.level)) as Level
  return <div className="grid gap-5">
    <div className="flex gap-2 overflow-x-auto pb-1">{ROUTES.map(r => <button key={r.id} onClick={() => setRouteId(r.id)} aria-pressed={r.id === routeId} className={`shrink-0 rounded-full border px-4 py-3 font-semibold ${r.id === routeId ? 'border-teal bg-teal text-white' : 'border-line bg-panel'}`}>{r.name}</button>)}</div>
    <section className="rounded-2xl bg-navy p-6 text-white" aria-live="polite">
      <p className="text-xs font-bold uppercase tracking-wider">Route coverage · {route.name}</p>
      <h2 className="mt-3 text-3xl font-extrabold">{onRoute.length ? 'Map demonstration' : 'Road conditions unknown'}</h2>
      <p className="mt-4 leading-relaxed">{onRoute.length ? `Sample category: ${LEVELS[worst].label}. ${worst >= avoid ? 'Meets your selected avoidance preference.' : 'Below your selected avoidance preference.'} These are illustrative data, not current road readings.` : 'No deployed sensor coverage is verified for this route. The bench prototype cannot establish road conditions.'}</p>
      <button onClick={() => onNavigate(route)} className="mt-5 w-full rounded-xl bg-teal px-5 py-4 font-bold">Explore route options</button>
      <p className="mt-3 text-xs text-[#b9ccd6]">Routing remains available. No route is guaranteed safe or flood-free.</p>
    </section>
    {onRoute.length > 0 && <ol className="grid gap-3">{onRoute.map(n => <li key={n.id} className="flex flex-wrap justify-between gap-3 rounded-xl border border-line bg-panel p-4"><div><p className="font-bold">{n.name}</p><p className="text-sm text-fog">{n.area} · fixed demonstration value</p></div><span className={`font-bold ${LEVELS[n.level].text}`}>{LEVELS[n.level].short}</span></li>)}</ol>}
  </div>
}
export function Gauge({ level }: { level: Level }) {
  return <div className="flex h-10 flex-col-reverse gap-0.5" aria-label={`Water ${LEVELS[level].label}`}>{[1,2,3].map(l => <span key={l} className={`h-3 w-2.5 rounded-sm ${level >= l ? LEVELS[l as Level].color : 'bg-line'}`} />)}</div>
}

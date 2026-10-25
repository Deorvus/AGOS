import type { FloodReport } from '../data/reports'
import { eventText, type MonitorEvent } from '../data/events'
import { formatTime } from '../data/monitoring'
import CommunityReports from './CommunityReports'
export default function AlertFeed({ alerts, reports, setReports, by }: { alerts: MonitorEvent[]; notify: boolean; setNotify: (v: boolean) => void; reports: FloodReport[]; setReports: (r: FloodReport[]) => void; by: string }) {
  return <div className="mx-auto grid max-w-3xl gap-6">
    <section className="rounded-xl border border-line bg-panel p-5"><h1 className="text-2xl font-bold">Monitoring events</h1><p className="mt-2 text-sm text-fog">QC-001 is a bench prototype. These are test events while Agos is open, not public warnings. Background push, SMS and email are not connected.</p></section>
    {!alerts.length && <p role="status" className="rounded-xl bg-panel p-5 text-fog">No new events in this session. Historical readings do not generate alerts.</p>}
    <ul className="grid gap-3">{alerts.map(a => <li key={a.id} className="rounded-xl border border-line bg-panel p-5"><p className="text-xs font-bold uppercase text-teal">Bench test · {a.node}</p><h2 className="mt-1 text-xl font-bold">{a.name}: {eventText(a)}</h2><p className="mt-2 text-sm text-fog">Measured: {formatTime(a.at)}<br/>Received by backend: {formatTime(a.receivedAt)}<br/>Delivery: {a.delivery} · device receipt not confirmed</p></li>)}</ul>
    <p className="text-sm text-fog">Community reports below are user-submitted, stored only on this device, and expire after six hours. They are not sensor readings.</p>
    <CommunityReports reports={reports} setReports={setReports} by={by} />
  </div>
}

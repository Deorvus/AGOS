import type { ReactNode } from 'react'
import EvacuationSearch from './EvacuationSearch'
import type { EvacuationSite } from '../data/evacuation'
import { HOTLINES } from '../data/sensors'

const PAGASA = 'https://www.pagasa.dost.gov.ph/learning-tools/floods'
const NWS = 'https://www.weather.gov/safety/flood-turn-around-dont-drown'
const link = 'inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal underline underline-offset-4'

function Answer({ question, children }: { question: string; children: ReactNode }) {
  return <details className="group border-b border-line last:border-0">
    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-5 font-semibold focus-visible:outline-2 focus-visible:outline-teal sm:px-5">
      {question}<span aria-hidden="true" className="shrink-0 text-xl text-teal group-open:rotate-45">+</span>
    </summary>
    <div className="px-4 pb-5 text-sm leading-relaxed text-fog sm:px-5">{children}</div>
  </details>
}

export default function HelpView({ onNavigate, active = true }: { active?: boolean; onNavigate: (site: EvacuationSite) => void }) {
  const jump = (id: string) => { const section = document.getElementById(id); section?.scrollIntoView({ block: 'start' }); section?.focus({ preventScroll: true }) }
  return <div className="mx-auto grid max-w-2xl gap-7">
    <header><p className="text-xs font-bold uppercase tracking-wider text-teal">Agos guide</p><h1 className="mt-1 text-3xl font-extrabold">Help & flood safety</h1><p className="mt-2 text-sm leading-relaxed text-fog">Know what to do, understand the readings, and get help when you need it.</p></header>

    <button onClick={() => jump("help-evacuations")} className="min-h-14 rounded-xl bg-teal p-4 text-left font-bold text-white">Find an evacuation site <span aria-hidden="true">↓</span></button>

    <section aria-labelledby="urgent-title" className="rounded-2xl border border-line bg-panel p-5">
      <h2 id="urgent-title" className="text-xl font-bold">Need urgent help?</h2>
      <p className="mt-2 text-sm leading-relaxed text-fog">If someone is in immediate danger, contact emergency services. Agos does not send rescue requests.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{HOTLINES.map(h => <a key={h.number} aria-label={`Call ${h.name} ${h.number}`} href={`tel:${h.number}`} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-line px-4 py-4 transition hover:border-teal"><span className="text-sm font-semibold">{h.name}</span><span className="text-2xl font-extrabold text-teal">{h.number}</span></a>)}</div>
      <p className="mt-3 text-xs leading-relaxed text-fog">QC 122 serves Quezon City. Elsewhere, use 911 or your local disaster office. Tap a number to open your phone’s dialer. Tell the dispatcher your location or nearest landmark and what happened.</p>
      <div className="mt-2 flex flex-wrap gap-x-5">{HOTLINES.map(h => <a key={h.number} href={h.source} target="_blank" rel="noopener noreferrer" className={link}>{h.number === '122' ? 'QC hotline information' : 'About Unified 911'} <span aria-hidden="true">↗</span></a>)}</div>
    </section>

    <EvacuationSearch onNavigate={onNavigate} active={active} />

    <nav aria-label="Help topics" className="grid grid-cols-3 gap-2">{[['help-safety','Flood safety'],['help-readings','Readings'],['help-answers','Using Agos']].map(([id,label]) => <button key={id} onClick={() => jump(id)} className="min-h-11 rounded-xl border border-line bg-panel px-2 py-3 text-sm font-semibold text-teal">{label}</button>)}</nav>

    <section id="help-safety" tabIndex={-1} aria-labelledby="safety-title" className="scroll-mt-5 rounded-2xl border border-[#eddfb9] bg-[#fff7e2] p-5 focus-visible:outline-2 focus-visible:outline-teal">
      <p className="text-xs font-bold uppercase tracking-wider text-[#72531a]">When you encounter flooding</p>
      <h2 id="safety-title" className="mt-2 text-xl font-extrabold text-[#72531a]">Turn back. Do not enter floodwater.</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#72531a]">Water can hide damaged roads, open drains and strong currents. A route shown in Agos is not permission to cross.</p>
      <div className="mt-5 grid gap-4 text-sm leading-relaxed text-[#72531a]">
        <div><h3 className="font-bold">Choose another route or wait</h3><p className="mt-1">Avoid walking or riding into flooded roads. Keep away from barriers and road closures; do not go around them.</p></div>
        <div><h3 className="font-bold">Follow local instructions</h3><p className="mt-1">Check PAGASA and your local disaster office. If told to evacuate, move to the designated safe area before access is cut off.</p></div>
        <div><h3 className="font-bold">If you cannot leave safely</h3><p className="mt-1">Call for emergency assistance. Do not attempt to cross the water to reach your destination.</p></div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5"><a className={link} href={PAGASA} target="_blank" rel="noopener noreferrer">PAGASA safety guidance ↗</a><a className={link} href={NWS} target="_blank" rel="noopener noreferrer">Flooded-road guidance ↗</a></div>
    </section>

    <section id="help-readings" tabIndex={-1} aria-labelledby="readings-title" className="scroll-mt-5 focus-visible:outline-2 focus-visible:outline-teal">
      <h2 id="readings-title" className="text-xl font-bold">Understand the readings</h2><p className="mt-2 text-sm leading-relaxed text-fog">Read the time and status alongside the water category. An old observation cannot tell you what is happening now.</p>
      <dl className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel">
        <div className="p-5"><dt className="font-semibold">Below LOW · LOW · MID · HIGH</dt><dd className="mt-2 text-sm leading-relaxed text-fog">These show which water contacts detected water at the prototype. They are not water depths, official warning levels, or vehicle clearance ratings. Below LOW does not mean a road is safe.</dd></div>
        <div className="p-5"><dt className="font-semibold">Rain detected / not detected</dt><dd className="mt-2 text-sm leading-relaxed text-fog">This is the rain sensor’s last observation, not a rainfall intensity measurement or weather forecast.</dd></div>
        <div className="p-5"><dt className="font-semibold">Stale · Offline · Connection unavailable</dt><dd className="mt-2 text-sm leading-relaxed text-fog">Agos cannot confirm current conditions. Any saved value is historical. Check official updates and avoid making travel decisions from it.</dd></div>
        <div className="p-5"><dt className="font-semibold">Check sensors · No readings</dt><dd className="mt-2 text-sm leading-relaxed text-fog">The observation needs checking or is missing. Do not interpret this as no flooding.</dd></div>
      </dl>
      <p className="mt-3 rounded-xl bg-teal/10 p-4 text-sm leading-relaxed">Agos currently uses a bench prototype with no installed location. It cannot confirm road conditions. Demonstration stations use sample data.</p>
    </section>

    <section id="help-answers" tabIndex={-1} aria-labelledby="answers-title" className="scroll-mt-5 focus-visible:outline-2 focus-visible:outline-teal">
      <h2 id="answers-title" className="text-xl font-bold">Using Agos</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-panel">
        <Answer question="How do I check before a trip?"><p>Open <strong>Ride</strong> to see the latest available observation and its time. Use <strong>Navigate</strong> to enter a start and destination. Check official advisories and road closures before travelling.</p></Answer>
        <Answer question="Does a route mean the road is safe?"><p>No. Routes are travel options, not safety guarantees. “No reports nearby” means no reports were found; it does not mean no flooding. The bench prototype is excluded from road coverage.</p></Answer>
        <Answer question="Why is the reading not changing?"><p>The device may not have sent a new observation, or the connection may be unavailable. On <strong>Ride</strong>, tap <strong>Refresh readings</strong> and check the measurement time. Refreshing cannot create a new sensor observation.</p></Answer>
        <Answer question="What if my location or map will not load?"><p>Enter your start and destination manually if location is unavailable. Check your internet connection if maps or routes will not load. Map and route services need internet access; a saved reading is not a live update.</p></Answer>
        <Answer question="Will Agos alert me when it is closed?"><p>Background notifications are not connected. Monitoring events appear in <strong>Alerts</strong> while the app is open and receiving fresh observations. Use official warning channels for emergency updates.</p></Answer>
        <Answer question="Does a rider report reach rescuers?"><p>No. Reports in this prototype are saved on this device and are not sent to responders or other users. Use the emergency numbers above when assistance is needed. Record a report only from a safe place.</p></Answer>
      </div>
    </section>

    <section aria-labelledby="sources-title" className="rounded-2xl border border-line bg-panel p-5"><h2 id="sources-title" className="text-xl font-bold">Official information</h2><p className="mt-2 text-sm text-fog">Open the original sources for current guidance and local information.</p><div className="mt-3 grid"><a className={link} href="https://www.pagasa.dost.gov.ph/" target="_blank" rel="noopener noreferrer">PAGASA weather & advisories ↗</a><a className={link} href="https://quezoncity.gov.ph/qc-emergency-hotlines/" target="_blank" rel="noopener noreferrer">Quezon City emergency contacts ↗</a></div><p className="mt-3 text-xs text-fog">Help sources reviewed October 3, 2026. Always follow current instructions from authorities.</p></section>
  </div>
}

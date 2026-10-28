import { getDeviceLocation, isLocationGranted, requestLocationPermission } from '../data/device-location'
import LocationSearchInput from './LocationSearchInput'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { findEvacuationSites, savedEvacuationSites, searchAreas, type SearchArea, type EvacuationSite } from '../data/evacuation'

export default function EvacuationSearch({ onNavigate, active = true }: { active?: boolean; onNavigate: (site: EvacuationSite) => void }) {
  const [pending, setPending] = useState<EvacuationSite | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const routeTrigger = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { if (pending && active) dialog.current?.showModal(); else dialog.current?.close() }, [pending,active])
  const dismiss = () => { dialog.current?.close(); setPending(null); routeTrigger.current?.focus({preventScroll:true}) }
  const incomplete = (site:EvacuationSite) => site.name === 'Mapped emergency shelter' || site.addressStatus !== 'unreviewed'
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<SearchArea | null>(null)
  const [radius, setRadius] = useState(25000)
  const [areas, setAreas] = useState<SearchArea[]>([])
  const [selected, setSelected] = useState<SearchArea | null>(null)
  const [sites, setSites] = useState<EvacuationSite[]>([])
  const [state, setState] = useState<'idle'|'locating'|'places'|'searching'|'done'|'error'>('idle')
  const [message,setMessage] = useState('')
  const [limit,setLimit] = useState(10)
  const [saved, setSaved] = useState(false)
  const task = useRef<AbortController | null>(null)
  useEffect(() => () => task.current?.abort(), [])
  useEffect(() => { if (!active && state === 'locating') { task.current?.abort(); setState('idle'); setMessage('Location request cancelled. Enter a place to continue.') } }, [active, state])
  const begin = () => { task.current?.abort(); const c = new AbortController(); task.current = c; setMessage(''); setSites([]); setAreas([]); setLimit(10); setSaved(false); return c }
  const reset = () => { task.current?.abort(); setState('idle'); setSites([]); setAreas([]); setSelected(null); setMessage('') }
  const find = async (area: SearchArea, live = false) => {
    const c = begin(); setSelected(area); setState('searching')
    try { const rows = await (live ? findEvacuationSites(area.at,radius,c.signal) : savedEvacuationSites(area.at,radius,c.signal)); if (!c.signal.aborted) { setSites(rows); setSaved(!live); setState('done') } }
    catch (e) {
      if (c.signal.aborted) return
      try {
        const rows = await savedEvacuationSites(area.at,radius,c.signal)
        if (!c.signal.aborted) { setSites(rows); setSaved(true); setMessage('Live map search is unavailable. Saved listings are shown below.'); setState('done') }
      } catch { if (!c.signal.aborted) { setMessage(e instanceof Error ? e.message : 'Search unavailable. Try again.'); setState('error') } }
    }
  }
  const search = async (e: FormEvent) => {
    e.preventDefault(); if (chosen) { void find(chosen); return }; const c = begin(); setSelected(null); setState('places')
    try { const rows = await searchAreas(query,c.signal); if (!c.signal.aborted) { setAreas(rows); setState('idle'); if (!rows.length) setMessage('No matching Philippine location found. Try a city or municipality with its province.') } }
    catch (e) { if (!c.signal.aborted) { setMessage(e instanceof Error ? e.message : 'Location search unavailable.'); setState('error') } }
  }
  const locate = async () => {
    const c = begin(); setSelected(null)
    setState('locating')
    try {
      const granted = await isLocationGranted()
      if (!granted) {
        const ok = await requestLocationPermission()
        if (!ok) {
          setMessage('Location permission was not granted. Enter your city or barangay instead.')
          setState('error')
          return
        }
      }
      const at = await getDeviceLocation(c.signal)
      if (!c.signal.aborted) void find({ id: 'device', label: 'Your current location', at })
    } catch (e) {
      if (!c.signal.aborted) {
        setMessage(e instanceof Error ? e.message : 'Location unavailable. Enter your city instead.')
        setState('error')
      }
    }
  }
  const busy = ['places','locating','searching'].includes(state)
  return <section id="help-evacuations" tabIndex={-1} aria-labelledby="evacuation-title" className="rounded-2xl border border-line bg-panel p-5">
    <p className="text-xs font-bold uppercase tracking-wider text-teal">Philippines-wide search</p>
    <button onClick={() => {setQuery('');setChosen(null);reset()}} className="mt-2 min-h-11 text-sm font-semibold text-teal">New search</button>
    <h2 id="evacuation-title" className="mt-1 text-xl font-bold">Find an evacuation site</h2>
    <p className="mt-2 text-sm leading-relaxed text-fog">Search near a city, municipality or barangay anywhere in the Philippines. Results are community-mapped sites, not a complete government directory.</p>
    <form onSubmit={search} className="mt-5 grid gap-3">
      <label className="text-sm font-semibold" htmlFor="evacuation-place">City, municipality or barangay</label>
      <LocationSearchInput value={query} onChange={value => { setQuery(value); setChosen(null); reset() }} onChoose={area => { setQuery(area.label); setChosen(area); reset() }} />
      <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm font-semibold" htmlFor="evacuation-range">Search within<select id="evacuation-range" value={radius} onChange={e => { setRadius(Number(e.target.value)); reset() }} className="mt-1 min-h-11 w-full rounded-xl border border-line bg-panel p-3"><option value={10000}>10 km</option><option value={25000}>25 km</option><option value={50000}>50 km</option></select></label><button disabled={busy} className="min-h-11 rounded-xl bg-teal px-4 py-3 font-semibold text-white disabled:opacity-50">Search area</button></div>
    </form>
    <button disabled={busy} onClick={locate} className="mt-3 min-h-11 w-full rounded-xl border border-line px-4 py-3 text-sm font-semibold text-teal disabled:opacity-50">Use my location</button>
    <p className="mt-2 text-xs leading-relaxed text-fog">Typing sends the place name to Photon for suggestions. Manual searches use OpenStreetMap’s location service. Location-based searches ask your permission and send coordinates to the map-search service. Location is not saved by Agos.</p>
    <div role="status" aria-live="polite" className="mt-4 text-sm text-fog">{busy ? state === 'places' ? 'Finding matching locations…' : state === 'locating' ? 'Getting your location…' : 'Searching mapped evacuation sites…' : message}</div>
    {busy && <button onClick={reset} className="mt-2 min-h-11 rounded-lg border border-line px-4 text-sm font-semibold">Cancel search</button>}
    {!!areas.length && <div className="mt-3"><h3 className="text-sm font-bold">Choose your search location</h3><ul className="mt-2 divide-y divide-line rounded-xl border border-line">{areas.map(area => <li key={area.id}><button onClick={() => void find(area)} className="min-h-11 w-full p-4 text-left text-sm leading-relaxed hover:bg-teal/10">{area.label}</button></li>)}</ul></div>}
    {selected && !busy && <p className="mt-4 break-words text-sm font-semibold">Search near: {selected.label} · {radius / 1000} km</p>}
    {state === 'done' && <>
      {saved && <p className="mt-3 rounded-xl border border-line p-4 text-sm leading-relaxed text-fog">Showing a saved map dataset last committed July 21, 2024. Sites may be outdated. This is not a list of centers confirmed open today. <a href="https://github.com/louislemsic/ph-evac-centers" target="_blank" rel="noopener noreferrer" className="font-semibold text-teal underline">Dataset source</a></p>}
      <p role="status" className="mt-3 text-sm font-semibold">{sites.length ? `${sites.length} mapped ${sites.length === 1 ? 'site' : 'sites'} found` : 'No mapped evacuation sites found in this range.'}</p>
      {!sites.length && <p className="mt-2 text-sm leading-relaxed text-fog">This does not mean there are no evacuation centers. Try a larger range or contact your barangay or local disaster office for the designated site.</p>}
      <p className="mt-3 rounded-xl bg-[#fff7e2] p-4 text-sm leading-relaxed text-[#72531a]">Confirm the designated center with your local disaster office before travelling. Opening status, capacity, accessibility and route safety are unconfirmed.</p>
      {!!sites.length && <p className="mt-3 text-xs leading-relaxed text-fog">Closest mapped sites first. Distances are straight-line estimates from the selected point to the mapped point or site area center, not travel distances or verified entrances.</p>}
      <ul className="mt-4 grid gap-3">{sites.slice(0,limit).map(site => <li key={site.id} className="rounded-xl border border-line p-4"><h3 className="font-bold">{site.name}</h3><p className="mt-1 text-sm text-fog">{(site.distance / 1000).toFixed(1)} km straight-line distance</p><p className="mt-2 text-sm leading-relaxed text-fog">{site.address}</p><p className="mt-1 text-xs font-semibold text-fog">{site.addressStatus === "missing" ? "Address missing from map" : site.addressStatus === "partial" ? "Partial address from map — not reviewed" : "Address from map — not reviewed"}</p><p className="mt-3 text-xs font-semibold text-[#72531a]">Opening status unconfirmed</p>{incomplete(site) && <p className="mt-2 rounded-lg bg-page p-3 text-sm text-fog">Incomplete listing: name or address is missing or partial. Confirm the site and entrance with your local disaster office before using this map point.</p>}<button type="button" onClick={e => { if(incomplete(site)){routeTrigger.current=e.currentTarget;setPending(site)}else onNavigate(site) }} aria-label={`Route to mapped point: ${site.name}`} className="mt-3 min-h-11 w-full rounded-xl bg-teal px-4 py-3 font-semibold text-white">Route to mapped point</button><a href={site.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-teal underline underline-offset-4">View site on OpenStreetMap ↗</a></li>)}</ul>
      {saved && selected && <button onClick={() => void find(selected,true)} className="mt-3 min-h-11 w-full rounded-xl border border-line p-3 font-semibold">Try live map search</button>}
      {sites.length > limit && <button onClick={() => setLimit(n => n+10)} className="mt-3 min-h-11 w-full rounded-xl border border-line p-3 font-semibold">Show more sites</button>}
    </>}
    {state === 'error' && selected && <button onClick={() => void find(selected)} className="mt-3 min-h-11 rounded-xl border border-line px-4 font-semibold">Retry site search</button>}
    <dialog ref={dialog} aria-labelledby="site-confirm-title" aria-describedby="site-confirm-description" onCancel={e => {e.preventDefault();dismiss()}} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-auto rounded-2xl border border-line bg-panel p-5 text-paper shadow-xl backdrop:bg-navy/60">
      <h2 id="site-confirm-title" className="text-xl font-bold">Check this mapped point</h2>
      <p className="mt-3 break-words font-semibold">{pending?.name}</p>
      <p id="site-confirm-description" className="mt-3 text-sm leading-relaxed text-fog">This listing has a missing name or an incomplete address. Opening status is unknown, and the map point is not a verified entrance. Confirm the designated center with your local disaster office before travelling.</p>
      <div className="mt-5 grid gap-3"><button autoFocus onClick={dismiss} className="min-h-11 rounded-xl border border-line p-3 font-semibold">Cancel</button><button onClick={() => {const site=pending;dismiss();if(site)onNavigate(site)}} className="min-h-11 rounded-xl bg-teal p-3 font-semibold text-white">Continue to mapped point</button></div>
    </dialog>
    <div className="mt-5 grid gap-1 border-t border-line pt-3 text-sm"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-teal underline underline-offset-4">Map data © OpenStreetMap contributors ↗</a><a href="https://maps.dswd.gov.ph/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-teal underline underline-offset-4">DSWD map resources ↗</a></div>
  </section>
}

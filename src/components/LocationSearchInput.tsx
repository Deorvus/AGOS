import { useEffect, useRef, useState } from 'react'
import { suggestLocations, type LocationSuggestion } from '../data/location-suggestions'
import type { SearchArea } from '../data/evacuation'

export default function LocationSearchInput({value,onChange,onChoose,id="evacuation-place"}: {id?:string;value:string;onChange:(value:string)=>void;onChoose:(area:SearchArea)=>void}) {
  const [focused,setFocused] = useState(false)
  const [rows,setRows] = useState<LocationSuggestion[]>([])
  const [active,setActive] = useState(-1)
  const [status,setStatus] = useState<'idle'|'loading'|'ready'|'error'>('idle')
  const [dismissed,setDismissed] = useState(false)
  const chosen = useRef<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    setRows([]); setActive(-1); setStatus('idle')
    if (!focused || dismissed || value.trim().length < 3 || value === chosen.current) return
    const c = new AbortController(); request.current = c
    setStatus('loading')
    const timer = setTimeout(() => {
      suggestLocations(value,c.signal).then(results => { if (!c.signal.aborted) {setRows(results);setStatus('ready')} }).catch(() => {if (!c.signal.aborted) setStatus('error')})
    },450)
    return () => {clearTimeout(timer);c.abort()}
  },[value,focused,dismissed])
  const choose = (row:LocationSuggestion) => { request.current?.abort(); chosen.current=row.label; setDismissed(true);setRows([]);setStatus('idle');setActive(-1);onChoose(row) }
  const visible = focused && !dismissed && value.trim().length >= 3 && value !== chosen.current
  const message = status === 'loading' ? 'Finding locations…' : status === 'error' ? 'Suggestions unavailable. Tap Search area to search manually.' : status === 'ready' && !rows.length ? 'No suggestions. Add a province or tap Search area.' : ''
  return <div className="relative">
    <input ref={input} id={id} role="combobox" aria-autocomplete="list" aria-expanded={visible && rows.length > 0} aria-controls={`${id}-suggestions`} aria-activedescendant={visible && active >= 0 ? `${id}-option-${active}` : undefined} aria-describedby={`${id}-status`} autoComplete="off" value={value}
      onChange={e => { chosen.current=null;setDismissed(false);request.current?.abort();onChange(e.target.value) }}
      onFocus={() => {setFocused(true);setDismissed(false)}} onBlur={() => {setFocused(false);setDismissed(true)}}
      onKeyDown={e => {
        if (e.key === 'Escape') {request.current?.abort();setDismissed(true);setActive(-1)}
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length) {e.preventDefault();setDismissed(false);setActive(n => e.key === 'ArrowDown' ? (n+1)%rows.length : (n<=0 ? rows.length-1 : n-1))}
        if (e.key === 'Enter' && visible && active >= 0 && rows[active]) {e.preventDefault();choose(rows[active])}
      }}
      placeholder="e.g. Quezon City or Cebu City" minLength={3} maxLength={160} required className="min-h-11 w-full rounded-xl border border-line bg-panel p-3" />
    {visible && <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-line bg-panel shadow-lg">
      <ul id={`${id}-suggestions`} role="listbox" aria-label="Suggested locations" className="max-h-64 overflow-y-auto">{rows.map((row,i) => <li key={row.id} id={`${id}-option-${i}`} role="option" aria-selected={i === active} onMouseDown={e => e.preventDefault()} onClick={() => choose(row)} className={`min-h-14 cursor-pointer px-4 py-3 text-sm leading-relaxed ${i === active ? 'bg-teal/10' : 'hover:bg-teal/10'}`}><span className="block font-semibold">{row.name}</span><span className="mt-1 block text-xs text-fog">{row.detail}</span></li>)}</ul>
      {message && <p className="p-4 text-sm text-fog">{message}</p>}
    </div>}
    <span id={`${id}-status`} role="status" aria-live="polite" className="sr-only">{visible ? message || `${rows.length} locations suggested. Use the arrow keys to choose.` : ''}</span>
  </div>
}

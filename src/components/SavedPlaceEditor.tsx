import { useState } from 'react'
import LocationSearchInput from './LocationSearchInput'
import type { SearchArea } from '../data/evacuation'
import type { SavedPlace } from '../data/user'

export default function SavedPlaceEditor({ kind, value, onSave }: { kind: 'home' | 'work'; value: string; onSave: (place: SavedPlace | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<SearchArea | null>(null)
  const title = kind === 'home' ? 'Home' : 'Work / school'
  return <div className="border-b border-line p-4 last:border-0">
    <p className="font-semibold">{title}</p>
    <p className="mt-1 break-words text-sm text-fog">{value || 'Not set — choose your own location'}</p>
    {!editing ? <div className="mt-2 flex flex-wrap gap-2"><button onClick={() => { setEditing(true); setQuery(''); setChosen(null) }} className="min-h-11 rounded-xl border border-line px-4 font-semibold text-teal">Choose {title.toLowerCase()}</button>{value && <button onClick={() => onSave(null)} className="min-h-11 px-3 text-sm text-fog">Clear {title.toLowerCase()}</button>}</div> : <form className="mt-3 grid gap-3" onSubmit={e => { e.preventDefault(); if (chosen) { onSave({name:chosen.label,lat:chosen.at[0],lng:chosen.at[1]});setEditing(false) } }}>
      <label htmlFor={`saved-${kind}`} className="text-sm font-semibold">Search {title.toLowerCase()} in the Philippines</label>
      <LocationSearchInput id={`saved-${kind}`} value={query} onChange={q => {setQuery(q);setChosen(null)}} onChoose={area => {setQuery(area.label);setChosen(area)}} />
      <p className="text-xs text-fog">Choose a suggestion, then save. The place is stored on this device. Typing sends the place name to Photon.</p>
      <div className="flex gap-2"><button disabled={!chosen} className="min-h-11 rounded-xl bg-teal px-4 font-semibold text-white disabled:opacity-50">Save {title.toLowerCase()}</button><button type="button" onClick={() => setEditing(false)} className="min-h-11 rounded-xl border border-line px-4">Cancel</button></div>
    </form>}
  </div>
}

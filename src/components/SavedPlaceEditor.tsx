import { useState } from 'react'
import LocationSearchInput from './LocationSearchInput'
import type { SearchArea } from '../data/evacuation'
import type { SavedPlace } from '../data/user'

export default function SavedPlaceEditor({
  kind,
  value,
  onSave,
  hideTitle = false,
}: {
  kind: 'home' | 'work'
  value: string
  onSave: (place: SavedPlace | null) => void
  hideTitle?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<SearchArea | null>(null)
  const title = kind === 'home' ? 'Home' : 'Work / school'

  return (
    <div className={hideTitle ? 'pt-1' : 'border-b border-line p-4 last:border-0'}>
      {!hideTitle && <p className="font-semibold text-paper">{title}</p>}
      <p className="mt-0.5 break-words text-sm font-medium text-fog">
        {value || 'Not set — choose your own location'}
      </p>
      {!editing ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setEditing(true)
              setQuery('')
              setChosen(null)
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-panel px-3.5 py-1.5 text-xs font-semibold text-teal shadow-2xs transition hover:border-teal/40 hover:bg-teal/5"
          >
            {value ? `Change ${title.toLowerCase()}` : `Choose ${title.toLowerCase()}`}
          </button>
          {value && (
            <button
              onClick={() => onSave(null)}
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold text-fog hover:text-l3 transition"
            >
              Clear
            </button>
          )}
        </div>
      ) : (
        <form
          className="mt-3 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (chosen) {
              onSave({ name: chosen.label, lat: chosen.at[0], lng: chosen.at[1] })
              setEditing(false)
            }
          }}
        >
          <label htmlFor={`saved-${kind}`} className="text-xs font-semibold text-paper">
            Search {title.toLowerCase()} in the Philippines
          </label>
          <LocationSearchInput
            id={`saved-${kind}`}
            value={query}
            onChange={(q) => {
              setQuery(q)
              setChosen(null)
            }}
            onChoose={(area) => {
              setQuery(area.label)
              setChosen(area)
            }}
          />
          <p className="text-xs text-fog leading-relaxed">
            Choose a suggestion, then save. Stored locally on this device.
          </p>
          <div className="flex gap-2">
            <button
              disabled={!chosen}
              className="min-h-10 rounded-xl bg-teal px-4 text-xs font-semibold text-white shadow-2xs transition hover:bg-teal/90 disabled:opacity-50"
            >
              Save {title.toLowerCase()}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-10 rounded-xl border border-line bg-panel px-3.5 text-xs font-semibold text-fog hover:text-paper"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

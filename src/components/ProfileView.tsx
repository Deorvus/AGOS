import { useState } from 'react'
import { LEVELS, type Level } from '../data/sensors'
import { compressImage } from '../data/reports'
import SavedPlaceEditor from './SavedPlaceEditor'
import GoogleLink from './GoogleLink'
import { VEHICLES, avoidLevel, riderCode, type Settings, type User, type Vehicle } from '../data/user'
import { Group } from './SettingsView'

type Props = {
  user: User
  settings: Settings
  update: (p: Partial<Settings>) => void
  rename: (name: string) => void
  onSettings: () => void
  setUser: (u: User) => void
}

const label = 'mb-3 px-1 text-xs font-bold uppercase tracking-widest text-fog'

// What each "avoid from" choice means for the rider
const TOLERANCE: Record<1 | 2 | 3, { title: string; body: string }> = {
  1: { title: 'Avoid LOW and higher', body: 'Category preference only. Does not define vehicle clearance or road passability.' },
  2: { title: 'Avoid MID and higher', body: 'Category preference only. Lower categories are not guaranteed passable.' },
  3: { title: 'Avoid HIGH', body: 'Category preference only. Never a claim that LOW or MID is safe.' },
}

export default function ProfileView({ user, settings: s, update, rename, onSettings, setUser }: Props) {
  const [photoErr, setPhotoErr] = useState('')
  const photo = user.photo ?? user.google?.picture
  const upload = async (f?: File) => {
    if (!f) return
    setPhotoErr('')
    try {
      setUser({ ...user, photo: await compressImage(f, 320, 0.8) })
    } catch (e) {
      setPhotoErr((e as Error).message)
    }
  }
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const avoid = avoidLevel(s) as 1 | 2 | 3
  const def = VEHICLES[s.vehicle].avoid as 1 | 2 | 3
  const setAvoid = (l: Level) => update({ avoidOverride: l === def ? null : l })

  return (
    <div className="mx-auto grid grid-cols-1 max-w-2xl gap-8 sm:gap-10">
      {/* Identity */}
      <section className="flex items-center gap-5">
        <label className="group relative shrink-0 cursor-pointer" aria-label="Change profile photo">
          {photo ? (
            <img src={photo} alt="" referrerPolicy="no-referrer" className="h-20 w-20 rounded-full object-cover ring-4 ring-panel sm:h-24 sm:w-24" />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full bg-navy text-3xl font-bold text-cyan ring-4 ring-panel sm:h-24 sm:w-24">{initials}</span>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full bg-teal text-sm text-white shadow-md ring-2 ring-page transition group-hover:scale-110">◎</span>
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ''))} />
        </label>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (name.trim()) rename(name.trim())
                setEditing(false)
              }}
              className="animate-fade-up flex gap-2"
            >
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-teal bg-ink px-3 py-2 text-xl font-bold outline-none" />
              <button className="rounded-lg bg-teal px-4 font-bold text-white">Save</button>
            </form>
          ) : (
            <h1 className="truncate text-2xl font-extrabold sm:text-3xl">{user.name}</h1>
          )}
          <p className="mt-1 select-none font-mono text-sm font-semibold tracking-wider text-teal">{user.id ? riderCode(user.id) : ''}</p>
          <p className="mt-1 truncate text-sm text-fog">
            Riding since {new Date(user.since).toLocaleDateString([], { month: 'short', year: 'numeric' })} · saved on this phone
          </p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="shrink-0 rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold transition hover:border-fog">
            Edit
          </button>
        )}
      </section>

      {photoErr && <p className="-mt-6 text-sm text-l3">{photoErr}</p>}
      {user.photo && (
        <button onClick={() => setUser({ ...user, photo: undefined })} className="-mt-6 justify-self-start px-1 text-sm font-semibold text-fog hover:text-paper">
          Remove photo
        </button>
      )}

      <Group title="Saved places">
        {(['home','work'] as const).map(k => <SavedPlaceEditor key={k} kind={k} value={s[k]} onSave={p => update(k === 'home' ? {home:p?.name ?? '',homePlace:p} : {work:p?.name ?? '',workPlace:p})} />)}
      </Group>

      {/* Google */}
      <section>
        <h2 className={label}>Google account</h2>
        <div className="rounded-xl border border-line bg-panel p-5">
          <GoogleLink
            user={user}
            onLink={(g) => setUser({ ...user, google: g, name: user.name || g.name })}
            onUnlink={() => setUser({ ...user, google: undefined })}
          />
        </div>
      </section>

      {/* Vehicle */}
      <section>
        <h2 className={label}>Your vehicle</h2>
        <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
          {(Object.keys(VEHICLES) as Vehicle[]).map((v) => (
            <button
              key={v}
              onClick={() => update({ vehicle: v, avoidOverride: null })}
              aria-pressed={s.vehicle === v}
              className={`flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-semibold transition duration-300 ${
                s.vehicle === v ? 'border-teal bg-teal text-white shadow-md' : 'border-line bg-panel hover:border-fog'
              }`}
            >
              <span className="text-lg">{VEHICLES[v].icon}</span>
              {VEHICLES[v].label}
            </button>
          ))}
        </div>
      </section>

      <details className="rounded-xl border border-line bg-panel p-4">
        <summary className="min-h-11 cursor-pointer font-semibold text-teal">Advanced route preferences</summary>
        <p className="mb-4 text-sm leading-relaxed text-fog">Prototype category settings. These do not establish vehicle clearance or safe roads.</p>
      {/* Category avoidance preference */}
      <section>
        <div className="mb-3 flex items-end justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-widest text-fog">Category avoidance preference</h2>
          {s.avoidOverride !== null && (
            <button onClick={() => update({ avoidOverride: null })} className="animate-fade-up text-sm font-semibold text-teal">
              Reset to default
            </button>
          )}
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-panel" role="radiogroup" aria-label="Avoid roads from">
          {([1, 2, 3] as const).map((l) => {
            const on = avoid === l
            return (
              <button
                key={l}
                role="radio"
                aria-checked={on}
                onClick={() => setAvoid(l)}
                className={`flex w-full items-start gap-4 border-b border-line px-5 py-4 sm:px-6 sm:py-5 text-left transition-colors duration-300 last:border-0 ${on ? 'bg-teal/5' : 'hover:bg-page'}`}
              >
                <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors duration-300 ${on ? 'border-teal' : 'border-line'}`}>
                  <span className={`h-2.5 w-2.5 rounded-full bg-teal transition-transform duration-300 ${on ? 'scale-100' : 'scale-0'}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    {TOLERANCE[l].title}
                    {l === def && <span className="rounded-full bg-page px-2 py-0.5 text-[11px] font-semibold text-fog">{VEHICLES[s.vehicle].label} default</span>}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-fog">{TOLERANCE[l].body}</span>
                  <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white sm:hidden ${LEVELS[l].color}`}>Avoids {LEVELS[l].label}+ · {LEVELS[l].depth.split('·')[0]}</span>
                </span>
                <span className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${LEVELS[l].color}`}>Avoids {LEVELS[l].label}+</span>
                  <span className="text-xs text-fog">{LEVELS[l].depth.split('·')[0]}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className={`mt-3 px-1 text-sm leading-relaxed transition-colors ${avoid > def ? 'text-l2' : 'text-fog'}`}>
          {avoid > def
            ? 'This preference avoids fewer categories. It never means a road is safe or passable. Do not enter floodwater.'
            : VEHICLES[s.vehicle].note}
        </p>
      </section>



      </details>

      <button onClick={onSettings} className="group flex items-center gap-4 rounded-xl border border-line bg-panel px-6 py-5 text-left transition hover:border-fog">
        <span className="text-xl text-fog transition-transform duration-500 group-hover:rotate-90">⚙</span>
        <span className="flex-1">
          <span className="block font-semibold">Settings</span>
          <span className="mt-1 block text-sm text-fog">Voice directions, map appearance & more</span>
        </span>
        <span className="text-fog transition-transform group-hover:translate-x-1">›</span>
      </button>
    </div>
  )
}

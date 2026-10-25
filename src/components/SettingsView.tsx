import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Settings, User } from '../data/user'
import { WebsiteCard } from './AboutView'

type Props = {
  user: User; settings: Settings; update: (p: Partial<Settings>) => void;
  onBack: () => void; onAbout: () => void; onDeveloper: () => void;
  onForget: () => void; onClearAlerts: () => void; onReset: () => void;
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-fog">{title}</h2>
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">{children}</div></section>
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-5 sm:px-5">
    <div className="min-w-0 flex-1 basis-40"><p className="font-semibold">{label}</p>
      {hint && <p className="mt-1 text-sm leading-relaxed text-fog">{hint}</p>}</div>
    <div className="max-w-full shrink-0">{children}</div></div>
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} className="grid h-11 w-14 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
    <span aria-hidden="true" className={`relative block h-8 w-14 rounded-full transition ${on ? 'bg-teal' : 'bg-line'}`}>
      <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} /></span></button>
}

function LinkRow({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-4 px-4 py-5 text-left transition hover:bg-line/30 sm:px-5">
    <span className="min-w-0 flex-1"><span className="block font-semibold">{label}</span>
      <span className="mt-1 block text-sm leading-relaxed text-fog">{hint}</span></span><span aria-hidden="true" className="text-xl text-fog">›</span></button>
}
const quiet = 'min-h-11 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:border-fog'

export default function SettingsView({ user, settings: s, update, onBack, onAbout, onDeveloper, onForget, onClearAlerts, onReset }: Props) {
  const [page, setPage] = useState<'main' | 'data' | 'install'>('main')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<'clear' | 'reset' | 'profile' | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { if (!pending) trigger.current?.focus() }, [pending])
  const ask = (action: 'clear' | 'reset' | 'profile', button: HTMLButtonElement) => { trigger.current = button; setPending(action) }
  const confirmation = pending === 'clear'
    ? { title: 'Clear alert history?', detail: 'Monitoring events from this session will be removed. Research records will stay.', action: 'Clear history' }
    : pending === 'reset'
    ? { title: 'Reset preferences?', detail: 'Your vehicle, saved places and app preferences will return to defaults. Your profile, reports and research records will stay.', action: 'Reset preferences' }
    : { title: 'Reset your profile?', detail: 'Your profile and preferences will be removed from this device. Community reports and research records will stay.', action: 'Reset profile' }
  const confirmAction = () => {
    if (pending === 'clear') { onClearAlerts(); setMessage('Alert history cleared.') }
    else if (pending === 'reset') { onReset(); setMessage('Preferences reset.') }
    else if (pending === 'profile') { onReset(); onForget() }
    setPending(null)
  }
  const back = () => { setMessage(''); setPage('main') }
  const title = page === 'data' ? 'Manage my data' : page === 'install' ? 'Add Agos to your phone' : 'Settings'
  return <><div inert={!!pending} className="mx-auto grid max-w-2xl grid-cols-1 gap-7">
    <header className="flex items-center gap-3"><button onClick={page === 'main' ? onBack : back} aria-label={page === 'main' ? 'Back to profile' : 'Back to settings'} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-panel text-lg hover:border-fog">←</button>
      <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1></header>
    {page === 'main' && <>
      <Group title="Your ride">
        <LinkRow label="Vehicle & saved places" hint="Manage your vehicle, home and work in Profile" onClick={onBack} />
        <Row label="Voice directions" hint="Hear turn-by-turn directions during a trip"><Toggle on={s.voice} set={(voice) => update({ voice })} label="Voice directions" /></Row>
        <Row label="Map appearance"><div role="group" aria-label="Map appearance" className="flex rounded-full border border-line p-0.5">
          {(['light','dark'] as const).map(v => <button key={v} aria-pressed={s.mapStyle === v} onClick={() => update({ mapStyle: v })} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${s.mapStyle === v ? 'bg-teal text-white' : 'text-fog'}`}>{v === 'light' ? 'Day' : 'Night'}</button>)}
        </div></Row>
      </Group>
      <Group title="Help & information">
        <LinkRow label="Add Agos to your phone" hint="Instructions for Android and iPhone" onClick={() => setPage('install')} />
        <LinkRow label="About Agos" hint="Our purpose and the team behind the app" onClick={onAbout} />
      </Group>
      <WebsiteCard />
      <Group title="Your data"><LinkRow label="Manage my data" hint="Clear alerts or reset your preferences on this device" onClick={() => setPage('data')} /></Group>
      <footer className="grid justify-items-center gap-2 pb-2"><button onClick={onDeveloper} className="min-h-11 rounded-lg px-4 text-sm text-fog underline decoration-line underline-offset-4 hover:text-paper">Developer tools</button><p className="text-xs text-fog">Agos · v1.2</p></footer>
    </>}
    {page === 'install' && <>
      <p className="text-sm leading-relaxed text-fog">Use these steps when Agos is available at its published web address. The browser may offer different options depending on your device.</p>
      <Group title="Android"><div className="p-5 text-sm leading-relaxed"><ol className="list-decimal space-y-3 pl-5"><li>Open Agos in Chrome.</li><li>Open the browser menu (⋮).</li><li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong> and follow the steps.</li></ol></div></Group>
      <Group title="iPhone"><div className="p-5 text-sm leading-relaxed"><ol className="list-decimal space-y-3 pl-5"><li>Open Agos in Safari.</li><li>Tap <strong>Share</strong>.</li><li>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</li></ol></div></Group>
      <p className="rounded-xl border border-line p-4 text-sm text-fog">Adding Agos to your home screen does not enable background flood notifications.</p>
    </>}
    {page === 'data' && <>
      <p className="text-sm leading-relaxed text-fog">These actions affect this device. Research records are managed separately in Developer tools.</p>
      <Group title="Preferences & history">
        <Row label="Clear alert history" hint="Remove monitoring events from this session"><button className={quiet} onClick={e => ask('clear', e.currentTarget)}>Clear</button></Row>
        <Row label="Reset preferences" hint="Restore your vehicle, saved places and app preferences"><button className={quiet} onClick={e => ask('reset', e.currentTarget)}>Reset</button></Row>
      </Group>
      <Group title="Profile"><Row label="Reset my profile" hint={`Remove ${user.name === 'Guest' ? 'your guest profile' : user.name + '’s profile'} and preferences, then return to the welcome screen`}><button className="min-h-11 rounded-lg border border-l3 px-4 py-2.5 text-sm font-semibold text-l3" onClick={e => ask('profile', e.currentTarget)}>Reset profile</button></Row></Group>
      <p role="status" className="text-sm font-semibold text-teal">{message}</p>
    </>}
  </div>
    {pending && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-5">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-detail" onKeyDown={e => {
        if (e.key === 'Escape') setPending(null)
        if (e.key === 'Tab') {
          const buttons = e.currentTarget.querySelectorAll('button')
          const first = buttons[0], last = buttons[buttons.length - 1]
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
        }
      }} className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6 shadow-xl">
        <h2 id="confirm-title" className="text-xl font-bold">{confirmation.title}</h2>
        <p id="confirm-detail" className="mt-3 text-sm leading-relaxed text-fog">{confirmation.detail}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3"><button autoFocus onClick={() => setPending(null)} className={quiet}>Cancel</button><button onClick={confirmAction} className="min-h-11 rounded-lg bg-l3 px-4 py-2.5 text-sm font-semibold text-white">{confirmation.action}</button></div>
      </div>
    </div>}
  </>
}

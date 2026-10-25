import { useState, type FormEvent } from 'react'
import type { User } from '../data/user'

// No accounts: just a name (or rider ID) kept on this device for a personal greeting
export default function WelcomeScreen({ onDone }: { onDone: (u: Omit<User, 'id'>) => void }) {
  const [name, setName] = useState('')
  const clean = name.trim().replace(/\s+/g, ' ')
  const ok = clean.length >= 2

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (ok) onDone({ name: clean.slice(0, 32), since: Date.now() })
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-navy text-white">
      {/* water-line motif */}
      <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-[38%] h-40 w-full text-cyan/10" viewBox="0 0 400 100" preserveAspectRatio="none">
        <path d="M0 40 Q50 20 100 40 T200 40 T300 40 T400 40 V100 H0Z" fill="currentColor" />
        <path d="M0 60 Q50 42 100 60 T200 60 T300 60 T400 60 V100 H0Z" fill="currentColor" />
      </svg>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(2rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-[max(3.5rem,var(--safe-area-inset-top,env(safe-area-inset-top,0px)))]">
        <div className="animate-fade-up flex items-center gap-2.5">
          <span className="text-4xl leading-none text-cyan">≋</span>
          <span>
            <span className="block text-xl font-bold leading-none">Agos</span>
          </span>
        </div>

        <h1 className="animate-fade-up mt-auto text-[2.6rem] font-extrabold leading-[1.05] [animation-delay:60ms]">Check flood information before you travel.</h1>
        <p className="animate-fade-up mt-4 leading-relaxed text-[#b9ccd6] [animation-delay:120ms]">Explore routes and mapped evacuation sites. Current road safety is not verified. No account needed.</p>

        <form onSubmit={submit} className="animate-fade-up mt-10 rounded-2xl bg-panel p-5 text-paper shadow-2xl [animation-delay:180ms]">
          <label htmlFor="rider" className="block text-lg font-bold">What should we call you?</label>
          <p className="mt-1 text-sm text-fog">Your name or rider ID. Saved only on this phone.</p>
          <input
            id="rider"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="go"
            placeholder="e.g. Juan or RIDER-0421"
            className="mt-4 w-full rounded-xl border border-line bg-ink px-4 py-3.5 text-lg font-semibold outline-none transition placeholder:font-normal placeholder:text-fog/70 focus:border-teal"
          />
          <button disabled={!ok} className="mt-4 w-full rounded-xl bg-teal py-4 text-lg font-bold text-white transition hover:bg-[#005c66] active:scale-[0.98] disabled:opacity-40">
            Continue
          </button>
        </form>
        <button onClick={() => onDone({ name: 'Guest', since: Date.now() })} className="mt-4 min-h-11 rounded-xl border border-[#9bb5c4] px-4 py-3 font-semibold">Browse without a name</button>
        <p className="mt-5 text-center text-xs text-[#9bb5c4]">Stay dry. Ride safe.</p>
      </div>
    </div>
  )
}

import EvacuationSearch from './EvacuationSearch'
import type { EvacuationSite } from '../data/evacuation'
import { HOTLINES } from '../data/sensors'

const link = 'inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal underline underline-offset-4'

export default function HelpView({
  onNavigate,
  active = true,
}: {
  active?: boolean
  onNavigate: (site: EvacuationSite) => void
}) {
  return (
    <div className="mx-auto grid max-w-2xl gap-6 sm:gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-teal">Emergency & Assistance</p>
        <h1 className="mt-1 text-3xl font-extrabold text-paper">Emergency help & evacuation</h1>
        <p className="mt-2 text-sm leading-relaxed text-fog">
          Direct emergency hotlines and searchable, verified designated evacuation sites near you.
        </p>
      </header>

      {/* Urgent Emergency Hotlines */}
      <section aria-labelledby="urgent-title" className="rounded-2xl border border-line bg-panel p-5">
        <h2 id="urgent-title" className="text-xl font-bold text-paper">Need urgent help?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-fog">
          If someone is in immediate danger, contact emergency services directly. Agos does not dispatch rescue teams.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {HOTLINES.map((h) => (
            <a
              key={h.number}
              aria-label={`Call ${h.name} ${h.number}`}
              href={`tel:${h.number}`}
              className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-line bg-page/50 px-4 py-4 transition hover:border-teal hover:bg-page"
            >
              <span className="text-sm font-semibold text-paper">{h.name}</span>
              <span className="text-2xl font-extrabold text-teal">{h.number}</span>
            </a>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-fog">
          QC 122 serves Quezon City. Elsewhere, dial 911 or your local DRRMO. Tap any number to call immediately.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-5">
          {HOTLINES.map((h) => (
            <a key={h.number} href={h.source} target="_blank" rel="noopener noreferrer" className={link}>
              {h.number === '122' ? 'QC hotline info' : 'About Unified 911'} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>

      {/* Designated Evacuation Sites Search */}
      <EvacuationSearch onNavigate={onNavigate} active={active} />

      {/* Pointer to Settings for Guides and FAQs */}
      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="text-lg font-bold text-paper">Safety rules & App guides</h2>
        <p className="mt-1 text-sm leading-relaxed text-fog">
          Detailed guidance on what to do when encountering floodwaters, how contact sensor readings work, and app FAQs are organized in Settings.
        </p>
        <a
          href="#/settings"
          className="mt-3 inline-flex items-center gap-2 font-bold text-teal transition hover:underline"
        >
          Open safety guides in Settings →
        </a>
      </section>
    </div>
  )
}

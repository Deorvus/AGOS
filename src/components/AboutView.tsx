const SITE = 'https://floodwatchz.pages.dev/'

const TEAM = [
  { name: 'Russel Jay A. Alejandro', initials: 'RA' },
  { name: 'Noljohn N. Igaña', initials: 'NI' },
  { name: 'Christian A. Fernandez', initials: 'CF' },
  { name: 'Bryan S. Rivera', initials: 'BR' },
  { name: 'John Eric R. Villaruel', initials: 'JV' },
]

const HOW = [
  { icon: '☂', title: 'Rain detection', body: 'View rain detection at the bench prototype, with source and measurement time.' },
  { icon: '≋', title: 'Water contact states', body: 'View Below LOW, LOW, MID and HIGH contact states. Depth is not measured.' },
  { icon: '➤', title: 'Explore route options', body: 'Compare travel routes. Road conditions are unknown; demonstration data and local reports do not establish safety.' },
  { icon: '△', title: 'Monitoring events', body: 'Review new bench test events while the app is open. Background push is not connected.' },
]

export function WebsiteCard() {
  return (
    <a href={SITE} target="_blank" rel="noopener" className="group flex items-center gap-4 overflow-hidden rounded-xl bg-navy px-5 py-5 text-white transition hover:bg-navy-2">
      <span className="text-3xl leading-none text-cyan">≋</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">See our online flood monitoring</span>
        <span className="mt-1 block truncate text-sm text-[#9bb5c4]">Prototype monitoring, demo map and history · floodwatchz.pages.dev</span>
      </span>
      <span className="text-lg text-cyan transition-transform group-hover:translate-x-1">↗</span>
    </a>
  )
}

export default function AboutView({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-10">
      <header className="flex items-center gap-4">
        <button onClick={onBack} aria-label="Back to settings" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-panel text-lg hover:border-fog">
          ←
        </button>
        <h1 className="text-3xl font-extrabold">About us</h1>
      </header>

      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-teal">Our mission</p>
        <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">Helping every rider get home safely, rain or shine.</h2>
        <p className="mt-4 leading-relaxed text-fog">
          Flooding is one of the most common hazards on Philippine roads. For riders, a few centimetres of water can mean a stalled engine or a dangerous fall. Agos brings prototype
          water conditions, test events and route exploration together in one place, so you can decide before you ride.
        </p>
      </section>

      <section>
        <h3 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-fog">What we aim to do</h3>
        <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line">
          {[
            'Warn riders early when roads start to flood.',
            'Show discrete sensor conditions with timestamps and monitoring limits.',
            'Explore routes while making unmonitored areas and unknown conditions clear.',
          ].map((t, i) => (
            <li key={i} className="flex gap-4 bg-panel px-5 py-4">
              <span className="font-mono text-sm font-bold text-teal">{String(i + 1).padStart(2, '0')}</span>
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-fog">How Agos helps</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {HOW.map((h) => (
            <div key={h.title} className="rounded-xl border border-line bg-panel p-5">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-navy text-cyan">{h.icon}</span>
              <p className="mt-3 font-bold">{h.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-fog">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-fog">The team</h3>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel">
          {TEAM.map((m) => (
            <li key={m.name} className="flex items-center gap-4 px-5 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal/10 text-sm font-bold text-teal">{m.initials}</span>
              <span className="min-w-0 truncate font-semibold">{m.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <WebsiteCard />

      <p className="-mt-4 text-center text-xs leading-relaxed text-fog">Flood information is a guide. Always follow PAGASA and your local disaster office.</p>
    </div>
  )
}

import { useLayoutEffect, useRef, useState } from 'react'

const POINTS = [
  { icon: '◉', title: 'A test sensor, not road coverage', body: 'Agos currently shows a bench sensor with no installed road location. Its water contacts are not measurements of road depth.' },
  { icon: '△', title: 'Current road conditions are unknown', body: 'An old reading or a route without reports cannot confirm safe travel. Do not enter floodwater.' },
  { icon: '✚', title: 'Official advisories first', body: 'Follow PAGASA and your local disaster office. If water is moving or you cannot see the road, turn around.' },
]

const TERMS = [
  'Agos provides route and flood information as a guide only. It is not a guarantee of safety.',
  'You remain responsible for your own riding decisions and for following traffic laws and official advisories.',
  'Location access is optional. Search coordinates are sent to mapping and routing providers when you use those features.',
  'Reports and trial logs are saved only on this device. Bench prototype data is not a public road warning.',
]

export default function SafetyNotice({ name, onAccept }: { name: string; onAccept: () => void }) {
  const [step, setStep] = useState<0 | 1>(0)
  const screen = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { window.scrollTo({top:0,behavior:'instant'}); screen.current?.querySelector<HTMLElement>('h1')?.focus({preventScroll:true}) }, [step])
  const [agreed, setAgreed] = useState(false)

  return (
    <div ref={screen} className="flex min-h-dvh flex-col bg-page px-6 pb-[max(2rem,var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] pt-[max(3rem,calc(var(--safe-top)+1rem))]">
      <div key={step} className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-8 flex gap-1.5" aria-label={`Step ${step + 1} of 2`}>
          {[0, 1].map((i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-teal' : 'bg-line'}`} />
          ))}
        </div>

        {step === 0 ? (
          <>
            <p className="animate-fade-up text-sm font-semibold text-teal">Welcome, {name}</p>
            <h1 tabIndex={-1} className="animate-fade-up mt-2 text-4xl font-extrabold leading-tight [animation-delay:60ms]">Before your first ride</h1>
            <ul className="mt-10 grid gap-7">
              {POINTS.map((p, i) => (
                <li key={p.title} className="animate-fade-up flex gap-4" style={{ animationDelay: `${120 + i * 70}ms` }}>
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-lg text-cyan">{p.icon}</span>
                  <span>
                    <span className="block font-bold">{p.title}</span>
                    <span className="mt-1 block leading-relaxed text-fog">{p.body}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-10">
              <button onClick={() => setStep(1)} className="w-full rounded-xl bg-teal py-4 text-lg font-bold text-white transition hover:bg-[#005c66] active:scale-[0.98]">
                I understand
              </button>
              <p className="mt-4 text-center text-xs text-fog">You can review this anytime in Help.</p>
            </div>
          </>
        ) : (
          <>
            <h1 tabIndex={-1} className="animate-fade-up text-4xl font-extrabold leading-tight">Prototype information</h1>
            <p className="animate-fade-up mt-3 leading-relaxed text-fog [animation-delay:60ms]">Review the monitoring limits before exploring Agos.</p>

            <ol className="animate-fade-up mt-7 grid max-h-[38vh] gap-3 overflow-y-auto rounded-xl border border-line bg-panel p-5 text-sm leading-relaxed [animation-delay:120ms]">
              {TERMS.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono text-xs font-bold text-teal">{String(i + 1).padStart(2, '0')}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>

            <label className="animate-fade-up mt-5 flex cursor-pointer items-start gap-3 rounded-xl p-1 [animation-delay:180ms]">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-teal)]" />
              <span className="text-sm font-semibold">I understand the prototype’s monitoring limits</span>
            </label>

            <div className="mt-auto pt-8">
              <button
                onClick={onAccept}
                disabled={!agreed}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-teal py-4 text-lg font-bold text-white transition hover:bg-[#005c66] active:scale-[0.98] disabled:opacity-40"
              >
                Continue to Agos
              </button>
              <button onClick={() => setStep(0)} className="mt-3 w-full py-2 text-sm font-semibold text-fog">
                Back
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  )
}

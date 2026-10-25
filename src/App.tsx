import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DEMO_NODES, type Node } from './data/sensors'
import { fetchMonitoring, loadSnapshot, saveSnapshot, POLL_MS, type Snapshot, type Station } from './data/monitoring'
import { changes, type MonitorEvent } from './data/events'
import MonitoringPanel from './components/MonitoringPanel'
import ResearchView from './components/ResearchView'
import RideVerdict from './components/RideVerdict'
import type { Trip } from './components/Navigate'
const Navigate = lazy(() => import('./components/Navigate'))
import { loadReports, reportsAsNodes, saveReports, type FloodReport } from './data/reports'
import AlertFeed from './components/AlertFeed'
import HelpView from './components/HelpView'
import WelcomeScreen from './components/WelcomeScreen'
import SettingsView from './components/SettingsView'
import DeveloperView from './components/DeveloperView'
import ProfileView from './components/ProfileView'
import AboutView from './components/AboutView'
import SafetyNotice from './components/SafetyNotice'
import { DEFAULT_SETTINGS, avoidLevel, newUserId, useStored, type Settings, type User } from './data/user'

const TABS = [
  { id: 'ride', label: 'Ride', icon: '◉' },
  { id: 'nav', label: 'Navigate', icon: '➤' },
  { id: 'alerts', label: 'Alerts', icon: '△' },
  { id: 'help', label: 'Help', icon: '✚' },
  { id: 'me', label: 'Profile', icon: '◐' },
] as const
type Tab = (typeof TABS)[number]['id'] | 'settings' | 'about' | 'research' | 'developer'

const readHash = (): Tab => {
  const h = location.hash.replace('#/', '') as Tab
  return h === 'settings' || h === 'about' || h === 'research' || h === 'developer' || TABS.some((t) => t.id === h) ? h : 'ride'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(readHash)
  const main = useRef<HTMLElement>(null)
  const pagePositions = useRef<Partial<Record<Tab, number>>>({})
  const currentPage = useRef(tab)
  useEffect(() => {
    const remember = () => { pagePositions.current[currentPage.current] = window.scrollY }
    addEventListener('scroll', remember, { passive: true })
    return () => removeEventListener('scroll', remember)
  }, [])
  useLayoutEffect(() => {
    currentPage.current = tab
    window.scrollTo({ top: pagePositions.current[tab] ?? 0, behavior: 'instant' })
    main.current?.focus({ preventScroll: true })
  }, [tab])
  const [demo, setDemo] = useState(false)
  const nodes: Node[] = demo ? DEMO_NODES : []
  const [snapshot, setSnapshot] = useState<Snapshot>(loadSnapshot)
  const [now, setNow] = useState(Date.now())
  const [refreshId, setRefreshId] = useState(0)
  const [routeId, setRouteId] = useState('r1')
  const [navSeen, setNavSeen] = useState(readHash() === 'nav')
  useEffect(() => { if (tab === 'nav') setNavSeen(true) }, [tab])
  const [trip, setTripState] = useState<Trip | null>(null)
  const [tripVersion,setTripVersion] = useState(0)
  const setTrip = (next: Trip) => {setTripState(next);setTripVersion(v=>v+1)}
  const [alerts, setAlerts] = useState<MonitorEvent[]>([])
  const [community, setCommunityState] = useState<FloodReport[]>(loadReports)
  const setCommunity = (r: FloodReport[]) => (setCommunityState(r), saveReports(r))
  const [user, setUser] = useStored<User | null>('fw.user', null)
  const [ack, setAck] = useStored<boolean>('fw.terms.v1', false)
  const [settings, setSettings] = useStored<Settings>('fw.settings', DEFAULT_SETTINGS)
  const update = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }))
  const prefs = useRef(settings)
  prefs.current = settings

  useEffect(() => {
    const on = () => setTab(readHash())
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    let cur: Station[] | undefined
    let busy = false
    let alive = true
    const controller = new AbortController()
    const tick = async () => {
      if (busy) return
      busy = true
      setSnapshot(s => ({ ...s, loading: true }))
      try {
        const data = await fetchMonitoring(controller.signal)
        if (!alive) return
        const fetchedAt = Date.now()
        if (cur) {
          const fresh = changes(cur, data.stations, fetchedAt, prefs.current.minAlert)
          if (fresh.length) setAlerts(a => [...fresh.reverse(), ...a].filter((e, i, all) => all.findIndex(x => x.id === e.id) === i).slice(0, 40))
        }
        cur = data.stations
        saveSnapshot(data, fetchedAt)
        setSnapshot({ data, fetchedAt, cached: false, error: '', loading: false })
      } catch (e) {
        if (!alive) return
        cur = undefined // Reconnection establishes a new baseline, not catch-up alerts.
        setSnapshot(s => ({ ...s, error: e instanceof Error ? e.message : 'Unable to read monitoring data', loading: false }))
      } finally {
        busy = false
      }
    }
    tick()
    const t = setInterval(tick, POLL_MS)
    const clock = setInterval(() => setNow(Date.now()), 1000)
    addEventListener('online', tick)
    const offline = () => { cur = undefined; setSnapshot(s => ({ ...s, error: 'Device is offline. Last known readings retained.' })) }
    addEventListener('offline', offline)
    return () => { alive = false; controller.abort(); clearInterval(t); clearInterval(clock); removeEventListener('online', tick); removeEventListener('offline', offline) }
  }, [refreshId])

  const go = (t: Tab) => {
    location.hash = `#/${t}`
  }

  // Older saved profiles predate rider IDs
  useEffect(() => {
    if (user && !user.id) setUser({ ...user, id: newUserId() })
  }, [user])

  useLayoutEffect(() => {
    if (user && ack) { window.scrollTo({top: pagePositions.current[tab] ?? 0, behavior:'instant'}); main.current?.focus({preventScroll:true}) }
  }, [!!user, ack])
  if (!user) return <WelcomeScreen onDone={(u) => (setUser({ ...u, id: newUserId() }), go('ride'))} />
  const first = user.name.split(' ')[0]
  if (!ack) return <SafetyNotice name={first} onAccept={() => setAck(true)} />

  return (
    <div className={tab === 'nav' ? 'flex h-dvh flex-col bg-page' : 'min-h-dvh overflow-x-clip bg-page pb-32'}>
      {tab !== 'nav' && <header className="shrink-0 bg-navy pt-[var(--safe-top)] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-4">
        <button onClick={() => go('ride')} className="flex items-center gap-2.5 text-left">
          <span className="text-3xl leading-none text-cyan">≋</span>
          <span>
            <span className="block text-xl font-bold leading-none tracking-tight">Agos</span>
          </span>
        </button>
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 font-mono text-xs text-[#b9ccd6] sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#9bb5c4]" /> {demo ? 'DEMO MAP' : 'PROTOTYPE DATA'}
          </span>
        </div>
        </div>
      </header>}

      <main ref={main} tabIndex={-1} aria-label={TABS.find(t => t.id === tab)?.label ?? tab} className={tab === 'nav' ? 'min-h-0 flex-1 pb-[calc(4.75rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]' : 'mx-auto min-w-0 max-w-6xl px-4 pt-6 sm:px-8 sm:pt-12'}>
        {(
          <div className={tab === 'nav' ? 'h-full animate-fade-in' : 'animate-fade-up'}>
            {tab === 'ride' && <><MonitoringPanel snapshot={snapshot} now={now} retry={() => setRefreshId(v => v + 1)} /><div className="mb-6 rounded-xl border border-line bg-panel p-4"><button role="switch" aria-checked={demo} onClick={() => setDemo(v => !v)} className="min-h-11 font-semibold text-teal">{demo ? 'Exit map demonstration' : 'Explore map demonstration'}</button><p className="text-sm text-fog">{demo ? 'Illustrative stations and fixed sample levels. Not physical readings.' : 'The real bench station has no coordinates. Its readings are excluded from routes.'}</p></div><RideVerdict nodes={nodes} routeId={routeId} setRouteId={setRouteId} avoid={avoidLevel(settings)} onNavigate={(r) => (setTrip({ from: r.from, to: r.to }), go('nav'))} /></>}
            {navSeen && <div hidden={tab !== 'nav'} className="h-full min-w-0"><Suspense fallback={<p role="status" className="p-5">Loading the map… Monitoring is still available on Ride.</p>}><Navigate key={settings.mapStyle + tripVersion + demo} nodes={[...nodes, ...reportsAsNodes(community)]} settings={settings} trip={trip} demo={demo} active={tab === 'nav'} /></Suspense></div>}
            {tab === 'alerts' && <AlertFeed alerts={alerts} notify={settings.notify} setNotify={(notify) => update({ notify })} reports={community} setReports={setCommunity} by={user.name} />}
            {tab === 'me' && (
              <ProfileView
                user={user}
                settings={settings}
                update={update}
                rename={(name) => setUser({ ...user, name })}
                setUser={setUser}
                onSettings={() => go('settings')}
              />
            )}
            {tab === 'settings' && (
              <SettingsView
                user={user}
                settings={settings}
                update={update}
                onBack={() => go('me')}
                onAbout={() => go('about')}
                onDeveloper={() => go('developer')}
                onClearAlerts={() => setAlerts([])}
                onReset={() => setSettings(DEFAULT_SETTINGS)}
                onForget={() => (setUser(null), setAck(false))}
              />
            )}
            {tab === 'about' && <AboutView onBack={() => go('settings')} />}
            {tab === 'developer' && <DeveloperView settings={settings} update={update} snapshot={snapshot} onBack={() => go('settings')} onResearch={() => go('research')} />}
            {tab === 'research' && <ResearchView snapshot={snapshot} events={alerts} onBack={() => go('developer')} />}
            {<div hidden={tab !== 'help'}><HelpView active={tab === 'help'} onNavigate={site => {
              setDemo(false)
              setTrip({ from: null, to: { name: site.name, lat: site.at[0], lng: site.at[1] }, autoPlan: false, evacuation: true })
              go('nav')
            }} /></div>}
          </div>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px))] backdrop-blur">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => go(t.id)}
                aria-current={tab === t.id || (t.id === 'me' && (['settings', 'about', 'developer', 'research'].includes(tab)))}
                className={`flex w-full flex-col items-center gap-1 pb-3.5 pt-3 transition ${tab === t.id || (t.id === 'me' && (['settings', 'about', 'developer', 'research'].includes(tab))) ? 'text-teal' : 'text-fog'}`}
              >
                <span className="text-xl leading-none">{t.icon}</span>
                <span className="text-xs font-semibold">{t.label}</span>
                {t.id === 'alerts' && alerts.length > 0 && <span className="sr-only">{alerts.length} alerts</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}


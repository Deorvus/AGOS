import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DEMO_NODES, type Node } from './data/sensors'
import { fetchMonitoring, loadSnapshot, saveSnapshot, POLL_MS, stationsAsNodes, type Snapshot, type Station } from './data/monitoring'
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
import NearbyBanner from './components/NearbyBanner'
import FirstLaunchPermissions from './components/FirstLaunchPermissions'
import LocationReminderBanner from './components/LocationReminderBanner'
import {
  type NearbyAlert,
  evaluateNearbyDetections,
  sendNearbyNotification,
  initNotificationChannels,
} from './data/nearby-alerts'
import { initPushNotifications } from './data/push-notifications'
import { startDeviceLocationWatch } from './data/device-location'
import { DEFAULT_SETTINGS, avoidLevel, newUserId, useStored, type Settings, type User } from './data/user'
import {
  IconWave,
  IconNavigate,
  IconBell,
  IconLifebuoy,
  IconUser,
} from './components/SoftIcons'

const TABS = [
  { id: 'ride', label: 'Ride', icon: IconWave },
  { id: 'nav', label: 'Navigate', icon: IconNavigate },
  { id: 'alerts', label: 'Alerts', icon: IconBell },
  { id: 'help', label: 'Help', icon: IconLifebuoy },
  { id: 'me', label: 'Profile', icon: IconUser },
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
  const [nearbyAlerts, setNearbyAlerts] = useState<NearbyAlert[]>([])
  const [activeBanner, setActiveBanner] = useState<NearbyAlert | null>(null)
  const trackedInRadius = useRef<Map<string, number>>(new Map())
  const lastLocation = useRef<[number, number] | null>(null)
  const [community, setCommunityState] = useState<FloodReport[]>(loadReports)
  const setCommunity = (r: FloodReport[]) => (setCommunityState(r), saveReports(r))
  const [user, setUser] = useStored<User | null>('fw.user', null)
  const [ack, setAck] = useStored<boolean>('fw.terms.v1', false)
  const [settings, setSettings] = useStored<Settings>('fw.settings', DEFAULT_SETTINGS)
  const update = (p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p }))
  const prefs = useRef(settings)
  prefs.current = settings

  const [permissionsSetup, setPermissionsSetup] = useStored<boolean>('fw.perm_setup.v1', false)

  useEffect(() => {
    void initNotificationChannels()
    void initPushNotifications()
  }, [])

  // Watch device location and evaluate proximity against active prototypes and rider reports while Agos is open
  useEffect(() => {
    if (!settings.nearbyNotify) {
      trackedInRadius.current.clear()
      setActiveBanner(null)
      return
    }

    const checkLocation = (lat: number, lng: number) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      lastLocation.current = [lat, lng]
      const radius = settings.nearbyRadiusM || 1000
      const minLevel = avoidLevel(settings)
      const { newAlerts, updatedTracked } = evaluateNearbyDetections(
        [lat, lng],
        community,
        radius,
        trackedInRadius.current,
        Date.now(),
        snapshot.data?.stations,
        minLevel,
      )
      trackedInRadius.current = updatedTracked
      if (newAlerts.length > 0) {
        setNearbyAlerts((prev) => [...newAlerts, ...prev].slice(0, 30))
        setActiveBanner(newAlerts[0])
        for (const alert of newAlerts) {
          sendNearbyNotification(alert)
        }
      }
    }

    // Immediately evaluate with the latest station readings if location is already known
    if (lastLocation.current) {
      checkLocation(lastLocation.current[0], lastLocation.current[1])
    }

    const clearWatch = startDeviceLocationWatch(
      (pos) => checkLocation(pos.latitude, pos.longitude),
      (err) => console.info('Nearby location watch notice:', err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    )

    return clearWatch
  }, [
    settings.nearbyNotify,
    settings.nearbyRadiusM,
    settings.vehicle,
    settings.avoidOverride,
    community,
    snapshot.data?.stations,
  ])

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
  if (!permissionsSetup) return <FirstLaunchPermissions onComplete={() => setPermissionsSetup(true)} />

  return (
    <div className={tab === 'nav' ? 'flex h-dvh flex-col bg-page' : 'min-h-dvh overflow-x-clip bg-page pb-32'}>
      {activeBanner && (
        <NearbyBanner
          alert={activeBanner}
          onDismiss={() => setActiveBanner(null)}
          onViewAlerts={() => {
            setActiveBanner(null)
            go('alerts')
          }}
        />
      )}
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

      {tab !== 'nav' && <LocationReminderBanner />}

      <main ref={main} tabIndex={-1} aria-label={TABS.find(t => t.id === tab)?.label ?? tab} className={tab === 'nav' ? 'min-h-0 flex-1 pb-[calc(4.75rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))]' : 'mx-auto min-w-0 max-w-6xl px-3.5 pt-3.5 sm:px-8 sm:pt-6'}>
        {(
          <div className={tab === 'nav' ? 'h-full animate-fade-in' : 'animate-fade-up'}>
            {tab === 'ride' && (
              <>
                <MonitoringPanel snapshot={snapshot} now={now} retry={() => setRefreshId((v) => v + 1)} />
                <RideVerdict
                  nodes={nodes}
                  routeId={routeId}
                  setRouteId={setRouteId}
                  avoid={avoidLevel(settings)}
                  onNavigate={(r) => {
                    setTrip({ from: r.from, to: r.to })
                    go('nav')
                  }}
                />
              </>
            )}
            {navSeen && <div hidden={tab !== 'nav'} className="h-full min-w-0"><Suspense fallback={<p role="status" className="p-5">Loading the map… Monitoring is still available on Ride.</p>}><Navigate key={settings.mapStyle + tripVersion + demo} nodes={[...nodes, ...reportsAsNodes(community), ...stationsAsNodes(snapshot.data?.stations, now, !!snapshot.error || snapshot.cached)]} settings={settings} trip={trip} demo={demo} active={tab === 'nav'} snapshot={snapshot} now={now} /></Suspense></div>}
            {tab === 'alerts' && (
              <AlertFeed
                alerts={alerts}
                notify={settings.notify}
                setNotify={(notify) => update({ notify })}
                reports={community}
                setReports={setCommunity}
                by={user.name}
                nearbyAlerts={nearbyAlerts}
                nearbyEnabled={settings.nearbyNotify}
                onClearNearby={() => setNearbyAlerts([])}
              />
            )}
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
                onClearAlerts={() => {
                  setAlerts([])
                  setNearbyAlerts([])
                }}
                onReset={() => setSettings(DEFAULT_SETTINGS)}
                onForget={() => (setUser(null), setAck(false))}
                demo={demo}
                setDemo={setDemo}
                snapshot={snapshot}
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

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[max(env(safe-area-inset-bottom,0px),8px)] backdrop-blur">
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-2">
          {TABS.map((t) => {
            const TabIcon = t.icon
            const isActive =
              tab === t.id ||
              (t.id === 'me' && ['settings', 'about', 'developer', 'research'].includes(tab))
            const hasAlerts = t.id === 'alerts' && (alerts.length > 0 || nearbyAlerts.length > 0)

            return (
              <li key={t.id}>
                <button
                  onClick={() => go(t.id)}
                  aria-current={isActive}
                  className="group flex w-full min-h-0 flex-col items-center gap-1 pb-1.5 pt-2 transition select-none"
                >
                  <div
                    className={`relative flex h-8 w-11 items-center justify-center rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-teal/15 text-teal shadow-xs'
                        : 'text-fog group-hover:bg-slate-100 group-hover:text-paper'
                    }`}
                  >
                    <TabIcon className="h-5 w-5" />
                    {hasAlerts && (
                      <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-l3 ring-2 ring-white" />
                    )}
                  </div>
                  <span
                    className={`text-[11px] leading-tight transition-colors ${
                      isActive ? 'font-bold text-teal' : 'font-semibold text-fog group-hover:text-paper'
                    }`}
                  >
                    {t.label}
                  </span>
                  {hasAlerts && (
                    <span className="sr-only">{alerts.length + nearbyAlerts.length} alerts</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}


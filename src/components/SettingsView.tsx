import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Settings, User } from '../data/user'
import { VEHICLES, avoidLevel } from '../data/user'
import { LEVELS, type Level } from '../data/sensors'
import { WebsiteCard } from './AboutView'
import {
  NEARBY_RADIUS_OPTIONS,
  checkAppNotificationPermission,
  requestNotificationPermission,
  testBackgroundNotification,
  type NotificationPermissionState,
} from '../data/nearby-alerts'
import {
  checkLocationPermission,
  requestLocationPermission,
  openAppSettings,
  onAppResume,
  isNativeAndroid,
  type LocationPermissionState,
} from '../data/device-location'
import { formatTime, getStationLocation, type Snapshot } from '../data/monitoring'
import {
  IconNavigate,
  IconDisplay,
  IconBell,
  IconStation,
  IconBook,
  IconPhone,
  IconInfo,
  IconDatabase,
  IconShield,
  IconWave,
  IconLifebuoy,
  IconVehicle,
  IconChevronRight,
  IconArrowLeft,
  SoftSquircle,
} from './SoftIcons'

type Props = {
  user: User
  settings: Settings
  update: (p: Partial<Settings>) => void
  onBack: () => void
  onAbout: () => void
  onDeveloper: () => void
  onForget: () => void
  onClearAlerts: () => void
  onReset: () => void
  demo?: boolean
  setDemo?: (v: boolean | ((prev: boolean) => boolean)) => void
  snapshot?: Snapshot
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-fog">{title}</h2>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
        {children}
      </div>
    </section>
  )
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-semibold text-paper">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-fog">{hint}</p>}
      </div>
      <div className="max-w-full shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => set(!on)}
      className="grid h-11 w-14 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
    >
      <span aria-hidden="true" className={`relative block h-8 w-14 rounded-full transition ${on ? 'bg-teal' : 'bg-line'}`}>
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
      </span>
    </button>
  )
}

function LinkRow({
  label,
  hint,
  icon,
  onClick,
}: {
  label: string
  hint: string
  icon?: ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-line/20 sm:px-5"
    >
      {icon && (
        <SoftSquircle
          size="md"
          tone="neutral"
          className="group-hover:border-teal/30 group-hover:bg-teal/5 transition-colors"
        >
          {icon}
        </SoftSquircle>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-paper group-hover:text-teal transition-colors">
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-fog">{hint}</span>
      </span>
      <span aria-hidden="true" className="text-fog group-hover:text-teal group-hover:translate-x-0.5 transition-all">
        <IconChevronRight className="h-4 w-4" />
      </span>
    </button>
  )
}

function GuideAnswer({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group border-b border-line last:border-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 font-semibold text-paper focus-visible:outline-2 focus-visible:outline-teal sm:px-5">
        {question}
        <span aria-hidden="true" className="shrink-0 text-xl text-teal group-open:rotate-45 transition-transform">+</span>
      </summary>
      <div className="px-4 pb-4 text-sm leading-relaxed text-fog sm:px-5">{children}</div>
    </details>
  )
}

const TOLERANCE: Record<1 | 2 | 3, { title: string; body: string }> = {
  1: { title: 'Avoid LOW and higher', body: 'Avoids all water contact points. Does not define vehicle clearance or road passability.' },
  2: { title: 'Avoid MID and higher', body: 'Avoids moderate and high contact points. Lower categories are not guaranteed passable.' },
  3: { title: 'Avoid HIGH', body: 'Avoids high contact points only. Never implies lower levels are safe.' },
}

const PAGASA = 'https://www.pagasa.dost.gov.ph/learning-tools/floods'
const NWS = 'https://www.weather.gov/safety/flood-turn-around-dont-drown'
const link = 'inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal underline underline-offset-4'
const quiet = 'min-h-11 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:border-fog'

type SubPage =
  | 'main'
  | 'ride'
  | 'map'
  | 'alerts'
  | 'station'
  | 'guides'
  | 'data'
  | 'install'
  | 'safety'
  | 'readings'
  | 'using'
  | 'about-support'

export default function SettingsView({
  user,
  settings: s,
  update,
  onBack,
  onAbout,
  onDeveloper,
  onForget,
  onClearAlerts,
  onReset,
  demo = false,
  setDemo,
  snapshot,
}: Props) {
  const [page, setPage] = useState<SubPage>('main')
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<'clear' | 'reset' | 'profile' | null>(null)
  const [notifPerm, setNotifPerm] = useState<NotificationPermissionState>('prompt')
  const [locPerm, setLocPerm] = useState<LocationPermissionState>('prompt')
  const [testingBg, setTestingBg] = useState(false)
  const [testResult, setTestResult] = useState('')
  const trigger = useRef<HTMLButtonElement | null>(null)
  const isAndroid = isNativeAndroid()

  const refreshPermissions = async () => {
    const [np, lp] = await Promise.all([
      checkAppNotificationPermission(),
      checkLocationPermission(),
    ])
    setNotifPerm(np)
    setLocPerm(lp)
  }

  useEffect(() => {
    refreshPermissions()
    const unbind = onAppResume(refreshPermissions)
    return unbind
  }, [])

  const firstStation = snapshot?.data?.stations?.[0]
  const latestReading = firstStation?.latest_reading
  const stationLoc = firstStation ? getStationLocation(firstStation) : null

  const handleTestNotification = async () => {
    setTestingBg(true)
    setTestResult('')
    const sent = await testBackgroundNotification()
    setTestingBg(false)
    await refreshPermissions()
    setTestResult(
      sent
        ? isAndroid
          ? '✓ Local alert sent via Android notification channel "flood_alerts".'
          : '✓ System notification sent to your browser.'
        : 'Could not send notification. Please make sure notifications are allowed.',
    )
  }

  const avoid = avoidLevel(s) as 1 | 2 | 3
  const def = VEHICLES[s.vehicle].avoid as 1 | 2 | 3
  const setAvoid = (l: Level) => update({ avoidOverride: l === def ? null : l })

  const askNotificationPermission = async () => {
    const res = await requestNotificationPermission()
    setNotifPerm(res)
    await refreshPermissions()
  }

  const askLocationPermission = async () => {
    await requestLocationPermission()
    await refreshPermissions()
  }

  const toggleNearby = async (on: boolean) => {
    update({ nearbyNotify: on })
    if (on && notifPerm !== 'granted') {
      const res = await requestNotificationPermission()
      setNotifPerm(res)
      await refreshPermissions()
    }
  }

  useEffect(() => {
    if (!pending) trigger.current?.focus()
  }, [pending])

  const ask = (action: 'clear' | 'reset' | 'profile', button: HTMLButtonElement) => {
    trigger.current = button
    setPending(action)
  }

  const confirmation =
    pending === 'clear'
      ? { title: 'Clear alert history?', detail: 'Monitoring and nearby events from this session will be removed.', action: 'Clear history' }
      : pending === 'reset'
        ? { title: 'Reset preferences?', detail: 'Your vehicle, saved places and app preferences will return to defaults.', action: 'Reset preferences' }
        : { title: 'Reset your profile?', detail: 'Your profile and preferences will be removed from this device.', action: 'Reset profile' }

  const confirmAction = () => {
    if (pending === 'clear') {
      onClearAlerts()
      setMessage('Alert history cleared.')
    } else if (pending === 'reset') {
      onReset()
      setMessage('Preferences reset.')
    } else if (pending === 'profile') {
      onReset()
      onForget()
    }
    setPending(null)
  }

  const back = () => {
    setMessage('')
    if (['safety', 'readings', 'using', 'about-support'].includes(page)) {
      setPage('guides')
    } else {
      setPage('main')
    }
  }

  const pageTitle =
    page === 'ride'
      ? 'Ride & navigation'
      : page === 'map'
        ? 'Map & display'
        : page === 'alerts'
          ? 'Nearby flood alerts'
          : page === 'station'
            ? 'Station telemetry'
            : page === 'guides'
              ? 'Safety & guides'
              : page === 'data'
                ? 'Manage my data'
                : page === 'install'
                  ? 'Add Agos to your phone'
                  : page === 'safety'
                    ? 'Safety & flood encounters'
                    : page === 'readings'
                      ? 'Understanding sensor readings'
                      : page === 'using'
                        ? 'Using Agos (FAQs)'
                        : page === 'about-support'
                          ? 'Official info & support'
                          : 'Settings'

  return (
    <>
      <div inert={!!pending} className="mx-auto grid max-w-2xl grid-cols-1 gap-6 sm:gap-7">
        <header className="flex items-center gap-3">
          <button
            onClick={page === 'main' ? onBack : back}
            aria-label={page === 'main' ? 'Back to profile' : 'Back to settings'}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-line bg-panel text-paper hover:border-fog transition shadow-xs"
          >
            <IconArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-extrabold sm:text-3xl text-paper">{pageTitle}</h1>
        </header>

        {page === 'main' && (
          <>
            <Group title="Preferences">
              <LinkRow
                icon={<IconNavigate className="h-5 w-5" />}
                label="Ride & navigation"
                hint={`Vehicle: ${VEHICLES[s.vehicle].label} · Voice ${s.voice ? 'on' : 'off'} · ${s.predictiveRouting !== false ? 'Predictive detours on' : 'Predictive off'} · ${TOLERANCE[avoid].title}`}
                onClick={() => setPage('ride')}
              />
              <LinkRow
                icon={<IconDisplay className="h-5 w-5" />}
                label="Map & display"
                hint={`Appearance: ${s.mapStyle === 'light' ? 'Day' : 'Night'}${demo ? ' · Demo active' : ''}`}
                onClick={() => setPage('map')}
              />
              <LinkRow
                icon={<IconBell className="h-5 w-5" />}
                label="Nearby flood alerts"
                hint={`Alerts: ${s.nearbyNotify ? `On (${s.nearbyRadiusM}m radius)` : 'Off'} · Background support`}
                onClick={() => setPage('alerts')}
              />
            </Group>

            <Group title="Hardware & Diagnostics">
              <LinkRow
                icon={<IconStation className="h-5 w-5" />}
                label="Station & telemetry"
                hint={`${firstStation?.station_code ?? 'QC-001'} · ${stationLoc ? stationLoc.shortLocation : 'New Zealand St, Deparo'} · Live readings`}
                onClick={() => setPage('station')}
              />
            </Group>

            <Group title="Guides & Information">
              <LinkRow
                icon={<IconBook className="h-5 w-5" />}
                label="Safety & flood guides"
                hint="Critical rules, reading categories, FAQs, and emergency contacts"
                onClick={() => setPage('guides')}
              />
              <LinkRow
                icon={<IconPhone className="h-5 w-5" />}
                label="Add Agos to your phone"
                hint="Installation steps for Android and iPhone"
                onClick={() => setPage('install')}
              />
              <LinkRow
                icon={<IconInfo className="h-5 w-5" />}
                label="About Agos"
                hint="Our purpose and the team behind the app"
                onClick={onAbout}
              />
            </Group>

            <Group title="Storage & Account">
              <LinkRow
                icon={<IconDatabase className="h-5 w-5" />}
                label="Manage my data"
                hint="Clear alerts or reset preferences on this device"
                onClick={() => setPage('data')}
              />
            </Group>

            <WebsiteCard />

            <footer className="grid justify-items-center gap-2 pb-2">
              <button
                onClick={onDeveloper}
                className="min-h-11 rounded-lg px-4 text-sm text-fog underline decoration-line underline-offset-4 hover:text-paper"
              >
                Developer tools
              </button>
              <p className="text-xs text-fog">Agos · v1.2</p>
            </footer>
          </>
        )}

        {/* SUBPAGE: Ride & navigation */}
        {page === 'ride' && (
          <div className="grid gap-6">
            <Group title="Your ride">
              <LinkRow
                icon={<IconVehicle className="h-5 w-5" />}
                label="Vehicle & saved places"
                hint={`Currently: ${VEHICLES[s.vehicle].label} · Home & Work saved in Profile`}
                onClick={onBack}
              />
              <Row label="Voice directions" hint="Hear turn-by-turn guidance during navigation">
                <Toggle on={s.voice} set={(voice) => update({ voice })} label="Voice directions" />
              </Row>
            </Group>

            <Group title="Predictive routing">
              <Row
                label="Predictive flood routing"
                hint="Analyze historical NDRRMC & MMDA flood hazard corridors and automatically suggest detours around vulnerable basins before live reports are created"
              >
                <Toggle
                  on={s.predictiveRouting !== false}
                  set={(predictiveRouting) => update({ predictiveRouting })}
                  label="Predictive flood routing"
                />
              </Row>
            </Group>

            <section>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-widest text-fog">Route preferences</h2>
                {s.avoidOverride !== null && (
                  <button
                    onClick={() => update({ avoidOverride: null })}
                    className="text-xs font-semibold text-teal hover:underline"
                  >
                    Reset to {VEHICLES[s.vehicle].label} default
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-line bg-panel" role="radiogroup" aria-label="Avoid roads from">
                {([1, 2, 3] as const).map((l) => {
                  const on = avoid === l
                  return (
                    <button
                      key={l}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setAvoid(l)}
                      className={`flex w-full items-start gap-3.5 border-b border-line px-4 py-3.5 sm:px-5 text-left transition-colors last:border-0 ${
                        on ? 'bg-teal/5' : 'hover:bg-page'
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                          on ? 'border-teal' : 'border-line'
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full bg-teal transition-transform ${
                            on ? 'scale-100' : 'scale-0'
                          }`}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-paper">{TOLERANCE[l].title}</span>
                          {l === def && (
                            <span className="rounded-full bg-page px-2 py-0.5 text-[10px] font-semibold text-fog">
                              Default for {VEHICLES[s.vehicle].label}
                            </span>
                          )}
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${LEVELS[l].color}`}>
                            {LEVELS[l].short}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-fog">{TOLERANCE[l].body}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              <p className={`mt-2 px-1 text-xs leading-relaxed ${avoid > def ? 'text-l2 font-semibold' : 'text-fog'}`}>
                {avoid > def
                  ? 'Avoids fewer categories than default. Lower categories are not verified as safe. Never enter floodwater.'
                  : VEHICLES[s.vehicle].note}
              </p>
            </section>
          </div>
        )}

        {/* SUBPAGE: Map & display */}
        {page === 'map' && (
          <div className="grid gap-6">
            <Group title="Map appearance">
              <Row label="Map appearance" hint="Choose light or dark map tiles">
                <div role="group" aria-label="Map appearance" className="flex rounded-full border border-line p-0.5">
                  {(['light', 'dark'] as const).map((v) => (
                    <button
                      key={v}
                      aria-pressed={s.mapStyle === v}
                      onClick={() => update({ mapStyle: v })}
                      className={`min-h-10 rounded-full px-4 text-xs font-semibold ${
                        s.mapStyle === v ? 'bg-teal text-white' : 'text-fog'
                      }`}
                    >
                      {v === 'light' ? 'Day' : 'Night'}
                    </button>
                  ))}
                </div>
              </Row>
              {setDemo && (
                <Row
                  label="Map demonstration mode"
                  hint={
                    demo
                      ? 'Demonstration mode active. Stations & sample flood points are illustrative.'
                      : 'Show illustrative sample stations and flood points on the map for demonstration.'
                  }
                >
                  <Toggle on={demo} set={(v) => setDemo(v)} label="Map demonstration mode" />
                </Row>
              )}
            </Group>
          </div>
        )}

        {/* SUBPAGE: Nearby alerts */}
        {page === 'alerts' && (
          <div className="grid gap-6">
            <Group title="Nearby alerts">
              <Row
                label="Nearby flood alerts"
                hint="Alert when a hardware prototype sensor or active rider flood report is detected near you while Agos is open"
              >
                <Toggle on={s.nearbyNotify} set={toggleNearby} label="Nearby flood alerts" />
              </Row>
              {s.nearbyNotify && (
                <>
                  <Row label="Detection radius" hint="Trigger alerts when a prototype or flood report is within this distance">
                    <div
                      role="group"
                      aria-label="Detection radius"
                      className="flex flex-wrap gap-1 rounded-xl border border-line p-1"
                    >
                      {NEARBY_RADIUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          aria-pressed={s.nearbyRadiusM === opt.value}
                          onClick={() => update({ nearbyRadiusM: opt.value })}
                          className={`min-h-9 rounded-lg px-2.5 text-xs font-semibold ${
                            s.nearbyRadiusM === opt.value
                              ? 'bg-teal text-white'
                              : 'text-fog hover:text-paper'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </Row>
                  <div className="space-y-3.5 bg-page/50 p-4 sm:p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-fog">
                      Permissions & Native Status
                    </h3>

                    {/* Foreground Location Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-paper">Foreground location:</span>
                        <p className="mt-0.5 text-[11px] text-fog">
                          Used only while Agos is open to calculate proximity to hardware prototypes and active flood reports.
                        </p>
                      </div>
                      <div className="shrink-0">
                        {locPerm === 'granted' ? (
                          <span className="font-semibold text-ok">✓ Allowed (Foreground)</span>
                        ) : locPerm === 'denied' ? (
                          <button
                            type="button"
                            onClick={openAppSettings}
                            className="font-bold text-amber-600 underline underline-offset-2"
                          >
                            Blocked in Settings · Open Settings
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={askLocationPermission}
                            className="font-bold text-teal underline decoration-teal/40 underline-offset-2"
                          >
                            Allow location
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notification Permission Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-paper">
                          {isAndroid ? 'Android notification permission:' : 'Device notifications:'}
                        </span>
                        <p className="mt-0.5 text-[11px] text-fog">
                          {isAndroid
                            ? 'Delivers local alerts on Android via Capacitor Local Notifications'
                            : 'Delivers web alerts while Agos is active in your browser'}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {notifPerm === 'granted' ? (
                          <span className="font-semibold text-ok">✓ Allowed</span>
                        ) : notifPerm === 'denied' ? (
                          <button
                            type="button"
                            onClick={openAppSettings}
                            className="font-bold text-amber-600 underline underline-offset-2"
                          >
                            Blocked in Settings · Open Settings
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={askNotificationPermission}
                            className="font-bold text-teal underline decoration-teal/40 underline-offset-2"
                          >
                            Allow notifications
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Test Notification Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-paper">
                          {isAndroid ? 'Native Android local alert' : 'Browser notification test'}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-fog">
                          {isAndroid
                            ? 'Schedules an on-device notification via Capacitor Local Notifications plugin on channel "flood_alerts".'
                            : 'Delivers a web notification via Service Worker / Notification API.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestNotification}
                        disabled={testingBg}
                        className="rounded-lg border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs font-bold text-teal transition hover:bg-teal/20 disabled:opacity-50"
                      >
                        {testingBg ? 'Sending…' : 'Send test alert'}
                      </button>
                    </div>

                    {testResult && (
                      <p className="mt-2 text-xs font-semibold text-teal animate-fade-in">
                        {testResult}
                      </p>
                    )}

                    {/* Transparent Background/FCM info note */}
                    <div className="mt-3 rounded-xl border border-line bg-panel p-3 text-[11px] leading-relaxed text-fog">
                      <strong className="block text-paper">How background alerts operate in Agos:</strong>
                      <span>
                        Proximity alerts evaluate your device location against community flood reports while Agos is open. To protect battery and privacy, Agos does not run continuous background GPS tracking. Alert delivery when the app is completely closed requires an external cloud push backend (e.g., Firebase Cloud Messaging with server dispatch).
                      </span>
                    </div>
                  </div>
                </>
              )}
            </Group>
          </div>
        )}

        {/* SUBPAGE: Station & telemetry */}
        {page === 'station' && (
          <div className="grid gap-6">
            <Group title="Station & reading summary">
              <Row
                label="Station location"
                hint={
                  stationLoc
                    ? `${stationLoc.locationName} (${stationLoc.lat.toFixed(6)}, ${stationLoc.lng.toFixed(6)})`
                    : 'New Zealand Street, Deparo, Caloocan'
                }
              >
                <span className="text-xs font-semibold text-paper">
                  {firstStation?.station_code ?? 'QC-001'}
                </span>
              </Row>
              <Row
                label="Backend received time"
                hint={latestReading?.received_at ? formatTime(latestReading.received_at) : 'Not available'}
              >
                <span className="text-xs text-fog">Live RPC</span>
              </Row>
              <Row
                label="App fetched time"
                hint={snapshot?.fetchedAt ? formatTime(snapshot.fetchedAt) : 'Not available'}
              >
                <span className="text-xs text-fog">{snapshot?.cached ? 'Cached' : 'Direct'}</span>
              </Row>
              <Row
                label="Station telemetry"
                hint={`Mode: ${firstStation?.mode ?? 'bench'} · Contact sensors: LOW / MID / HIGH`}
              >
                <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs font-bold text-teal">
                  {firstStation?.is_active ? 'Active' : 'Standby'}
                </span>
              </Row>
            </Group>
          </div>
        )}

        {/* SUBPAGE: Guides list */}
        {page === 'guides' && (
          <div className="grid gap-6">
            <Group title="Safety & guides">
              <LinkRow
                icon={<IconShield className="h-5 w-5" />}
                label="Safety & flood encounters"
                hint="Critical rules: Turn back, do not enter floodwater, emergency guidance"
                onClick={() => setPage('safety')}
              />
              <LinkRow
                icon={<IconWave className="h-5 w-5" />}
                label="Understanding sensor readings"
                hint="Below LOW, LOW, MID, HIGH contact states and reading age"
                onClick={() => setPage('readings')}
              />
              <LinkRow
                icon={<IconLifebuoy className="h-5 w-5" />}
                label="Using Agos (FAQs)"
                hint="Trip checking, route meaning, sensor refresh, and offline behavior"
                onClick={() => setPage('using')}
              />
              <LinkRow
                icon={<IconInfo className="h-5 w-5" />}
                label="Official info & support"
                hint="PAGASA weather, QC helplines, Unified 911, and app mission"
                onClick={() => setPage('about-support')}
              />
            </Group>
          </div>
        )}

        {/* SUBPAGE: Safety & flood encounters */}
        {page === 'safety' && (
          <div className="grid gap-6">
            <section className="rounded-2xl border border-[#eddfb9] bg-[#fff7e2] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#72531a]">
                When you encounter flooding
              </p>
              <h2 className="mt-1 text-xl font-extrabold text-[#72531a]">
                Turn back. Do not enter floodwater.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#72531a]">
                Water can hide damaged roads, open drains, and strong currents. A route shown in Agos is not permission to cross.
              </p>
              <div className="mt-5 grid gap-4 text-sm leading-relaxed text-[#72531a]">
                <div>
                  <h3 className="font-bold">Choose another route or wait</h3>
                  <p className="mt-1">
                    Avoid walking or riding into flooded roads. Keep away from barriers and road closures; do not go around them.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold">Follow local instructions</h3>
                  <p className="mt-1">
                    Check PAGASA and your local disaster office. If told to evacuate, move to the designated safe area before access is cut off.
                  </p>
                </div>
                <div>
                  <h3 className="font-bold">If you cannot leave safely</h3>
                  <p className="mt-1">
                    Call emergency services (911 or QC 122). Do not attempt to cross the water to reach your destination.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5">
                <a className={link} href={PAGASA} target="_blank" rel="noopener noreferrer">
                  PAGASA safety guidance ↗
                </a>
                <a className={link} href={NWS} target="_blank" rel="noopener noreferrer">
                  Flooded-road guidance ↗
                </a>
              </div>
            </section>
          </div>
        )}

        {/* SUBPAGE: Understanding sensor readings */}
        {page === 'readings' && (
          <div className="grid gap-6">
            <p className="text-sm leading-relaxed text-fog">
              Always evaluate the timestamp alongside the water category. An old observation cannot tell you current conditions.
            </p>
            <dl className="divide-y divide-line rounded-2xl border border-line bg-panel">
              <div className="p-5">
                <dt className="font-semibold text-paper">Below LOW · LOW · MID · HIGH</dt>
                <dd className="mt-2 text-sm leading-relaxed text-fog">
                  These indicate which contact probes detected water at the prototype. They are discrete contact levels, not water depths, official warning levels, or vehicle clearance ratings. Below LOW does not mean a road is safe.
                </dd>
              </div>
              <div className="p-5">
                <dt className="font-semibold text-paper">Rain detected / not detected</dt>
                <dd className="mt-2 text-sm leading-relaxed text-fog">
                  This reflects the rain sensor’s most recent binary observation, not a rainfall intensity measurement or forecast.
                </dd>
              </div>
              <div className="p-5">
                <dt className="font-semibold text-paper">Stale · Offline · Connection unavailable</dt>
                <dd className="mt-2 text-sm leading-relaxed text-fog">
                  Agos cannot confirm current conditions. Retained values are historical. Check official updates rather than relying on stale data.
                </dd>
              </div>
              <div className="p-5">
                <dt className="font-semibold text-paper">Check sensors · No readings</dt>
                <dd className="mt-2 text-sm leading-relaxed text-fog">
                  The sensor observation needs checking or is missing. Never interpret this as an absence of floodwater.
                </dd>
              </div>
            </dl>
            <p className="rounded-xl bg-teal/10 p-4 text-xs leading-relaxed text-fog">
              QC-001 is a bench prototype without deployed road coordinates. It cannot confirm road conditions. Demonstration stations use sample data.
            </p>
          </div>
        )}

        {/* SUBPAGE: Using Agos (FAQs) */}
        {page === 'using' && (
          <div className="grid gap-6">
            <p className="text-sm leading-relaxed text-fog">
              Frequently asked questions on trips, routes, readings, and reports.
            </p>
            <div className="overflow-hidden rounded-2xl border border-line bg-panel">
              <GuideAnswer question="How do I check before a trip?">
                <p>
                  Open <strong>Ride</strong> to view the latest available observation and reading age. Use <strong>Navigate</strong> to plan a start and destination. Always check official advisories and road closures before travelling.
                </p>
              </GuideAnswer>
              <GuideAnswer question="Does a route mean the road is safe?">
                <p>
                  No. Routes are travel options, not safety guarantees. &ldquo;No reports nearby&rdquo; means no active reports were found; it does not confirm the road is flood-free. The bench prototype has no road coordinates.
                </p>
              </GuideAnswer>
              <GuideAnswer question="Why is the reading not changing?">
                <p>
                  The sensor unit may not have sent a new observation, or connection may be unavailable. On <strong>Ride</strong>, tap <strong>Refresh</strong> and check the measurement age. Refreshing cannot fabricate new sensor data.
                </p>
              </GuideAnswer>
              <GuideAnswer question="What if my location or map will not load?">
                <p>
                  Enter your start and destination manually if GPS is unavailable. Check your internet connection if map tiles or route calculations fail to load.
                </p>
              </GuideAnswer>
              <GuideAnswer question="Will Agos alert me when it is closed?">
                <p>
                  Background push notifications are not connected. Proximity alerts operate only while Agos is open in your browser or web view. Use official emergency warning channels.
                </p>
              </GuideAnswer>
              <GuideAnswer question="Does a rider report reach emergency responders?">
                <p>
                  No. Rider reports are saved on this device to help community navigation and are not sent to 911 or rescue units. Use the emergency hotline numbers in Help if urgent assistance is needed.
                </p>
              </GuideAnswer>
            </div>
          </div>
        )}

        {/* SUBPAGE: Official information & support */}
        {page === 'about-support' && (
          <div className="grid gap-6">
            <section className="rounded-2xl border border-line bg-panel p-5">
              <h2 className="text-lg font-bold text-paper">Official emergency resources</h2>
              <p className="mt-1 text-sm text-fog">
                Refer directly to official agency sources for current weather guidance and regional alerts.
              </p>
              <div className="mt-4 grid gap-3">
                <a
                  className={link}
                  href="https://www.pagasa.dost.gov.ph/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  PAGASA weather & typhoon bulletins ↗
                </a>
                <a
                  className={link}
                  href="https://quezoncity.gov.ph/qc-emergency-hotlines/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Quezon City emergency hotline directory ↗
                </a>
              </div>
            </section>
            <WebsiteCard />
          </div>
        )}

        {page === 'install' && (
          <>
            <p className="text-sm leading-relaxed text-fog">
              Use these steps when Agos is available in your mobile browser.
            </p>
            <Group title="Android">
              <div className="p-5 text-sm leading-relaxed">
                <ol className="list-decimal space-y-3 pl-5">
                  <li>Open Agos in Chrome.</li>
                  <li>Open the browser menu (⋮).</li>
                  <li>
                    Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </li>
                </ol>
              </div>
            </Group>
            <Group title="iPhone">
              <div className="p-5 text-sm leading-relaxed">
                <ol className="list-decimal space-y-3 pl-5">
                  <li>Open Agos in Safari.</li>
                  <li>Tap <strong>Share</strong>.</li>
                  <li>
                    Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                  </li>
                </ol>
              </div>
            </Group>
            <p className="rounded-xl border border-line p-4 text-xs text-fog">
              Adding Agos to your home screen does not enable background flood notifications.
            </p>
          </>
        )}

        {page === 'data' && (
          <>
            <p className="text-sm leading-relaxed text-fog">
              These actions affect this device. Research records are managed separately in Developer tools.
            </p>
            <Group title="Preferences & history">
              <Row label="Clear alert history" hint="Remove monitoring and nearby events from this session">
                <button className={quiet} onClick={(e) => ask('clear', e.currentTarget)}>
                  Clear
                </button>
              </Row>
              <Row label="Reset preferences" hint="Restore vehicle, saved places, and app preferences to defaults">
                <button className={quiet} onClick={(e) => ask('reset', e.currentTarget)}>
                  Reset
                </button>
              </Row>
            </Group>
            <Group title="Profile">
              <Row
                label="Reset my profile"
                hint={`Remove ${user.name === 'Guest' ? 'your guest profile' : user.name + '’s profile'} and preferences`}
              >
                <button
                  className="min-h-11 rounded-lg border border-l3 px-4 py-2 text-xs font-semibold text-l3"
                  onClick={(e) => ask('profile', e.currentTarget)}
                >
                  Reset profile
                </button>
              </Row>
            </Group>
            <p role="status" className="text-sm font-semibold text-teal">
              {message}
            </p>
          </>
        )}
      </div>

      {pending && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-detail"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setPending(null)
              if (e.key === 'Tab') {
                const buttons = e.currentTarget.querySelectorAll('button')
                const first = buttons[0],
                  last = buttons[buttons.length - 1]
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault()
                  last?.focus()
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault()
                  first?.focus()
                }
              }
            }}
            className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6 shadow-xl"
          >
            <h2 id="confirm-title" className="text-xl font-bold">
              {confirmation.title}
            </h2>
            <p id="confirm-detail" className="mt-3 text-sm leading-relaxed text-fog">
              {confirmation.detail}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button autoFocus onClick={() => setPending(null)} className={quiet}>
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="min-h-11 rounded-lg bg-l3 px-4 py-2.5 text-sm font-semibold text-white"
              >
                {confirmation.action}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

import { useState } from 'react'
import { LEVELS, type Level } from '../data/sensors'
import { compressImage } from '../data/reports'
import SavedPlaceEditor from './SavedPlaceEditor'
import GoogleLink from './GoogleLink'
import {
  VEHICLES,
  avoidLevel,
  riderCode,
  type Settings,
  type User,
  type Vehicle,
} from '../data/user'
import {
  IconUser,
  IconVehicle,
  IconPin,
  IconSliders,
  IconCamera,
  IconHome,
  IconBriefcase,
  IconSettings,
  IconCopy,
  IconCheck,
  IconShield,
  IconMotorcycle,
  IconScooter,
  IconBicycle,
  IconCar,
  IconSuv,
  IconChevronRight,
  IconEdit,
  SoftSquircle,
} from './SoftIcons'

type Props = {
  user: User
  settings: Settings
  update: (p: Partial<Settings>) => void
  rename: (name: string) => void
  onSettings: () => void
  setUser: (u: User) => void
}

type ProfileTab = 'account' | 'vehicle' | 'places' | 'preferences'

const TOLERANCE: Record<1 | 2 | 3, { title: string; body: string; color: string; badge: string }> = {
  1: {
    title: 'Avoid LOW and higher',
    body: 'Route avoids all water contact points. Recommended for e-bikes, low scooters, and cautious riders.',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badge: 'Max Caution',
  },
  2: {
    title: 'Avoid MID and higher',
    body: 'Standard commuter setting. Avoids knee-deep water and impassable roads. Lower contact is not guaranteed passable.',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    badge: 'Standard',
  },
  3: {
    title: 'Avoid HIGH only',
    body: 'Only detours around severe, deep flood alerts. Never implies LOW or MID water levels are completely safe.',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    badge: 'Permissive',
  },
}

const VEHICLE_ICONS: Record<Vehicle, typeof IconVehicle> = {
  motorcycle: IconMotorcycle,
  scooter: IconScooter,
  bicycle: IconBicycle,
  car: IconCar,
  suv: IconSuv,
}

export default function ProfileView({
  user,
  settings: s,
  update,
  rename,
  onSettings,
  setUser,
}: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('account')
  const [photoErr, setPhotoErr] = useState('')
  const [copiedId, setCopiedId] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user.name)

  const photo = user.photo ?? user.google?.picture
  const initials =
    user.name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'R'

  const avoid = avoidLevel(s) as 1 | 2 | 3
  const def = VEHICLES[s.vehicle].avoid as 1 | 2 | 3
  const setAvoid = (l: Level) => update({ avoidOverride: l === def ? null : l })

  const upload = async (f?: File) => {
    if (!f) return
    setPhotoErr('')
    try {
      setUser({ ...user, photo: await compressImage(f, 320, 0.8) })
    } catch (e) {
      setPhotoErr((e as Error).message)
    }
  }

  const handleCopyId = () => {
    if (!user.id) return
    navigator.clipboard?.writeText(riderCode(user.id))
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const tabs = [
    { id: 'account' as const, label: 'Account', icon: IconUser },
    { id: 'vehicle' as const, label: 'Vehicle', icon: IconVehicle },
    { id: 'places' as const, label: 'Saved Places', icon: IconPin },
    { id: 'preferences' as const, label: 'Preferences', icon: IconSliders },
  ]

  const ActiveVehicleIcon = VEHICLE_ICONS[s.vehicle] || IconVehicle

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6 pb-12">
      {/* Hero Profile Header Card */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-panel p-4.5 sm:p-6 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          {/* Avatar and Identity Info */}
          <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0 flex-1">
            {/* Avatar with soft upload squircle overlay */}
            <label
              className="group relative shrink-0 cursor-pointer"
              aria-label="Change profile photo"
              title="Click to update photo"
            >
              {photo ? (
                <img
                  src={photo}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl object-cover ring-2 ring-line transition group-hover:opacity-90"
                />
              ) : (
                <div className="grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-2xl bg-slate-100 border border-line text-xl sm:text-2xl font-black text-paper">
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-teal text-white shadow-xs ring-2 ring-panel transition group-hover:scale-105">
                <IconCamera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  upload(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>

            <div className="min-w-0 flex-1">
              {editing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (name.trim()) rename(name.trim())
                    setEditing(false)
                  }}
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="min-w-0 w-36 sm:w-52 rounded-lg border border-teal bg-page px-2.5 py-1 text-sm sm:text-base font-bold text-paper outline-none focus:ring-2 focus:ring-teal/30"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-teal px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-teal/90"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setName(user.name)
                      setEditing(false)
                    }}
                    className="rounded-lg border border-line px-2 py-1 text-xs font-semibold text-fog hover:text-paper"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-lg sm:text-2xl font-bold tracking-tight text-paper">
                    {user.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setName(user.name)
                      setEditing(true)
                    }}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-fog hover:text-teal hover:bg-teal/10 transition"
                    aria-label="Edit rider name"
                    title="Edit name"
                  >
                    <IconEdit className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-fog">
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Click to copy Rider ID"
                  className="group inline-flex items-center gap-1 rounded-md bg-slate-100/90 border border-slate-200/80 px-2 py-0.5 font-mono text-[11px] sm:text-xs font-semibold text-teal transition hover:bg-teal/10 active:scale-95"
                >
                  <span>{user.id ? riderCode(user.id) : 'FW-RIDER'}</span>
                  {copiedId ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-sans font-bold text-ok">
                      <IconCheck className="h-2.5 w-2.5 text-ok" />
                      <span>Copied</span>
                    </span>
                  ) : (
                    <IconCopy className="h-2.5 w-2.5 text-fog group-hover:text-teal" />
                  )}
                </button>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] sm:text-xs text-fog truncate">
                  Joined {new Date(user.since).toLocaleDateString([], {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Top-right Settings Button: Cleanly positioned on all screen dimensions */}
          <button
            type="button"
            onClick={onSettings}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-line bg-page px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-paper shadow-2xs transition hover:border-fog hover:bg-slate-100 active:scale-95"
            title="Settings & Diagnostics"
          >
            <IconSettings className="h-4 w-4 text-fog" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

        {photoErr && (
          <p className="mt-2.5 text-xs font-semibold text-l3">{photoErr}</p>
        )}
      </section>

      {/* Categorized Segmented Navigation Bar */}
      <nav
        aria-label="Profile Sections"
        className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-panel p-1 sm:p-1.5 shadow-xs"
      >
        {tabs.map((tab) => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              className={`flex items-center justify-center gap-1 sm:gap-2 rounded-xl px-1.5 sm:px-3 py-2 text-xs font-semibold transition-all duration-200 select-none ${
                isActive
                  ? 'bg-paper text-white shadow-xs'
                  : 'text-fog hover:bg-slate-100/80 hover:text-paper'
              }`}
            >
              <TabIcon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan' : 'text-fog'
                }`}
              />
              <span className="truncate">
                {tab.id === 'places' ? (
                  <>
                    <span className="sm:hidden">Places</span>
                    <span className="hidden sm:inline">Saved Places</span>
                  </>
                ) : tab.id === 'preferences' ? (
                  <>
                    <span className="sm:hidden">Prefs</span>
                    <span className="hidden sm:inline">Preferences</span>
                  </>
                ) : (
                  tab.label
                )}
              </span>
            </button>
          )
        })}
      </nav>

      {/* TAB CONTENT: Account */}
      {activeTab === 'account' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* Identity & Credentials Card */}
          <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <SoftSquircle size="md" tone="teal">
                <IconUser className="h-5 w-5" />
              </SoftSquircle>
              <div>
                <h2 className="text-base font-bold text-paper">Rider Credentials</h2>
                <p className="text-xs text-fog">
                  Personal profile and anonymous reporting ID
                </p>
              </div>
            </div>

            <div className="divide-y divide-line rounded-xl border border-line bg-page">
              {/* Display Name Row */}
              <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-fog">
                    Display Name
                  </span>
                  <span className="text-sm font-bold text-paper truncate block">{user.name}</span>
                </div>
                {!editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setName(user.name)
                      setEditing(true)
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-paper hover:border-fog transition"
                  >
                    <IconEdit className="h-3 w-3 text-fog" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* Rider Code Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 p-3.5 sm:p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-fog">
                      Rider Code
                    </span>
                    <span className="font-mono text-xs font-bold text-teal">
                      {user.id ? riderCode(user.id) : '—'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-fog leading-relaxed">
                    Used to identify flood hazard reports while keeping your personal identity private.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="self-start sm:self-center shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-paper hover:border-fog transition"
                >
                  {copiedId ? (
                    <>
                      <IconCheck className="h-3.5 w-3.5 text-ok" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <IconCopy className="h-3.5 w-3.5 text-fog" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* Profile Photo Row */}
              <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-fog">
                    Profile Avatar
                  </span>
                  <p className="text-xs text-fog">
                    {user.photo ? 'Custom photo attached' : 'Default initials avatar'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-paper hover:border-fog transition">
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        upload(e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {user.photo && (
                    <button
                      type="button"
                      onClick={() => setUser({ ...user, photo: undefined })}
                      className="rounded-lg border border-transparent px-2 py-1.5 text-xs font-semibold text-l3 hover:bg-rose-50 transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Cloud Continuity / Google Link */}
          <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <SoftSquircle size="md" tone="neutral">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </SoftSquircle>
              <div>
                <h2 className="text-base font-bold text-paper">Cloud Backup & Sync</h2>
                <p className="text-xs text-fog">
                  Preserve your profile and saved routes when switching phones
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-page p-3.5 sm:p-4">
              <GoogleLink
                user={user}
                onLink={(g) =>
                  setUser({ ...user, google: g, name: user.name || g.name })
                }
                onUnlink={() => setUser({ ...user, google: undefined })}
              />
            </div>
          </section>

          {/* Privacy & Device Storage Note */}
          <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3">
              <SoftSquircle size="sm" tone="teal">
                <IconShield className="h-4 w-4" />
              </SoftSquircle>
              <h3 className="text-sm font-bold text-paper">Local-First Storage</h3>
            </div>
            <p className="text-xs text-fog leading-relaxed">
              Your navigation routes, home and work locations, and hazard sensitivity preferences are stored locally on your device for immediate offline safety.
            </p>
          </section>
        </div>
      )}

      {/* TAB CONTENT: Vehicle */}
      {activeTab === 'vehicle' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* Active Vehicle Summary Card */}
          <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SoftSquircle size="lg" tone="teal">
                  <ActiveVehicleIcon className="h-6 w-6 text-teal" />
                </SoftSquircle>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fog">
                    Selected Vehicle
                  </span>
                  <h2 className="text-lg font-bold text-paper">
                    {VEHICLES[s.vehicle].label}
                  </h2>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  TOLERANCE[avoid].color
                }`}
              >
                {TOLERANCE[avoid].badge}
              </span>
            </div>

            <p className="text-xs text-fog leading-relaxed">
              {VEHICLES[s.vehicle].note}
            </p>

            {/* Vehicle Selector Options */}
            <div className="space-y-2 pt-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-fog">
                Choose Mode of Transportation
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(VEHICLES) as Vehicle[]).map((v) => {
                  const isSelected = s.vehicle === v
                  const VIcon = VEHICLE_ICONS[v]
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => update({ vehicle: v, avoidOverride: null })}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-teal bg-teal/5 ring-1 ring-teal/30 shadow-xs'
                          : 'border-line bg-page hover:border-fog/50'
                      }`}
                    >
                      <SoftSquircle
                        size="md"
                        tone={isSelected ? 'teal' : 'neutral'}
                        className="shrink-0"
                      >
                        <VIcon className="h-5 w-5" />
                      </SoftSquircle>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-paper">
                            {VEHICLES[v].label}
                          </span>
                          {isSelected && (
                            <IconCheck className="h-4 w-4 text-teal" />
                          )}
                        </div>
                        <span className="mt-0.5 block truncate text-xs text-fog">
                          Default avoids level {VEHICLES[v].avoid}+
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          {/* Water Clearance & Tolerance */}
          <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <SoftSquircle size="md" tone="neutral">
                <IconShield className="h-5 w-5" />
              </SoftSquircle>
              <div>
                <h2 className="text-base font-bold text-paper">
                  Water Avoidance Sensitivity
                </h2>
                <p className="text-xs text-fog">
                  Threshold at which routes are detoured around water
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {([1, 2, 3] as const).map((lvl) => {
                const isSelected = avoid === lvl
                const info = TOLERANCE[lvl]
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setAvoid(lvl)}
                    className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? 'border-teal bg-teal/5 ring-1 ring-teal/40'
                        : 'border-line bg-page hover:border-fog/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-paper">
                          Level {lvl}
                        </span>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-teal" />
                        )}
                      </div>
                      <p className="text-xs font-semibold text-paper leading-snug">
                        {info.title}
                      </p>
                      <p className="mt-1 text-[11px] text-fog leading-relaxed">
                        {info.body}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="rounded-xl border border-line/60 bg-slate-50 p-3 text-xs text-fog leading-relaxed">
              <span className="font-semibold text-paper">Safety Rule:</span> Water
              categories reflect sensor contact points and community reports, not a
              guarantee of road passability. When in doubt, turn around.
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT: Saved Places */}
      {activeTab === 'places' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3">
              <SoftSquircle size="md" tone="teal">
                <IconPin className="h-5 w-5" />
              </SoftSquircle>
              <div>
                <h2 className="text-base font-bold text-paper">Saved Places</h2>
                <p className="text-xs text-fog">
                  Quick one-tap destinations stored locally on your device
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Home Place Card */}
              <div className="rounded-2xl border border-line bg-page p-3.5 sm:p-4 transition hover:border-fog/40">
                <div className="mb-2 flex items-center gap-2">
                  <SoftSquircle size="xs" tone="neutral">
                    <IconHome className="h-3.5 w-3.5 text-paper" />
                  </SoftSquircle>
                  <span className="text-xs font-bold uppercase tracking-wider text-fog">
                    Primary Residence
                  </span>
                </div>
                <SavedPlaceEditor
                  kind="home"
                  hideTitle={true}
                  value={s.home}
                  onSave={(p) =>
                    update(
                      p
                        ? { home: p.name ?? '', homePlace: p }
                        : { home: '', homePlace: null },
                    )
                  }
                />
              </div>

              {/* Work / School Place Card */}
              <div className="rounded-2xl border border-line bg-page p-3.5 sm:p-4 transition hover:border-fog/40">
                <div className="mb-2 flex items-center gap-2">
                  <SoftSquircle size="xs" tone="neutral">
                    <IconBriefcase className="h-3.5 w-3.5 text-paper" />
                  </SoftSquircle>
                  <span className="text-xs font-bold uppercase tracking-wider text-fog">
                    Workplace or School
                  </span>
                </div>
                <SavedPlaceEditor
                  kind="work"
                  hideTitle={true}
                  value={s.work}
                  onSave={(p) =>
                    update(
                      p
                        ? { work: p.name ?? '', workPlace: p }
                        : { work: '', workPlace: null },
                    )
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border border-line/60 bg-slate-50 p-3 text-xs text-fog">
              💡 Tip: Saved locations appear immediately when planning routes on
              the <span className="font-semibold text-paper">Ride</span> and{' '}
              <span className="font-semibold text-paper">Navigate</span> screens.
            </div>
          </section>
        </div>
      )}

      {/* TAB CONTENT: Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* Quick Preferences Overview Card */}
          <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <SoftSquircle size="md" tone="teal">
                <IconSliders className="h-5 w-5" />
              </SoftSquircle>
              <div>
                <h2 className="text-base font-bold text-paper">
                  Active Ride Preferences
                </h2>
                <p className="text-xs text-fog">
                  Overview of current routing, voice and hazard detection settings
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-line bg-page p-3.5">
                <div>
                  <span className="block text-xs font-semibold text-paper">
                    Voice Guidance
                  </span>
                  <span className="text-xs text-fog">Turn-by-turn prompts</span>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    s.voice
                      ? 'bg-teal/10 text-teal'
                      : 'bg-slate-200/60 text-fog'
                  }`}
                >
                  {s.voice ? 'Active' : 'Muted'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-line bg-page p-3.5">
                <div>
                  <span className="block text-xs font-semibold text-paper">
                    Predictive Detours
                  </span>
                  <span className="text-xs text-fog">Historical flood models</span>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    s.predictiveRouting !== false
                      ? 'bg-teal/10 text-teal'
                      : 'bg-slate-200/60 text-fog'
                  }`}
                >
                  {s.predictiveRouting !== false ? 'Enabled' : 'Off'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-line bg-page p-3.5">
                <div>
                  <span className="block text-xs font-semibold text-paper">
                    Nearby Alerts
                  </span>
                  <span className="text-xs text-fog">
                    {s.nearbyNotify ? `${s.nearbyRadiusM}m radius` : 'Disabled'}
                  </span>
                </div>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                    s.nearbyNotify
                      ? 'bg-teal/10 text-teal'
                      : 'bg-slate-200/60 text-fog'
                  }`}
                >
                  {s.nearbyNotify ? 'Monitoring' : 'Off'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-line bg-page p-3.5">
                <div>
                  <span className="block text-xs font-semibold text-paper">
                    Map Appearance
                  </span>
                  <span className="text-xs text-fog">Cartography theme</span>
                </div>
                <span className="rounded-lg bg-slate-200/60 px-2.5 py-1 text-xs font-bold text-paper capitalize">
                  {s.mapStyle} mode
                </span>
              </div>
            </div>
          </section>

          {/* Full Settings Direct Jump */}
          <button
            type="button"
            onClick={onSettings}
            className="group flex w-full items-center gap-3.5 sm:gap-4 rounded-2xl border border-line bg-panel p-4 sm:p-5 text-left transition hover:border-fog hover:shadow-xs active:scale-[0.99]"
          >
            <SoftSquircle
              size="lg"
              tone="neutral"
              className="group-hover:border-teal/40 group-hover:bg-teal/10 transition-colors"
            >
              <IconSettings className="h-5 w-5 sm:h-6 sm:w-6 text-paper group-hover:text-teal transition-transform duration-500 group-hover:rotate-45" />
            </SoftSquircle>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-paper">
                All App Settings & Diagnostics
              </h3>
              <p className="mt-0.5 text-xs text-fog leading-relaxed">
                Hardware telemetry, notification permissions, offline safety guides,
                developer tools, and data management.
              </p>
            </div>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-slate-100 text-fog group-hover:bg-teal group-hover:text-white transition-colors">
              <IconChevronRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

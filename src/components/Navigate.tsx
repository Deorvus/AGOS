import { useEffect, useId, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as maplibregl from 'maplibre-gl'
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet'
import 'maplibre-gl/dist/maplibre-gl.css'

// Ensure MapLibre Web Worker loads reliably in Vite dev server, prod builds, and Capacitor Android
if (typeof window !== 'undefined') {
  try {
    const base = import.meta.env.BASE_URL || '/'
    const cleanBase = base.endsWith('/') ? base : `${base}/`
    maplibregl.setWorkerUrl(`${cleanBase}maplibre-gl-worker.mjs`)
  } catch {
    // ignore
  }
}
import { LEVELS, PLACES, type Level, type Node } from '../data/sensors'
import { avoidLevel, savedPlace, type Settings } from '../data/user'
import {
  getDeviceLocation,
  locationError,
  startDeviceLocationWatch,
  isLocationGranted,
  requestLocationPermission,
} from '../data/device-location'
import LocationSheet, { locationAllowed } from './LocationSheet'
import PlaceDetails from './PlaceDetails'
import { CATEGORIES, findNearby, type Category, type Poi } from '../data/nearby'
import { FLOOD_RADIUS, distM, evaluate, geocode, planRoutes, rank, type LatLng, type RawRoute, type Step, type Suggestion, setSearchNear } from '../data/routing'
import { stationState, WATER_LABELS, formatTime, type Snapshot } from '../data/monitoring'

// Same status colours as floodwatchz.pages.dev (domain.js COLORS)
const HEX = ['#168260', '#9b7000', '#ca5b13', '#c13c49']
const GLYPH = ['✓', '≈', '!', '✕']

// Agos map palette: soft paper land, clear blue water, green arterials, so flood colours stand out
const PALETTE = {
  light: { land: '#f3f1ea', water: '#a6d8e6', park: '#d5ead0', building: '#e6e2d8', major: '#8cc0a5', minor: '#ffffff', casing: '#d3cfc4' },
  dark: { land: '#16232c', water: '#0e3a4f', park: '#1b3329', building: '#1f2e38', major: '#2f6b57', minor: '#2a3a45', casing: '#0f1a21' },
}
function restyle(gl: any, mode: 'light' | 'dark') {
  const c = PALETTE[mode]
  const set = (id: string, prop: string, v: string) => {
    try {
      gl.setPaintProperty(id, prop, v)
    } catch {}
  }
  for (const l of gl.getStyle().layers as { id: string; type: string }[]) {
    const id = l.id
    if (l.type === 'background') set(id, 'background-color', c.land)
    else if (l.type === 'fill' && /water|ocean|lake|river/.test(id)) set(id, 'fill-color', c.water)
    else if (l.type === 'line' && /waterway|river/.test(id)) set(id, 'line-color', c.water)
    else if (l.type === 'fill' && /park|grass|wood|forest|cemetery|pitch/.test(id)) set(id, 'fill-color', c.park)
    else if (l.type === 'fill' && /building/.test(id)) set(id, 'fill-color', c.building)
    else if (l.type === 'fill-extrusion') set(id, 'fill-extrusion-color', c.building)
    else if (l.type === 'line' && /(highway|road|bridge|tunnel)/.test(id) && !/rail|path|track|pedestrian|label|shield/.test(id)) {
      const major = /motorway|trunk|primary/.test(id)
      set(id, 'line-color', /casing/.test(id) ? c.casing : major ? c.major : c.minor)
    }
  }
}

// Pin marker: round badge with a tail, like a dropped map pin
const pin = (fill: string, glyph: string, size = 34, ring = '#fff') =>
  L.divIcon({
    className: 'fw-pin',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -size - 6],
    html: `<div style="--c:${fill};--s:${size}px;--r:${ring}"><b>${glyph}</b></div>`,
  })
const infoCard = (accent: string, title: string, sub: string, meta: string, foot: string) =>
  `<div class="fw-card" style="--c:${accent}"><p class="t">${title}</p><p class="s">${sub}</p><p class="m">${meta}</p><p class="f">${foot}</p></div>`
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000)
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`
}
// Google Maps–style vector street map (OpenFreeMap, keyless): crisp labels, road hierarchy, 3D-free and fast
const STYLES = { light: 'https://tiles.openfreemap.org/styles/liberty', dark: 'https://tiles.openfreemap.org/styles/dark' }
const TILES = {
  // Raster fallback underneath the vector map (Esri, keyless)
  light: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
}
type Place = { name: string; lat: number; lng: number }
type Report = { at: LatLng; level: Level; time: number }
const GPS = 'My location'
const SIM_STEP = 45 // metres advanced per demo tick

const mins = (s: number) => `${Math.max(1, Math.round(s / 60))} min`
const km = (m: number) => `${(m / 1000).toFixed(1)} km`
const dist = (m: number) => (m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`)
const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}

const ARROWS: Record<string, string> = {
  left: '←', right: '→', 'slight left': '↖', 'slight right': '↗', 'sharp left': '↙', 'sharp right': '↘', uturn: '↶', straight: '↑',
}
function arrow(s?: Step) {
  if (!s) return '↑'
  if (s.type === 'arrive') return '⚑'
  if (s.type === 'roundabout' || s.type === 'rotary') return '⟳'
  return ARROWS[s.modifier ?? 'straight'] ?? '↑'
}
function instruction(s: Step) {
  const onto = s.name ? ` onto ${s.name}` : ''
  switch (s.type) {
    case 'depart': return `Head out${s.name ? ` on ${s.name}` : ''}`
    case 'arrive': return 'Arrive at your destination'
    case 'roundabout':
    case 'rotary': return `At the roundabout, take exit ${s.exit ?? 1}${onto}`
    case 'merge': return `Merge${onto}`
    case 'fork': return `Keep ${(s.modifier ?? 'straight').replace('slight ', '')}${s.name ? ` toward ${s.name}` : ''}`
    case 'on ramp': return `Take the ramp${onto}`
    case 'off ramp': return `Take the exit${onto}`
    case 'end of road': return `At the end of the road, turn ${s.modifier}${onto}`
    case 'continue':
    case 'new name': return `Continue ${s.modifier && s.modifier !== 'straight' ? s.modifier : 'straight'}${s.name ? ` on ${s.name}` : ''}`
    default: return s.modifier === 'uturn' ? `Make a U-turn${onto}` : `Turn ${s.modifier ?? 'straight'}${onto}`
  }
}

function nearestIdx(coords: LatLng[], p: LatLng) {
  let best = 0
  let bd = Infinity
  coords.forEach((c, i) => {
    const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2
    if (d < bd) (bd = d), (best = i)
  })
  return best
}
const bearing = (a: LatLng, b: LatLng) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <b className="font-bold text-paper">{text.slice(i, i + q.length)}</b>
      {text.slice(i + q.length)}
    </>
  )
}

function PlacePicker({ dot, value, onPick, allowGps, placeholder, saved = [] }: { saved?: Place[]; dot: string; value: Place | null; onPick: (p: Place | null) => void; allowGps?: boolean; placeholder: string }) {
  const [q, setQ] = useState('')
  const pickerId=useId()
  const [activeOption,setActiveOption]=useState(-1)
  const [searchError,setSearchError]=useState(false)
  const [open, setOpen] = useState(false)
  const [remote, setRemote] = useState<Suggestion[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return (setRemote([]), setBusy(false))
    setBusy(true);setSearchError(false)
    let live = true
    const t = setTimeout(
      () =>
        geocode(term)
          .then((r) => live && setRemote(r))
          .catch(() => { if(live){setRemote([]);setSearchError(true)} })
          .finally(() => live && setBusy(false)),
      300,
    )
    return () => ((live = false), clearTimeout(t))
  }, [q])

  const term = q.trim()
  const stored: Suggestion[] = saved.filter(p => p.name.toLowerCase().includes(term.toLowerCase())).map(p => ({...p,detail:'Saved place'}))
  const landmarks: Suggestion[] = term ? PLACES.filter(p => p.name.toLowerCase().includes(term.toLowerCase()) && !stored.some(s => s.name === p.name)).map(p => ({...p,detail:'Suggested landmark'})) : []
  const local = [...stored,...landmarks]
  const options: Suggestion[] = [...(allowGps && !term ? [{ name: GPS, lat: 0, lng: 0 }] : []), ...local, ...remote.filter((r) => !local.some((l) => l.name === r.name))]

  return (
    <div className="relative min-w-0 w-full">
      <label className="flex min-w-0 w-full items-center gap-3 rounded-xl bg-page px-4 py-3 ring-1 ring-transparent transition focus-within:bg-ink focus-within:ring-teal">
        <span className={`h-3 w-3 shrink-0 ${dot}`} />
        <input
          value={open ? q : (value?.name ?? '')}
          onFocus={() => (setOpen(true), setQ(''))}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {setQ(e.target.value);setActiveOption(-1);onPick(null)}}
          onKeyDown={e => {
            if(e.key === 'Escape') {setOpen(false);setActiveOption(-1)}
            if((e.key === 'ArrowDown' || e.key === 'ArrowUp') && options.length) {e.preventDefault();setActiveOption(n=>e.key==='ArrowDown'?(n+1)%options.length:(n<=0?options.length-1:n-1))}
            if(e.key === 'Enter' && options[activeOption>=0?activeOption:0]) {e.preventDefault();onPick(options[activeOption>=0?activeOption:0]);setOpen(false);(e.target as HTMLInputElement).blur()}
          }}
          role="combobox" aria-expanded={open} aria-controls={pickerId} aria-autocomplete="list" aria-activedescendant={open && activeOption>=0 ? `${pickerId}-${activeOption}` : undefined}
          aria-label={placeholder}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          className="w-full min-w-0 flex-1 bg-transparent text-base font-semibold outline-none placeholder:font-medium placeholder:text-fog/70 sm:text-lg"
        />
        {open && busy && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-teal" aria-label="Searching" />}
      </label>
      {open && (options.length > 0 || term.length >= 2) && (
        <ul id={pickerId} role="listbox" aria-label={`${placeholder} suggestions`} className="animate-fade-in absolute inset-x-0 top-full z-[1000] mt-2 max-h-80 overflow-auto rounded-xl border border-line bg-panel py-2 shadow-2xl">
          {options.map((p,i) => (
            <li id={`${pickerId}-${i}`} role="option" aria-selected={i===activeOption} key={p.name + p.lat + p.lng}>
              <button onMouseDown={e=>e.preventDefault()} onClick={() => {onPick({name:p.name,lat:p.lat,lng:p.lng});setOpen(false)}} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-page">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${p.name === GPS ? 'bg-teal/10 text-teal' : 'bg-page text-fog'}`}>{p.name === GPS ? '◉' : '⌖'}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block break-words ${p.name === GPS ? 'font-semibold text-teal' : 'text-fog'}`}>
                    {p.name === GPS ? GPS : <Highlight text={p.detail && p.name.endsWith(', '+p.detail) ? p.name.slice(0,-p.detail.length-2) : p.name} q={term} />}
                  </span>
                  {p.detail && <span className="mt-0.5 block break-words text-xs text-fog">{p.detail}</span>}
                </span>
              </button>
            </li>
          ))}
          {!busy && term.length >= 2 && options.length === 0 && <li className="px-4 py-3 text-sm text-fog">{searchError ? 'Place search unavailable. Check your connection and try again.' : `No places found for "${term}"`}</li>}
          {busy && options.length === 0 && <li className="px-4 py-3 text-sm text-fog">Searching…</li>}
        </ul>
      )}
    </div>
  )
}

const card = 'pointer-events-auto rounded-2xl bg-panel shadow-[0_16px_40px_-16px_rgba(16,43,59,0.45)] ring-1 ring-line/70'

export type Trip = { from: Place | null; to: Place; autoPlan?: boolean; evacuation?: boolean }

export default function Navigate({
  nodes,
  settings,
  trip,
  demo = false,
  active = true,
  snapshot,
  now = Date.now(),
}: {
  nodes: Node[]
  settings: Settings
  trip?: Trip | null
  demo?: boolean
  active?: boolean
  snapshot?: Snapshot
  now?: number
}) {
  const avoid = avoidLevel(settings)
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map>(null)
  const sensorLayer = useRef<L.LayerGroup>(null)
  const routeLayer = useRef<L.LayerGroup>(null)
  const meMarker = useRef<L.Marker>(null)
  const [selectedStation, setSelectedStation] = useState<Node | null>(null)
  const [showLegend, setShowLegend] = useState(false)

  const stationNode = useMemo(() => nodes.find((n) => n.source === 'station'), [nodes])
  const prototypeStation = snapshot?.data?.stations?.find(
    (s) => s.station_code === 'QC-001' || s.id === 'e9b020e8-af79-44f7-b690-4a44bf0f6b0a',
  ) ?? snapshot?.data?.stations?.[0]
  const prototypeStatus = useMemo(() => {
    if (prototypeStation) {
      return stationState(prototypeStation, now, !!snapshot?.error || snapshot?.cached)
    }
    return stationNode?.stationStatus ?? { label: 'Receiving', current: true }
  }, [prototypeStation, now, snapshot?.error, snapshot?.cached, stationNode])

  const home = savedPlace(settings, 'home')
  const work = savedPlace(settings, 'work')
  const [from, setFrom] = useState<Place | null>(trip ? trip.from : home)
  const [to, setTo] = useState<Place | null>(trip?.to ?? work)
  const [raw, setRaw] = useState<RawRoute[]>([])
  const [picked, setPicked] = useState<LatLng[] | null>(null) // coords identity of the chosen route
  const [stage, setStage] = useState<'plan' | 'preview' | 'nav'>('plan')
  const [panelExpanded, setPanelExpanded] = useState(Boolean(trip?.to))
  useEffect(() => {
    if (trip?.to) setPanelExpanded(true)
  }, [trip?.to])
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<'location' | 'routes'>('routes')
  const task = useRef<AbortController | null>(null)
  const startInput = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [me, setMe] = useState<LatLng | null>(null)
  const [heading, setHeading] = useState(0)
  const [speed, setSpeed] = useState<number | null>(null)
  const [mode, setMode] = useState<'gps' | 'sim'>('sim')
  const [follow, setFollow] = useState(true)
  const [voice, setVoice] = useState(settings.voice)
  const [notice, setNotice] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [askLoc, setAskLoc] = useState(false)
  const [cat, setCat] = useState<Category | null>(null)
  const [spot, setSpot] = useState<Poi | null>(null)
  const [pois, setPois] = useState<Poi[]>([])
  const [poiState, setPoiState] = useState<'idle' | 'loading' | 'error'>('idle')
  const poiLayer = useRef<L.LayerGroup>(null)
  const warned = useRef(new Set<string>())
  const spoken = useRef(new Set<number>())
  const simDist = useRef(0)
  const lastReroute = useRef(0)

  // Re-evaluated on every sensor tick, so the recommendation follows rising water
  const routes = useMemo(() => {
    const seen = new Set<string>()
    return raw
      .map((r) => evaluate(r, nodes))
      .sort(rank)
      .filter((r) => {
        const k = `${Math.round(r.distance / 200)}-${r.worst}`
        return seen.has(k) ? false : (seen.add(k), true)
      })
      .slice(0, 3)
  }, [raw, nodes])
  const fastest = useMemo(() => [...routes].sort((a, b) => a.duration - b.duration)[0], [routes])
  const sel = routes.find((r) => r.coords === picked) ?? routes[0]

  // Cumulative distance + step positions along the selected route
  const geo = useMemo(() => {
    if (!sel) return null
    const cum = [0]
    for (let i = 1; i < sel.coords.length; i++) cum.push(cum[i - 1] + distM(sel.coords[i - 1], sel.coords[i]))
    return { cum, stepIdx: sel.steps.map((s) => nearestIdx(sel.coords, s.loc)) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel?.coords])

  // Progress along the route
  const prog = useMemo(() => {
    if (!sel || !geo || !me) return null
    const idx = nearestIdx(sel.coords, me)
    const done = geo.cum[idx]
    const total = geo.cum[geo.cum.length - 1]
    let k = geo.stepIdx.findIndex((si, i) => i > 0 && si > idx)
    if (k < 0) k = sel.steps.length - 1
    return {
      off: distM(me, sel.coords[idx]),
      remaining: Math.max(0, total - done),
      left: (sel.duration * Math.max(0, total - done)) / Math.max(1, total),
      k,
      toNext: Math.max(0, geo.cum[geo.stepIdx[k]] - done),
    }
  }, [sel, geo, me])

  // Map init
  useEffect(() => {
    if (!mapEl.current || map.current) return
    const m = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView(trip?.evacuation ? [trip.to.lat, trip.to.lng] : [14.66, 121.045], 12)
    // Esri basemaps: keyless and not referrer-blocked (OSM's own servers block embedded previews)
    const styleKey = settings.mapStyle === 'dark' ? 'dark' : 'light'
    L.tileLayer(TILES[styleKey], {
      attribution: '© OpenFreeMap © OpenStreetMap · Esri',
      maxZoom: styleKey === 'dark' ? 16 : 19,
    }).addTo(m)
    try {
      const gl = maplibreGL({ style: STYLES[styleKey] }).addTo(m)
      const glMap = gl.getMaplibreMap()
      glMap.on('error', (err: unknown) => {
        console.warn('MapLibre GL layer notice:', err)
      })
      glMap.on('style.load', () => restyle(glMap, styleKey))
    } catch (e) {
      console.warn('MapLibre layer failed to initialize, continuing with raster basemap:', e)
    }
    routeLayer.current = L.layerGroup().addTo(m)
    sensorLayer.current = L.layerGroup().addTo(m)
    poiLayer.current = L.layerGroup().addTo(m)
    m.on('dragstart', () => setFollow(false))
    m.on('moveend', () => setSearchNear([m.getCenter().lat, m.getCenter().lng]))
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // Sensors + rider reports
  useEffect(() => {
    const g = sensorLayer.current
    if (!g) return
    g.clearLayers()
    nodes.forEach((n) => {
      if (n.level >= avoid)
        L.circle([n.lat, n.lng], { radius: FLOOD_RADIUS, color: HEX[n.level], weight: 1, fillOpacity: 0.2, className: 'animate-pulse' }).addTo(g)
      const rider = n.area === 'Rider report'
      const isStation = n.source === 'station'
      const marker = L.marker([n.lat, n.lng], {
        icon: pin(
          HEX[n.level],
          isStation ? '≋' : rider ? '◎' : GLYPH[n.level],
          isStation ? 36 : n.level > 0 ? 34 : 26,
          isStation ? (prototypeStatus.current ? '#007a85' : '#b45309') : '#fff',
        ),
        title: isStation ? 'Agos ESP32 Prototype · Click to view station data' : n.name,
      })

      if (isStation) {
        marker.on('click', () => {
          setSelectedStation(n)
        })
      }

      const cardHtml = infoCard(
        HEX[n.level],
        isStation ? `ESP32 Station · ${prototypeStatus.label}` : rider ? `Flooding · ${LEVELS[n.level].short}` : LEVELS[n.level].label,
        n.name,
        isStation
          ? `${n.stationLocationName || 'New Zealand Street, Deparo, Caloocan'}<br>Status: <strong>${prototypeStatus.label}</strong><br>Water: ${LEVELS[n.level].label}<br>Rain: ${n.rain === null ? 'unknown' : n.rain ? 'detected' : 'not detected'}`
          : rider ? `User-submitted · this device only<br>${ago(n.updated)}` : `Demonstration point · fixed sample value<br>Rain: ${n.rain === null ? 'unknown' : n.rain ? 'detected' : 'not detected'}`,
        isStation
          ? `Status: ${prototypeStatus.label} · Physical prototype hardware`
          : rider ? 'Unverified local report. Not a sensor measurement.' : 'Fixed illustrative category. Not actual road conditions.',
      )

      marker
        .bindPopup(
          isStation
            ? `<div class="station-popup-wrap">${cardHtml}<button type="button" class="agos-open-station-btn" style="margin-top:8px;display:block;width:100%;padding:7px 10px;background:#007a85;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;text-align:center;">Inspect Station Data ↗</button></div>`
            : cardHtml,
          { className: 'fw-popup', closeButton: true, maxWidth: 280 },
        )
        .on('popupopen', (e) => {
          if (isStation) {
            const btn = e.popup.getElement()?.querySelector('.agos-open-station-btn')
            if (btn) {
              btn.addEventListener('click', (ev) => {
                ev.stopPropagation()
                setSelectedStation(n)
                marker.closePopup()
              })
            }
          }
        })
        .addTo(g)
    })
    reports.forEach((r) =>
      L.marker(r.at, { icon: pin('#fff', GLYPH[r.level], 30, HEX[r.level]) })
        .bindPopup(infoCard(HEX[r.level], `Quick report · ${LEVELS[r.level].short}`, 'Your report', `Marked at ${clock(r.time)}`, LEVELS[r.level].rider), { className: 'fw-popup', maxWidth: 280 })
        .addTo(g),
    )
  }, [nodes, reports, avoid])

  // Routes: alternates only while choosing; the active route alone while navigating
  useEffect(() => {
    const g = routeLayer.current
    if (!g || !map.current) return
    g.clearLayers()
    if (stage === 'plan') return
    if (stage === 'preview') {
      routes.forEach((r) => {
        if (r === sel) return
        // Base alternate route polyline
        L.polyline(r.coords, { color: '#9fb3bd', weight: 7, opacity: 0.85 })
          .on('click', () => setPicked(r.coords))
          .addTo(g)

        // Highlight predicted flood-prone segments in a distinct color along suggested alternative routes
        r.predictedSegments?.forEach((seg) => {
          // Distinct hazard casing for contrast on alternate routes
          L.polyline(seg.coords, {
            color: '#c2410c',
            weight: 9,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round',
          })
            .on('click', () => setPicked(r.coords))
            .addTo(g)

          // Distinct safety orange core line
          L.polyline(seg.coords, {
            color: '#ea580c',
            weight: 6,
            opacity: 1,
            lineCap: 'round',
            lineJoin: 'round',
          })
            .on('click', () => setPicked(r.coords))
            .addTo(g)

          // Dashed accent stripe
          L.polyline(seg.coords, {
            color: '#ffedd5',
            weight: 2.5,
            dashArray: '5, 5',
            opacity: 1,
            lineCap: 'round',
          })
            .bindTooltip(
              `⚡ Predicted flood-prone corridor on alternative route: <strong>${seg.zone.name}</strong><br><span class="text-[11px] text-amber-100">${seg.zone.typicalDepth} · ${seg.zone.historicalCause}</span><br><em class="text-[10px] text-teal-200">Click to switch to this route</em>`,
              { direction: 'top', className: 'font-semibold text-xs leading-snug', sticky: true },
            )
            .on('click', () => setPicked(r.coords))
            .addTo(g)
        })
      })
    }
    if (sel) {
      L.polyline(sel.coords, { color: '#0b4f9c', weight: 11, lineCap: 'round', lineJoin: 'round' }).addTo(g)
      L.polyline(sel.coords, { color: '#1a73e8', weight: 7, lineCap: 'round', lineJoin: 'round' }).addTo(g)
      // Flooded stretches painted over the route, like traffic colouring
      nodes
        .filter((n) => n.level > 0)
        .forEach((n) => {
          let run: LatLng[] = []
          const flush = () => (run.length > 1 && L.polyline(run, { color: HEX[n.level], weight: 7, lineCap: 'round' }).addTo(g), (run = []))
          sel.coords.forEach((c) => (distM(c, [n.lat, n.lng]) < FLOOD_RADIUS ? run.push(c) : flush()))
          flush()
        })
      // Distinct predicted flood-prone segment highlight along the active route
      sel.predictedSegments?.forEach((seg) => {
        // High-contrast casing
        L.polyline(seg.coords, {
          color: '#7c2d12',
          weight: 12,
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 0.95,
        }).addTo(g)
        // Distinct hazard color: Vibrant safety orange (#ea580c)
        L.polyline(seg.coords, {
          color: '#ea580c',
          weight: 8,
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 1,
        }).addTo(g)
        // Warning dash accent
        L.polyline(seg.coords, {
          color: '#fef08a',
          weight: 3,
          dashArray: '6, 6',
          lineCap: 'round',
          opacity: 1,
        })
          .bindTooltip(
            `⚡ Predicted Flood-Prone Segment: <strong>${seg.zone.name}</strong><br><span class="text-[11px] text-amber-100">${seg.zone.typicalDepth} · ${seg.zone.historicalCause}</span>`,
            { direction: 'top', className: 'font-semibold text-xs leading-snug', sticky: true },
          )
          .addTo(g)
      })
      // Highlight historical flood zones crossing or near this route (area circle)
      sel.predictedHotspots?.forEach((h) => {
        L.circle([h.lat, h.lng], {
          radius: 260,
          color: '#d97706',
          weight: 2,
          dashArray: '5, 5',
          fillColor: '#f59e0b',
          fillOpacity: 0.15,
        })
          .bindTooltip(`⚡ Historical Flood Hazard: ${h.name} (${h.typicalDepth})`, {
            direction: 'top',
            className: 'text-xs font-semibold',
          })
          .addTo(g)
      })
      const end = sel.coords[sel.coords.length - 1]
      L.circleMarker(end, { radius: 9, color: '#fff', weight: 3, fillColor: '#102b3b', fillOpacity: 1 }).addTo(g)
    }
  }, [routes, sel, stage, nodes])

  // Rider arrow
  useEffect(() => {
    if (!map.current) return
    if (!me) return void meMarker.current?.remove()
    if (!meMarker.current)
      meMarker.current = L.marker(me, {
        interactive: false,
        icon: L.divIcon({
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          html: '<div style="transition:transform .4s"><svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="17" fill="#067a85" stroke="#fff" stroke-width="3"/><path d="M20 9 27 28 20 24 13 28Z" fill="#fff"/></svg></div>',
        }),
      })
    meMarker.current.setLatLng(me).addTo(map.current)
    const el = meMarker.current.getElement()?.firstElementChild as HTMLElement | null
    if (el) el.style.transform = `rotate(${heading}deg)`
  }, [me, heading])

  // Camera follow while navigating
  useEffect(() => {
    const m = map.current
    if (stage !== 'nav' || !follow || !me || !m) return
    // Heading-up: aim the camera ahead of the rider so their arrow sits in the lower third
    const ahead = innerHeight * 0.22
    const rad = (heading * Math.PI) / 180
    const p = m.project(me, 17).add(L.point(Math.sin(rad) * ahead, -Math.cos(rad) * ahead))
    m.setView(m.unproject(p, 17), 17, { animate: true })
  }, [me, follow, stage, heading])

  // Rotate the whole map so the direction of travel always points up
  const headingUp = stage === 'nav' && follow
  // Unwrapped angle so 359° → 1° turns 2°, not a full spin
  const spin = useRef(0)
  spin.current += ((((heading - spin.current) % 360) + 540) % 360) - 180
  useEffect(() => {
    map.current?.invalidateSize({ pan: false })
  }, [headingUp])

  const fit = (rs: { coords: LatLng[] }[]) => {
    if (!map.current || !rs.length) return
    const wide = innerWidth >= 640
    map.current.fitBounds(L.latLngBounds(rs.flatMap((x) => x.coords)), {
      paddingTopLeft: wide ? [470, 40] : [24, 120],
      paddingBottomRight: wide ? [60, 40] : [24, Math.round(innerHeight * 0.5)],
    })
  }

  const resolve = (p: Place, signal: AbortSignal): Promise<LatLng> =>
    p.name !== GPS ? Promise.resolve([p.lat,p.lng]) : getDeviceLocation(signal)

  const cancelPlan = () => { task.current?.abort(); setLoading(false); setError('Request cancelled. Choose a starting point or try again.') }
  const manualStart = () => { task.current?.abort(); setLoading(false); setError('Choose your starting point below.'); setFrom(null); setMe(null); startInput.current?.querySelector('input')?.focus() }
  useEffect(() => {
    if (active) { const frame = requestAnimationFrame(() => map.current?.invalidateSize({pan:false})); return () => cancelAnimationFrame(frame) }
    task.current?.abort(); setLoading(false); setAskLoc(false); window.speechSynthesis?.cancel()
  }, [active])
  useEffect(() => () => task.current?.abort(), [])

  // Opened from a Ride check: go straight to route options
  useEffect(() => {
    if (trip && trip.autoPlan !== false) plan()
  }, [])

  // Nearby stops: search around the start point, flag ones near a flooded sensor
  async function browse(c: Category) {
    setSpot(null)
    if (cat === c) return (setCat(null), setPois([]))
    setCat(c)
    setPoiState('loading')
    try {
      const c0 = map.current!.getCenter()
      if (from?.name === GPS && !me) throw new Error('Choose a starting point first')
      const at: LatLng = from ? from.name === GPS ? me! : [from.lat,from.lng] : [c0.lat, c0.lng]
      setPois(await findNearby(c, at))
      setPoiState('idle')
    } catch {
      setPois([])
      setPoiState('error')
    }
  }
  const floodNear = (p: Poi) => Math.max(0, ...nodes.filter((n) => distM([n.lat, n.lng], [p.lat, p.lng]) < FLOOD_RADIUS * 2).map((n) => n.level)) as Level

  useEffect(() => {
    const g = poiLayer.current
    if (!g) return
    g.clearLayers()
    if (stage !== 'plan' || !cat) return
    pois.forEach((p) =>
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: spot?.id === p.id ? `<div style="display:grid;place-items:center;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg) scale(1.35);background:#d93025;border:2px solid #fff;font-size:14px;font-weight:800;color:#fff;box-shadow:0 6px 14px rgba(0,0,0,.35)"><span style="transform:rotate(45deg)">${CATEGORIES[cat].icon}</span></div>` : `<div style="display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#fff;border:2px solid #007a85;font-size:14px;font-weight:800;color:#007a85;box-shadow:0 4px 10px rgba(0,0,0,.3)">${CATEGORIES[cat].icon}</div>` }),
      })
        .bindTooltip(p.name)
        .on('click', () => openPoi(p))
        .addTo(g),
    )
    if (pois.length && !spot) map.current?.fitBounds(L.latLngBounds(pois.map((p) => [p.lat, p.lng])), { padding: [40, 40], paddingTopLeft: [0, innerHeight * 0.45], maxZoom: 16 })
  }, [pois, cat, stage, spot])

  function openPoi(p: Poi) {
    setSpot(p)
    map.current?.flyTo([p.lat, p.lng], 17, { duration: 0.6 })
  }

  function goToPoi(p: Poi) {
    setSpot(null)
    const dest = { name: p.name, lat: p.lat, lng: p.lng }
    setTo(dest)
    plan(undefined, dest)
  }

  async function plan(start?: LatLng, dest?: Place) {
    const to_ = dest ?? to
    if (!from || !to_) return
    task.current?.abort()
    const c = new AbortController(); task.current = c
    setLoading(true)
    setPhase(!start && (from.name === GPS || to_.name === GPS) ? 'location' : 'routes')
    setError('')
    try {
      const [a, b] = await Promise.all([start ?? resolve(from,c.signal), resolve(to_,c.signal)])
      if (c.signal.aborted) return
      setPhase('routes')
      const r = await planRoutes(a, b, nodes, avoid, c.signal, settings.predictiveRouting !== false)
      if (c.signal.aborted) return
      if (!r.length) throw new Error('No route found')
      setRaw(r)
      setPicked(null)
      if (!start) {
        setStage('preview')
        fit(r)
        if (from.name === GPS) setMe(a)
      }
    } catch (e) {
      if (!c.signal.aborted) setError((e as Error).message)
    } finally {
      if (task.current === c) setLoading(false)
    }
  }

  function startNav(m: 'gps' | 'sim') {
    if (!sel) return
    warned.current.clear()
    spoken.current = new Set([0])
    simDist.current = 0
    setPicked(sel.coords)
    setMode(m)
    setFollow(true)
    setNotice('')
    setStage('nav')
    setMe(m === 'sim' ? sel.coords[0] : null) // Never present a route point as a real GPS position.
    if (voice) speak(`${instruction(sel.steps[0])}. ${sel.hits.length ? 'There is flooding reported on this route.' : 'No reports nearby. Road conditions are unknown.'}`)
  }

  function endNav(msg = '') {
    setStage('preview')
    setReporting(false)
    setSpeed(null)
    setNotice(msg)
    if (sel) fit([sel])
  }

  // Live GPS tracking
  useEffect(() => {
    if (!active || stage !== 'nav' || mode !== 'gps') return
    let prev: LatLng | null = null
    const clearWatch = startDeviceLocationWatch(
      (pos) => {
        const cur: LatLng = [pos.latitude, pos.longitude]
        if (pos.heading != null && !Number.isNaN(pos.heading)) setHeading(pos.heading)
        else if (prev && distM(prev, cur) > 3) setHeading(bearing(prev, cur))
        setSpeed(pos.speed != null ? pos.speed * 3.6 : null)
        prev = cur
        setMe(cur)
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true },
    )
    return clearWatch
  }, [stage, mode, active])

  // Simulated ride along the selected route (for demos without moving)
  useEffect(() => {
    if (!active || stage !== 'nav' || mode !== 'sim' || !sel || !geo) return
    const t = setInterval(() => {
      const total = geo.cum[geo.cum.length - 1]
      simDist.current += SIM_STEP
      if (simDist.current >= total) return endNav('Demo finished: you have arrived.')
      let i = geo.cum.findIndex((c) => c > simDist.current)
      if (i < 1) i = 1
      const [a, b] = [sel.coords[i - 1], sel.coords[i]]
      const f = (simDist.current - geo.cum[i - 1]) / Math.max(1, geo.cum[i] - geo.cum[i - 1])
      setHeading(bearing(a, b))
      setMe([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
    }, 500)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, mode, sel?.coords, geo, active])

  // Spoken turn instructions, arrival and off-route recalculation
  useEffect(() => {
    if (!active || stage !== 'nav' || !prog || !sel) return
    const step = sel.steps[prog.k]
    if (step && prog.toNext < 220 && !spoken.current.has(prog.k)) {
      spoken.current.add(prog.k)
      if (voice) speak(step.type === 'arrive' ? 'Your destination is ahead.' : `In ${dist(prog.toNext)}, ${instruction(step)}`)
    }
    if (mode === 'gps' && prog.remaining < 30) {
      if (voice) speak('You have arrived.')
      endNav('You have arrived.')
    }
    if (mode === 'gps' && prog.off > 80 && me && Date.now() - lastReroute.current > 15000) {
      lastReroute.current = Date.now()
      setNotice('Off route. Recalculating…')
      if (voice) speak('Recalculating.')
      plan(me).then(() => (spoken.current = new Set([0])))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prog, stage])

  // Proximity flood warnings
  useEffect(() => {
    if (stage !== 'nav' || !me || !sel) return
    sel.hits.forEach((n) => {
      const d = distM(me, [n.lat, n.lng])
      const key = `${n.id}-${n.level}`
      if (d < 800 && !warned.current.has(key)) {
        warned.current.add(key)
        const msg = `Reported category ${LEVELS[n.level].label} ahead at ${n.name}, ${dist(d)}. ${LEVELS[n.level].rider}`
        setNotice(msg)
        if (voice) speak(msg)
      }
    })
  }, [me, sel, stage, voice])

  // Automatic reroute when the chosen route floods
  useEffect(() => {
    if (!picked || !sel || sel.worst < avoid || routes[0].worst >= sel.worst) return
    const msg = `A reported category changed near ${sel.hits.find((h) => h.level >= avoid)?.name}. Switching to an alternative with fewer reported warnings.`
    setPicked(routes[0].coords)
    setNotice(msg)
    if (voice && stage === 'nav') speak(msg)
  }, [routes, sel, picked, voice, stage, avoid])

  const status = (r: typeof sel) =>
    r.worst >= avoid
      ? 'Meets avoidance preference'
      : r.worst > 0
        ? 'Reported category nearby'
        : r.isPredictiveAlternative
          ? 'Suggested alternative · avoids historical basin'
          : r.predictedHotspots && r.predictedHotspots.length > 0
            ? `Historical flood hazard (${r.predictedHotspots[0].name.split('·')[0].trim()})`
            : 'No reports nearby · conditions unknown'
  const rerouted =
    sel &&
    fastest &&
    sel !== fastest &&
    (fastest.worst > sel.worst ||
      (fastest.worst === sel.worst &&
        fastest.predictiveRisk === 'High' &&
        sel.predictiveRisk !== 'High'))

  function report(level: Level) {
    if (!me) return
    setReports((r) => [...r, { at: me, level, time: Date.now() }])
    setReporting(false)
    setNotice(`Report saved for this map session only. ${LEVELS[level].label} water reported here.`)
  }

  return (
    <div className="relative isolate h-full overflow-hidden bg-panel">
      <div
        style={headingUp ? { transform: `translate(-50%, -50%) rotate(${-spin.current}deg)` } : undefined}
        className={headingUp ? 'absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] transition-transform duration-700 ease-out' : 'h-full w-full'}
      >
        <div ref={mapEl} className="h-full w-full" />
      </div>
      {askLoc && (
        <LocationSheet
          onGranted={() => (setAskLoc(false), startNav('gps'))}
          onDemo={() => (setAskLoc(false), startNav('sim'))}
          onClose={() => setAskLoc(false)}
        />
      )}

      {/* Map controls */}
      {stage !== 'nav' && (
        <div className="absolute bottom-24 right-3 z-[510] flex flex-col items-center gap-3 sm:bottom-6 sm:right-5">
          <button
            onClick={async () => {
              if (me) {
                map.current?.flyTo(me, 16)
                return
              }
              const granted = await isLocationGranted()
              if (!granted) {
                setAskLoc(true)
                return
              }
              task.current?.abort()
              const c = new AbortController()
              task.current = c
              setLoading(true)
              setPhase('location')
              setError('')
              try {
                const at = await getDeviceLocation(c.signal)
                if (!c.signal.aborted) {
                  setMe(at)
                  map.current?.flyTo(at, 16)
                }
              } catch (e) {
                if (!c.signal.aborted) setError((e as Error).message)
              } finally {
                if (task.current === c) setLoading(false)
              }
            }}
            aria-label="Show my location"
            className="grid h-12 w-12 place-items-center rounded-full bg-panel text-xl text-teal shadow-lg ring-1 ring-line transition active:scale-95"
          >
            ⌖
          </button>
          <div className="flex flex-col overflow-hidden rounded-full bg-panel shadow-lg ring-1 ring-line">
            <button onClick={() => map.current?.zoomIn()} aria-label="Zoom in" className="grid h-12 w-12 place-items-center text-2xl text-paper active:bg-page">+</button>
            <span className="mx-3 h-px bg-line" />
            <button onClick={() => map.current?.zoomOut()} aria-label="Zoom out" className="grid h-12 w-12 place-items-center text-2xl text-paper active:bg-page">−</button>
          </div>
        </div>
      )}

      {/* Map legend */}
      {stage !== 'nav' && (
        <div className="absolute right-3 top-20 z-[400] flex flex-col items-end gap-1.5 sm:right-4 sm:top-24">
          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            aria-label="Toggle map legend and prototype status"
            aria-expanded={showLegend}
            className="flex items-center gap-1.5 rounded-full border border-line bg-panel/95 px-3 py-1.5 text-xs font-bold text-paper shadow-md backdrop-blur transition active:scale-95 sm:hidden"
          >
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-teal text-[9px] text-white">≋</span>
            <span>Legend</span>
            <span
              className={`h-2 w-2 rounded-full ${
                prototypeStatus.current
                  ? 'bg-teal animate-pulse'
                  : prototypeStatus.label === 'Stale'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
          </button>

          <div
            className={`${
              showLegend ? 'flex' : 'hidden'
            } w-64 flex-col gap-2 rounded-2xl border border-line bg-panel/95 p-3.5 text-xs font-semibold text-fog shadow-xl backdrop-blur sm:flex`}
          >
            <div className="flex items-center justify-between pb-1 border-b border-line/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-paper">Map Legend</span>
              <span className="text-[10px] text-fog">Roads & Sensors</span>
            </div>
            {([0, 1, 2, 3] as const).map((l) => (
              <span key={l} className="flex items-center gap-2">
                <i className={`h-2.5 w-2.5 rounded-full ${LEVELS[l].color}`} />
                <span className="text-paper">{LEVELS[l].label}</span>
                <span className="ml-auto text-[10px] text-fog">{LEVELS[l].short}</span>
              </span>
            ))}
            <span className="flex items-center gap-2 border-t border-line/60 pt-1.5 text-orange-600">
              <span className="h-2 w-4 rounded-sm bg-[#ea580c] shadow-sm" />
              <span>Predicted flood-prone</span>
            </span>

            {/* Prototype Station in Legend reflecting real prototype status */}
            <div className="border-t border-line/60 pt-1.5">
              <button
                type="button"
                onClick={() => {
                  const targetNode = stationNode || nodes.find((n) => n.source === 'station')
                  if (targetNode) {
                    map.current?.flyTo([targetNode.lat, targetNode.lng], 16, { duration: 0.6 })
                    setSelectedStation(targetNode)
                  }
                }}
                className="group flex w-full flex-col gap-1 rounded-xl bg-page/60 p-2 text-left transition hover:bg-page cursor-pointer ring-1 ring-line/50 hover:ring-teal/50"
                aria-label="Agos ESP32 Prototype station: tap to see live station data"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="flex items-center gap-1.5 font-bold text-paper">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-teal text-[10px] text-white">≋</span>
                    <span>ESP32 Prototype</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      prototypeStatus.current
                        ? 'bg-teal/15 text-teal ring-1 ring-teal/30'
                        : prototypeStatus.label === 'Stale'
                        ? 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30'
                        : 'bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        prototypeStatus.current
                          ? 'bg-teal animate-pulse'
                          : prototypeStatus.label === 'Stale'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    {prototypeStatus.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-fog">
                  <span className="truncate max-w-[130px]">{stationNode?.stationLocationName ? 'Deparo, Caloocan' : 'New Zealand St'}</span>
                  <span className="font-semibold text-paper">
                    {stationNode ? LEVELS[stationNode.level].short : 'BELOW LOW'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-teal group-hover:underline">
                  Tap to see station data ↗
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Station Data Modal / Sheet */}
      {selectedStation && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedStation(null)
          }}
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs overflow-y-auto pb-[calc(5rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom,0px)))] sm:pb-5 animate-fade-in"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="station-dialog-title"
            className="relative flex flex-col w-full max-w-md rounded-2xl border border-line bg-panel shadow-2xl animate-fade-up max-h-[78dvh] sm:max-h-[74vh] overflow-hidden"
          >
            {/* Header: fixed / shrink-0 */}
            <div className="shrink-0 flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-3.5 bg-panel">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal text-base text-white font-bold shadow-sm">
                  ≋
                </span>
                <div className="min-w-0">
                  <h3 id="station-dialog-title" className="truncate text-base font-extrabold text-paper sm:text-lg">
                    {selectedStation.name}
                  </h3>
                  <p className="truncate text-[11px] text-fog">
                    {selectedStation.stationCode || 'QC-001'} · ESP32 IoT Monitoring Station
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStation(null)}
                aria-label="Close station data"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-page text-xs font-bold text-fog transition hover:border-fog hover:text-paper active:scale-95"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body: flexible, scrollable, with compact telemetry stats */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3">
              {/* Hardware & connectivity status badge */}
              <div className="flex items-center justify-between rounded-xl bg-page/70 p-2.5 ring-1 ring-line/60">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      prototypeStatus.current
                        ? 'bg-teal animate-pulse'
                        : prototypeStatus.label === 'Stale'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="truncate text-xs font-semibold text-paper">
                    Hardware Status: <strong className="text-paper">{prototypeStatus.label}</strong>
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    prototypeStatus.current
                      ? 'bg-teal/15 text-teal ring-1 ring-teal/30'
                      : prototypeStatus.label === 'Stale'
                      ? 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30'
                      : 'bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30'
                  }`}
                >
                  {prototypeStatus.current ? 'Live Telemetry' : prototypeStatus.label}
                </span>
              </div>

              {/* Sensor readings telemetry grid */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-page/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-fog">Water Level</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${LEVELS[selectedStation.level].color}`} />
                    <span className="text-base font-extrabold text-paper">
                      {LEVELS[selectedStation.level].label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-fog leading-relaxed">
                    {WATER_LABELS[selectedStation.level]}
                  </p>
                </div>

                <div className="rounded-xl border border-line bg-page/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-fog">Rain Sensor</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-base leading-none">{selectedStation.rain ? '☂' : '☼'}</span>
                    <span className="text-base font-extrabold text-paper">
                      {selectedStation.rain ? 'Detected' : 'Not detected'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-fog leading-relaxed">
                    {selectedStation.rain
                      ? 'Precipitation active at station.'
                      : 'No rain contact currently registered.'}
                  </p>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-line bg-page/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-fog">Location & Coordinates</p>
                  <p className="mt-1 text-xs font-semibold text-paper break-words">
                    {selectedStation.stationLocationName || 'New Zealand Street, Deparo, Caloocan'}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-fog">
                    Lat: {selectedStation.lat.toFixed(6)} · Lng: {selectedStation.lng.toFixed(6)}
                  </p>
                </div>

                <div className="sm:col-span-2 rounded-xl border border-line bg-page/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-fog">Timestamp & Observation Age</p>
                  <p className="mt-1 text-xs font-semibold text-paper">
                    {formatTime(selectedStation.updated)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-fog">
                    Age: {ago(selectedStation.updated)}
                  </p>
                </div>
              </div>
            </div>

            {/* Station Action Buttons: Dedicated sticky footer so it is ALWAYS visible and never cut off */}
            <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-panel px-4 py-3 sm:px-5 sm:py-3.5">
              <button
                type="button"
                onClick={() => {
                  map.current?.flyTo([selectedStation.lat, selectedStation.lng], 17, { duration: 0.6 })
                  setSelectedStation(null)
                }}
                className="rounded-xl border border-line bg-page px-3.5 py-2 text-xs font-semibold text-paper transition hover:border-fog active:scale-95"
              >
                ⌖ Center Map Here
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetDest = {
                    name: `Station: ${selectedStation.stationLocationName || selectedStation.name}`,
                    lat: selectedStation.lat,
                    lng: selectedStation.lng,
                  }
                  setTo(targetDest)
                  setSelectedStation(null)
                  plan(undefined, targetDest)
                }}
                className="rounded-xl bg-teal px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#005c66] active:scale-95"
              >
                ➤ Navigate to Station
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-[500] flex min-w-0 flex-col gap-3 overflow-y-auto p-3 pt-[calc(var(--safe-top)+0.75rem)] pl-[max(0.75rem,var(--safe-area-inset-left,env(safe-area-inset-left,0px)))] pr-[max(0.75rem,var(--safe-area-inset-right,env(safe-area-inset-right,0px)))] sm:w-[460px] sm:gap-4 sm:p-5 sm:pt-[calc(var(--safe-top)+1.25rem)]">
        <details className="pointer-events-auto shrink-0 self-start rounded-xl border border-line bg-white/95 px-3 py-2 text-xs text-paper shadow-md backdrop-blur">
          <summary className="min-h-6 cursor-pointer font-semibold text-xs flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#9bb5c4]" />
            <span>{demo ? 'Demo map — sample readings only' : 'Current road conditions unknown'}</span>
          </summary>
          <p className="mt-2 text-[11px] leading-relaxed text-fog max-w-xs">
            No deployed sensor coverage. Local reports are unverified. Nearby reports use an illustrative 300 m proximity rule, not a measured flood boundary. No route is guaranteed safe.
          </p>
        </details>

        {/* ---------- PLAN: where to? ---------- */}
        {stage === 'plan' && spot && <PlaceDetails poi={spot} flood={floodNear(spot)} onGo={() => goToPoi(spot)} onClose={() => setSpot(null)} />}

        {/* Compact bottom sheet trigger when collapsed on small screens */}
        {stage === 'plan' && !spot && !panelExpanded && (
          <div className="pointer-events-auto mt-auto flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/95 p-3.5 shadow-xl backdrop-blur sm:hidden animate-fade-in">
            <button
              onClick={() => setPanelExpanded(true)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal text-white text-xs font-bold shadow-sm">
                {to ? '⚑' : '➤'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-paper">
                  {to ? to.name : 'Where to?'}
                </span>
                <span className="block truncate text-xs text-fog">
                  {from ? `From ${from.name}` : 'Tap to search destinations & plan trip'}
                </span>
              </span>
            </button>
            <button
              onClick={() => setPanelExpanded(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#005c66] active:scale-95"
            >
              <span>Plan route</span>
              <span>▲</span>
            </button>
          </div>
        )}

        {stage === 'plan' && !spot && (
          <section
            className={`${card} ${
              !panelExpanded ? 'hidden sm:block' : ''
            } mt-auto max-h-[75dvh] overflow-y-auto min-w-0 shrink-0 p-4 sm:mt-0 sm:max-h-none sm:p-6 animate-fade-up`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-line sm:border-0 sm:pb-0 sm:mb-0">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl text-paper">
                Where to?
              </h2>
              <button
                onClick={() => setPanelExpanded(false)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-semibold text-fog hover:text-paper sm:hidden ml-auto"
                aria-label="Collapse panel to view map"
              >
                <span>Map view</span>
                <span>▼</span>
              </button>
            </div>
            {trip?.evacuation && to && to.name === trip.to.name && to.lat === trip.to.lat && to.lng === trip.to.lng && <p className="mt-2 text-sm leading-relaxed text-fog">Evacuation site selected: <strong className="break-words">{to.name}</strong>. Choose your starting point. Confirm the center is open and follow local evacuation instructions; this map point may not be its entrance.</p>}
            <p className="mt-1 hidden text-sm text-fog sm:block">Routes are compared with sample points or local reports. Road safety is not established.</p>
            <div ref={startInput} className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-center gap-2 sm:mt-5">
              <div className="grid min-w-0 flex-1 gap-2">
                <PlacePicker saved={[home,work].filter((p): p is Place => !!p)} dot="rounded-full border-[3px] border-teal" value={from} onPick={setFrom} allowGps placeholder="Starting point" />
                <PlacePicker saved={[home,work].filter((p): p is Place => !!p)} dot="rounded-sm bg-l3" value={to} onPick={setTo} placeholder="Search a destination" />
              </div>
              <button
                onClick={() => (setFrom(to), setTo(from))}
                aria-label="Swap start and destination"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-panel text-fog hover:text-paper"
              >
                ⇅
              </button>
            </div>
            <div className="-mx-1 mt-3 flex flex-wrap gap-2 px-1 sm:mt-4">
              {[
                { label: '⌂ Home', p: home },
                { label: '◧ Work', p: work },
                { label: '◉ From my location', p: { name: GPS, lat: 0, lng: 0 } },
              ].filter(x => x.p).map(({ label, p }) => (
                <button
                  key={label}
                  onClick={() => (p && (p.name === GPS ? setFrom(p) : setTo(p)))}
                  className="shrink-0 rounded-full border border-line px-4 py-2 text-sm font-semibold text-fog transition hover:border-fog hover:text-paper"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => plan()}
              disabled={loading || !from || !to}
              className="mt-4 w-full rounded-xl bg-teal py-3.5 text-lg sm:mt-6 sm:py-4 font-bold text-white transition hover:bg-[#005c66] disabled:opacity-50"
            >
              {loading ? phase === 'location' ? 'Getting your location…' : 'Calculating routes…' : 'Find routes'}
            </button>
            <p role="status" aria-live="polite" className="mt-2 text-sm text-fog">{loading ? phase === 'location' ? 'Waiting up to 20 seconds for your device. You can cancel and enter a place instead.' : 'Contacting the route service…' : ''}</p>
            {loading && <button onClick={cancelPlan} className="mt-2 min-h-11 rounded-xl border border-line px-4">Cancel request</button>}
            {(loading || error || from?.name === GPS) && <button onClick={manualStart} className="mt-2 min-h-11 w-full rounded-xl border border-line px-4 font-semibold text-teal">Enter starting point manually</button>}
            {error && <p role="alert" className="mt-3 rounded-xl bg-l3/10 px-4 py-3 text-sm font-semibold text-l3">{error}</p>}
            <button onClick={() => { task.current?.abort();setLoading(false);setFrom(null);setTo(null);setRaw([]);setPicked(null);setMe(null);setError('');setSpot(null) }} className="mt-2 min-h-11 text-sm font-semibold text-fog">New trip</button>

            {/* Nearby rider stops */}
            <div className="mt-5 border-t border-line pt-4">
              <p className="px-1 text-xs font-bold uppercase tracking-widest text-fog">Nearby{from ? ` ${from.name === GPS ? 'you' : from.name}` : ''}</p>
              <div className="-mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
                {(Object.keys(CATEGORIES) as Category[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => browse(c)}
                    aria-pressed={cat === c}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${cat === c ? 'border-teal bg-teal text-white' : 'border-line text-fog hover:border-fog hover:text-paper'}`}
                  >
                    <span className="text-base leading-none">{CATEGORIES[c].icon}</span>
                    {CATEGORIES[c].label}
                  </button>
                ))}
              </div>
              {cat && (
                <div className="animate-fade-up mt-2 max-h-[34vh] overflow-y-auto">
                  {poiState === 'loading' && <p className="px-1 py-3 text-sm text-fog">Looking for {CATEGORIES[cat].label.toLowerCase()} within 3 km…</p>}
                  {poiState === 'error' && <p className="px-1 py-3 text-sm font-semibold text-l3">Couldn't load nearby places. Tap the chip to retry.</p>}
                  {poiState === 'idle' && pois.length === 0 && <p className="px-1 py-3 text-sm text-fog">Nothing mapped within 3 km.</p>}
                  <ul className="divide-y divide-line">
                    {poiState === 'idle' &&
                      pois.map((p) => {
                        const lv = floodNear(p)
                        return (
                          <li key={p.id}>
                            <button onClick={() => openPoi(p)} className="flex w-full items-center gap-3 px-1 py-3 text-left transition hover:bg-page">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal/10 text-teal">{CATEGORIES[cat].icon}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block break-words font-semibold">{p.name}</span>
                                <span className="mt-0.5 block truncate text-xs text-fog">
                                  {dist(p.dist)}
                                  {p.open ? ` · ${p.open}` : ''}
                                </span>
                              </span>
                              {lv > 0 && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${LEVELS[lv].color}`}>{LEVELS[lv].short}</span>}
                              <span className="shrink-0 text-lg text-fog">›</span>
                            </button>
                          </li>
                        )
                      })}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---------- PREVIEW: choose a route ---------- */}
        {stage === 'preview' && sel && (
          <>
            <button onClick={() => setStage('plan')} className={`${card} flex shrink-0 items-center gap-4 px-5 py-4 text-left`}>
              <span className="text-xl text-fog">←</span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm text-fog">From: {from?.name}</span>
                <span className="mt-2 block break-words text-base font-bold">To: {to?.name}</span>
              </span>
              <span className="text-sm font-semibold text-teal">Edit</span>
            </button>

            <section className={`${card} mt-auto flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden sm:mt-0`}>
              <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-line sm:hidden" />
              <div className="min-h-0 overflow-auto p-5 sm:p-6">
                {notice && <p className="mb-4 rounded-xl bg-page px-4 py-3 text-sm font-semibold">{notice}</p>}
                <div className="flex items-baseline gap-3">
                  <p className={`text-4xl font-extrabold tracking-tight ${LEVELS[sel.worst >= avoid ? 3 : sel.worst].text}`}>{mins(sel.duration)}</p>
                  <p className="text-lg text-fog">({km(sel.distance)})</p>
                </div>
                <p className="mt-2 leading-relaxed text-fog">
                  {sel.worst >= avoid
                    ? `Every evaluated option meets your avoidance preference near ${sel.hits.filter((h) => h.level >= avoid).map((h) => h.name).join(', ')}. Do not assume these route options are safe. Follow official advisories.`
                    : rerouted
                      ? `Fastest option has a reported category near ${fastest.hits.filter((h) => h.level >= avoid).map((h) => h.name).join(', ')}. This route adds ${mins(sel.duration - fastest.duration)}.`
                      : sel.hits.length
                        ? `Reported category near ${sel.hits.map((h) => h.name).join(', ')}. Passability is not established.`
                        : 'No reports nearby. Sensor coverage is unavailable; road conditions are unknown.'}
                </p>

                {sel.isPredictiveAlternative && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-teal/40 bg-teal/5 p-3 text-xs leading-relaxed text-teal">
                    <span className="text-base leading-none">🛡️</span>
                    <div>
                      <strong className="block font-bold">Predictive Detour Proactively Suggested</strong>
                      <span>
                        Bypasses historical flood basin {sel.detourAround?.replace('Historical: ', '')} based on NDRRMC & MMDA flood records before live reports are created.
                      </span>
                    </div>
                  </div>
                )}

                {!sel.isPredictiveAlternative && sel.predictiveRisk !== 'Low' && (
                  <div className={`mt-3 flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${
                    sel.predictiveRisk === 'High'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-900'
                      : 'border-blue-500/30 bg-blue-500/5 text-fog'
                  }`}>
                    <span className="text-base leading-none">⚡</span>
                    <div>
                      <strong className="block font-bold">
                        Historical Flood Vulnerability ({sel.predictiveRisk} Risk · {sel.confidenceScore}% confidence)
                      </strong>
                      <span>{sel.predictiveAdvisory}</span>
                    </div>
                  </div>
                )}

                {routes.some((r) => r.predictedSegments?.length > 0) && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3.5 py-2 text-xs font-semibold text-orange-800">
                    <span className="h-2.5 w-5 shrink-0 rounded-sm bg-[#ea580c] shadow-sm" />
                    <span>Predicted flood-prone segments highlighted in distinct orange on map</span>
                  </div>
                )}

                <ul className="mt-4 grid min-w-0 grid-cols-1 gap-2.5">
                  {routes.map((r, i) => (
                    <li key={i} className="min-w-0">
                      <button
                        onClick={() => (setPicked(r.coords), fit([r]))}
                        className={`flex w-full min-w-0 items-center gap-2 rounded-xl border p-3 text-left transition ${r === sel ? 'border-teal bg-teal/5 shadow-[inset_0_0_0_1px_var(--color-teal)]' : 'border-line hover:border-fog'}`}
                      >
                        <i className={`h-11 w-1.5 shrink-0 rounded-full ${LEVELS[r.worst].color}`} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5 font-bold">
                            {r === fastest ? 'Fastest' : r.detourAround ? `Avoids ${r.detourAround.replace('Historical: ', '')}` : 'Alternate'}
                            {i === 0 && <span className="rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ok">Compared first</span>}
                            {r.isPredictiveAlternative && (
                              <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[10px] font-bold text-teal">
                                🛡️ Predictive detour
                              </span>
                            )}
                            {r.predictedSegments?.length > 0 && (
                              <span className="rounded-full bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                                ⚡ {r.predictedSegments.length} predicted hazard segment{r.predictedSegments.length > 1 ? 's' : ''}
                              </span>
                            )}
                            {r.predictiveRisk === 'High' && !r.predictedSegments?.length && (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                ⚡ Historical risk
                              </span>
                            )}
                          </span>
                          <span className={`mt-1 block break-words text-sm ${r.worst >= avoid ? 'text-l3' : 'text-fog'}`}>
                            {status(r)}
                            {r.hits.length > 0 && ` · ${r.hits.map((h) => h.name).join(', ')}`}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-bold">{mins(r.duration)}</span>
                          <span className="block text-xs text-fog">{km(r.distance)}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 grid grid-cols-[1fr_auto] gap-2.5">
                  <button onClick={async () => ((await locationAllowed()) ? startNav('gps') : setAskLoc(true))} className="rounded-xl bg-teal py-4 text-lg font-bold text-white transition hover:bg-[#005c66]">
                    ▲ Start
                  </button>
                  <button onClick={() => startNav('sim')} className="rounded-xl border border-line px-5 font-semibold transition hover:border-fog">
                    Demo ride
                  </button>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-fog">Roads with no reading may still be flooded. Watch the road ahead.</p>
              </div>
            </section>
          </>
        )}

        {/* ---------- NAV: turn-by-turn ---------- */}
        {stage === 'nav' && sel && prog && (
          <>
            <section className="pointer-events-auto overflow-hidden rounded-2xl bg-navy text-white shadow-2xl">
              <div className="flex items-center gap-5 p-5">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-navy-2 text-5xl leading-none text-cyan">{arrow(sel.steps[prog.k])}</span>
                <div className="min-w-0">
                  <p className="text-4xl font-extrabold leading-none tracking-tight">{dist(prog.toNext)}</p>
                  <p className="mt-2 text-lg font-semibold leading-snug">{sel.steps[prog.k] ? instruction(sel.steps[prog.k]) : 'Continue'}</p>
                </div>
              </div>
              {sel.steps[prog.k + 1] && (
                <p className="flex items-center gap-3 bg-navy-2 px-5 py-2.5 text-sm text-[#b9ccd6]">
                  Then <span className="text-lg text-white">{arrow(sel.steps[prog.k + 1])}</span>
                  <span className="truncate">{sel.steps[prog.k + 1].name || instruction(sel.steps[prog.k + 1])}</span>
                </p>
              )}
            </section>

            {notice && (
              <button role="alert" onClick={() => setNotice('')} className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-l2 p-4 text-left font-bold leading-snug text-ink shadow-xl">
                <span className="text-2xl leading-none">⚠</span>
                <span className="flex-1">{notice}</span>
              </button>
            )}

            <div className="mt-auto flex items-end justify-between gap-3">
              <span className="pointer-events-auto grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-panel text-center shadow-xl ring-1 ring-line">
                <span>
                  <span className="block text-2xl font-extrabold leading-none">{mode === 'sim' ? 'DEMO' : speed != null ? Math.round(speed) : '–'}</span>
                  {mode === 'gps' && <span className="text-[10px] font-semibold text-fog">km/h</span>}
                </span>
              </span>
              <div className="flex flex-col items-end gap-2.5">
                {!follow && (
                  <button onClick={() => setFollow(true)} className="pointer-events-auto rounded-full bg-panel px-5 py-3 font-bold text-teal shadow-xl ring-1 ring-line">
                    ◎ Re-center
                  </button>
                )}
                <button
                  onClick={() => setReporting(!reporting)}
                  className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-l1 text-2xl text-ink shadow-xl"
                  aria-label="Report flooding here"
                >
                  ≋
                </button>
              </div>
            </div>

            <section className={`${card} p-5`}>
              {reporting ? (
                <>
                  <p className="font-bold">How deep is the water here?</p>
                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    {([1, 2, 3] as const).map((l) => (
                      <button key={l} onClick={() => report(l)} className={`rounded-xl py-3.5 font-bold text-ink ${LEVELS[l].color}`}>
                        {LEVELS[l].short.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-4">
                  <button onClick={() => endNav()} aria-label="End navigation" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-l3/10 text-xl font-bold text-l3 transition hover:bg-l3 hover:text-ink">
                    ✕
                  </button>
                  <div className="min-w-0 flex-1 text-center">
                    <p className={`text-3xl font-extrabold leading-none tracking-tight ${sel.worst >= avoid ? 'text-l3' : 'text-ok'}`}>{mins(prog.left)}</p>
                    <p className="mt-1.5 text-sm text-fog">
                      {km(prog.remaining)} · arrive {clock(Date.now() + prog.left * 1000)}
                    </p>
                  </div>
                  <button
                    onClick={() => setVoice(!voice)}
                    aria-pressed={voice}
                    aria-label="Voice guidance"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-page text-xl"
                  >
                    {voice ? '🔊' : '🔇'}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

export type Level = 0 | 1 | 2 | 3

export type Node = {
  id: string
  name: string
  area: string
  x: number
  lat: number
  lng: number
  y: number
  level: Level
  source: 'demo' | 'community'
  rain: boolean | null
  updated: number
}

export const LEVELS: Record<Level, { label: string; short: string; depth: string; rider: string; color: string; text: string }> = {
  0: { label: 'Below LOW', short: 'BELOW LOW', depth: 'Discrete category · depth not measured', rider: 'No water contact at this monitored point. This does not establish road safety.', color: 'bg-ok', text: 'text-ok' },
  1: { label: 'LOW', short: 'LOW', depth: 'Discrete category · depth not measured', rider: 'LOW contact detected. Road passability is not established.', color: 'bg-l1', text: 'text-l1' },
  2: { label: 'MID', short: 'MID', depth: 'Discrete category · depth not measured', rider: 'MID contact detected. Use caution and follow official advisories.', color: 'bg-l2', text: 'text-l2' },
  3: { label: 'HIGH', short: 'HIGH', depth: 'Discrete category · depth not measured', rider: 'HIGH contact detected. Do not use this category as a vehicle clearance measurement.', color: 'bg-l3', text: 'text-l3' },
}

const seed: Omit<Node, 'updated'>[] = [
  { id: 'QC-01', lat: 14.6870, lng: 121.0880, name: 'Commonwealth Ave', area: 'Batasan · demo', x: 78, y: 22, level: 0, source: 'demo', rain: false },
  { id: 'QC-02', lat: 14.7280, lng: 121.0410, name: 'Quirino Hwy', area: 'Novaliches · demo', x: 40, y: 10, level: 1, source: 'demo', rain: true },
  { id: 'QC-03', lat: 14.6570, lng: 121.0200, name: 'Roosevelt Ave', area: 'SFDM · demo', x: 22, y: 55, level: 2, source: 'demo', rain: true },
  { id: 'QC-04', lat: 14.6230, lng: 121.0130, name: 'Araneta Ave', area: 'Tatalon · demo', x: 38, y: 82, level: 3, source: 'demo', rain: true },
  { id: 'QC-05', lat: 14.6300, lng: 121.0440, name: 'EDSA–Kamuning', area: 'Kamuning · demo', x: 58, y: 68, level: 1, source: 'demo', rain: true },
  { id: 'QC-06', lat: 14.6390, lng: 121.0750, name: 'Katipunan Ave', area: 'Loyola Heights · demo', x: 86, y: 62, level: 0, source: 'demo', rain: false },
]
export const DEMO_NODES: Node[] = seed.map(n => ({ ...n, updated: 0 }))

export const ROUTES = [
  { id: 'r1', name: 'Novaliches → Cubao', via: ['QC-02', 'QC-03', 'QC-05'], from: { name: 'Novaliches Bayan', lat: 14.7280, lng: 121.0410 }, to: { name: 'Araneta City, Cubao', lat: 14.6203, lng: 121.0530 } },
  { id: 'r2', name: 'Batasan → Katipunan', via: ['QC-01', 'QC-06'], from: { name: 'Batasan Complex', lat: 14.6925, lng: 121.0960 }, to: { name: 'Katipunan Ave, Loyola Heights', lat: 14.6390, lng: 121.0750 } },
  { id: 'r3', name: 'SFDM → Tatalon', via: ['QC-03', 'QC-04'], from: { name: 'San Francisco del Monte', lat: 14.6570, lng: 121.0200 }, to: { name: 'Tatalon', lat: 14.6230, lng: 121.0130 } },
]

export const PLACES = [
  { name: 'San Bartolome, Novaliches', lat: 14.7085, lng: 121.0310 },
  { name: 'SM North EDSA', lat: 14.6566, lng: 121.0296 },
  { name: 'Araneta City, Cubao', lat: 14.6203, lng: 121.0530 },
  { name: 'UP Diliman', lat: 14.6538, lng: 121.0685 },
  { name: 'Quezon Memorial Circle', lat: 14.6514, lng: 121.0494 },
  { name: 'Batasan Complex', lat: 14.6925, lng: 121.0960 },
  { name: 'Tomas Morato', lat: 14.6337, lng: 121.0336 },
]

export const HOTLINES = [
  { name: 'Emergency assistance', number: '911', source: 'https://pia.gov.ph/news/dilg-launches-unified-911-system-for-integrated-emergency-response/' },
  { name: 'Quezon City helpline', number: '122', source: 'https://quezoncity.gov.ph/program/qc-helpline-122/' },
]

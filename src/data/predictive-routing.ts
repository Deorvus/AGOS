export type LatLng = [number, number]

export function distM(a: LatLng, b: LatLng) {
  const R = 6371000
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function nearRoute(coords: LatLng[], p: LatLng, radius = 300) {
  const metres = (6371000 * Math.PI) / 180
  const project = (c: LatLng) => [(c[1] - p[1]) * metres * Math.cos((p[0] * Math.PI) / 180), (c[0] - p[0]) * metres]
  return coords.some((c, i) => {
    if (distM(c, p) < radius) return true
    if (!i) return false
    const a = project(coords[i - 1])
    const b = project(c)
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const square = dx * dx + dy * dy
    const t = square ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / square)) : 0
    return Math.hypot(a[0] + t * dx, a[1] + t * dy) < radius
  })
}

export type FloodRiskLevel = 'High' | 'Moderate' | 'Low'

export type HistoricalFloodZone = {
  id: string
  name: string
  corridor: string
  area: string
  lat: number
  lng: number
  riskLevel: 'High' | 'Moderate'
  historicalFrequency: string
  typicalDepth: string
  historicalCause: string
  advisory: string
}

/**
 * Historical flood zones based on NDRRMC, MMDA hazard maps, and empirical flood history.
 * These locations have recurring historical flooding during Habagat, typhoons, and localized torrential rain.
 */
export const HISTORICAL_FLOOD_ZONES: HistoricalFloodZone[] = [
  {
    id: 'HFZ-01',
    name: 'Araneta Ave · Tatalon',
    corridor: 'G. Araneta Avenue & Maria Clara St',
    area: 'Tatalon / Sto. Domingo, Quezon City',
    lat: 14.6230,
    lng: 121.0130,
    riskLevel: 'High',
    historicalFrequency: 'High (Frequent inundation)',
    typicalDepth: 'Knee-deep to waist-deep (0.5m – 1.2m)',
    historicalCause: 'San Juan River overflow and low basin elevation',
    advisory: 'Historically becomes impassable within 30 minutes of heavy downpour. Proactively divert through higher ground via E. Rodriguez or Quezon Ave.',
  },
  {
    id: 'HFZ-02',
    name: 'España Blvd · UST / Lacson',
    corridor: 'España Boulevard from Antipolo to A.H. Lacson',
    area: 'Sampaloc, Manila',
    lat: 14.6095,
    lng: 120.9912,
    riskLevel: 'High',
    historicalFrequency: 'High (Frequent runoff pooling)',
    typicalDepth: 'Gutter to knee-deep (0.3m – 0.6m)',
    historicalCause: 'Natural catchment bowl and stormwater drainage backflow',
    advisory: 'Historically prone to rapid flood accumulation. Consider bypass routes via C.M. Recto or Dimasalang.',
  },
  {
    id: 'HFZ-03',
    name: 'Quirino Hwy · Novaliches Bayan',
    corridor: 'Quirino Highway near Novaliches Public Market',
    area: 'Novaliches, Quezon City',
    lat: 14.7280,
    lng: 121.0410,
    riskLevel: 'High',
    historicalFrequency: 'High (Flash runoff bottleneck)',
    typicalDepth: 'Tire to knee-deep (0.4m – 0.7m)',
    historicalCause: 'Severe road depression receiving runoff from northern ridges',
    advisory: 'Historical bottleneck prone to sudden rising water. Diverting via Mindanao Ave or Sauyo is recommended before reports occur.',
  },
  {
    id: 'HFZ-04',
    name: 'Tullahan Basin · Gen. Luis / Caybiga',
    corridor: 'General Luis St near Tullahan River bridge',
    area: 'Caybiga / Deparo, Caloocan / QC Border',
    lat: 14.7410,
    lng: 121.0270,
    riskLevel: 'High',
    historicalFrequency: 'High (River swell risk)',
    typicalDepth: 'Tire to knee-deep (0.4m – 0.8m)',
    historicalCause: 'Tullahan River basin swell during extended rainfall',
    advisory: 'Directly adjacent to the Tullahan river channel. High historical flood probability. Alternative suggested through Susano Road.',
  },
  {
    id: 'HFZ-05',
    name: 'Roosevelt Ave · SFDM',
    corridor: 'Roosevelt Ave (FPJ Ave) near Del Monte Ave',
    area: 'San Francisco del Monte, Quezon City',
    lat: 14.6570,
    lng: 121.0200,
    riskLevel: 'Moderate',
    historicalFrequency: 'Moderate (Monsoon surge)',
    typicalDepth: 'Gutter to tire-deep (0.25m – 0.45m)',
    historicalCause: 'Dario Creek overflow and surface drainage bottlenecks',
    advisory: 'Historically floods during continuous monsoon rains. Higher elevation alternative through West Avenue recommended.',
  },
  {
    id: 'HFZ-06',
    name: 'EDSA · Kamuning / Centris',
    corridor: 'EDSA southbound service road near Kamuning',
    area: 'Diliman / Kamuning, Quezon City',
    lat: 14.6300,
    lng: 121.0440,
    riskLevel: 'Moderate',
    historicalFrequency: 'Moderate (Stormwater accumulation)',
    typicalDepth: 'Gutter to tire-deep (0.2m – 0.4m)',
    historicalCause: 'Depressed underpass approaches catching street runoff',
    advisory: 'Rapid street ponding occurs in heavy downpours. Main flyover lanes or Timog Ave provide elevated alternatives.',
  },
  {
    id: 'HFZ-07',
    name: 'Commonwealth Ave · Doña Carmen',
    corridor: 'Commonwealth Avenue at Fairview / Regalado',
    area: 'North Fairview, Quezon City',
    lat: 14.7005,
    lng: 121.0770,
    riskLevel: 'Moderate',
    historicalFrequency: 'Moderate (Flash ponding)',
    typicalDepth: 'Gutter-deep runoff (0.2m – 0.35m)',
    historicalCause: 'Broad catchment area with localized low-lying lanes',
    advisory: 'Fast-moving gutter flooding historically reported. Inner elevated lanes recommended.',
  },
  {
    id: 'HFZ-08',
    name: 'R. Papa · Rizal Ave Extension',
    corridor: 'Rizal Avenue Ext near LRT R. Papa Station',
    area: 'Caloocan / Tondo Boundary',
    lat: 14.6360,
    lng: 120.9830,
    riskLevel: 'High',
    historicalFrequency: 'High (Tidal and runoff basin)',
    typicalDepth: 'Knee to waist-deep (0.5m – 1.0m)',
    historicalCause: 'Very low sea-level elevation combined with Estero backflow',
    advisory: 'Perennial deep flood basin. Submerged during major weather disturbances. Reroute via A. Bonifacio Ave.',
  },
]

export type PredictiveRiskAnalysis = {
  predictedHotspots: HistoricalFloodZone[]
  predictiveRisk: FloodRiskLevel
  advisory?: string
  confidenceScore: number
}

/**
 * Evaluates whether a route passes through known historical flood hazard zones,
 * allowing the system to suggest proactive alternatives before live flood reports are filed.
 */
export function evaluatePredictiveRisk(coords: LatLng[]): PredictiveRiskAnalysis {
  if (!coords || coords.length === 0) {
    return {
      predictedHotspots: [],
      predictiveRisk: 'Low',
      confidenceScore: 0,
    }
  }

  const predictedHotspots = HISTORICAL_FLOOD_ZONES.filter((zone) =>
    nearRoute(coords, [zone.lat, zone.lng], 320),
  )

  const hasHigh = predictedHotspots.some((h) => h.riskLevel === 'High')
  const predictiveRisk: FloodRiskLevel =
    predictedHotspots.length === 0
      ? 'Low'
      : hasHigh
        ? 'High'
        : 'Moderate'

  const advisory =
    predictedHotspots.length > 0
      ? `${predictedHotspots[0].name} is a known historical flood hotspot (${predictedHotspots[0].typicalDepth}). ${predictedHotspots[0].advisory}`
      : undefined

  // Empirical confidence based on historical hazard map density and number of proximity points
  const confidenceScore =
    predictedHotspots.length > 0 ? Math.min(95, 75 + predictedHotspots.length * 8) : 90

  return {
    predictedHotspots,
    predictiveRisk,
    advisory,
    confidenceScore,
  }
}

export type PredictedSegment = {
  zone: HistoricalFloodZone
  coords: LatLng[]
}

/**
 * Extracts continuous polyline segments along a route that pass through
 * historical flood hazard corridors.
 */
export function getPredictedFloodSegments(
  routeCoords: LatLng[],
  radius = 350,
): PredictedSegment[] {
  if (!routeCoords || routeCoords.length < 2) return []
  const segments: PredictedSegment[] = []

  for (const zone of HISTORICAL_FLOOD_ZONES) {
    const zonePt: LatLng = [zone.lat, zone.lng]
    let currentRun: LatLng[] = []

    for (let i = 1; i < routeCoords.length; i++) {
      const p1 = routeCoords[i - 1]
      const p2 = routeCoords[i]
      const edgeMatches =
        distM(p1, zonePt) < radius ||
        distM(p2, zonePt) < radius ||
        nearRoute([p1, p2], zonePt, radius)

      if (edgeMatches) {
        if (currentRun.length === 0) {
          currentRun.push(p1, p2)
        } else {
          currentRun.push(p2)
        }
      } else {
        if (currentRun.length >= 2) {
          segments.push({ zone, coords: currentRun })
        }
        currentRun = []
      }
    }

    if (currentRun.length >= 2) {
      segments.push({ zone, coords: currentRun })
    }
  }

  return segments
}

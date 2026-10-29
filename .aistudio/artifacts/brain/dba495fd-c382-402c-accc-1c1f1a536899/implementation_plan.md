# Prototype Proximity Alerts & Hardware Station Intelligence

Enable proximity alerts in Agos to detect and notify riders when they are near physical monitoring prototypes (such as QC-001 in Caloocan / QC) and the live device readings meet or exceed the rider's hazard avoidance threshold, while retaining community rider report coverage.

## User Review & Critical Decisions

> [!IMPORTANT]
> Proximity alert behavior has been aligned with user specifications confirmed in Phase 1:

- **Sources Monitored**: Dual coverage. Proximity checks will actively monitor both **hardware prototype stations** (physical bench and field deployed nodes) and **community rider reports**.
- **Alert Level Threshold**: Dynamic threshold aligned with the user's selected vehicle preference (e.g., motorcycles alert on MID and HIGH, e-bikes/scooters on LOW+, SUVs on HIGH). Users can also adjust or test their radius (500m, 1km, 2km, 3km) in Settings.
- **Delivery Mechanism**: High-priority dual delivery via **in-app top alert banner** (with 12s auto-dismiss or direct navigation to Alerts) and **system local notifications** (with Android emergency channel / Web Notification API fallback).

---

## 1. Overview & Core Concept

Currently, `evaluateNearbyDetections()` strictly filters community-submitted rider reports within the user's proximity radius. Hardware monitoring stations (such as `QC-001` configured at New Zealand St, Deparo) report real-time ultrasonic and contact sensor water levels (`0: Below LOW`, `1: LOW`, `2: MID`, `3: HIGH`) through the live monitoring feed, but their telemetry is only visible on the Ride dashboard map and Monitoring bench panel.

This feature integrates live prototype telemetry directly into the proximity alert engine:
- As riders travel within the configured alert radius (default 1 km), Agos continuously calculates distance to the nearest physical prototype.
- When the prototype reports flood contact matching or exceeding the rider's avoidance profile (e.g. `MID` or `HIGH` water level), an immediate proximity alert is generated.
- The alert distinguishes between **Hardware Sensor Telemetry** (verified electronic sensor contact) and **Community Rider Reports** (unverified crowd-sourced reports) so riders know the exact provenance of the warning.
- Smart deduplication prevents notification spam: an alert fires once upon entering the radius or when the prototype's water level escalates, but does not repeatedly beep if the level remains steady.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Riding Near Active Prototype**:
   - Rider approaches within 1 km of `QC-001` (Deparo, Caloocan) while the station's latest reading is `MID`.
   - The app fires an immediate system notification: *"⚠️ Flood Alert: MID detected 850 m away at Agos Prototype QC-001 (New Zealand St, Deparo)"*.
   - If the app is foregrounded, an interactive in-app top banner slides down with high-contrast badge styling, showing distance, station code, reading level, and quick actions ("View Details", "Dismiss").
2. **Reviewing in Alert Feed**:
   - Tapping the banner or switching to the **Alerts** tab shows the prototype alert pinned at the top with a distinct "Hardware Sensor" visual chip, distinguishing it from community crowd reports.
   - Shows live telemetry details: contact status (LOW/MID/HIGH wet electrodes), sampling time, and rain detection status.
3. **Settings & Customization**:
   - In Settings under "Nearby alerts", riders can configure their notification radius (500m, 1km, 2km, 3km), toggle prototype alerts, and test delivery.

### Visual Identity & Theme

- **Aesthetic**: Functional outdoor utility, high-contrast, clean geometric lines adhering to Tailwind mobile ergonomics.
- **Color Discipline**:
  - `MID` contact: Warm warning amber/orange (`--color-l2` / `#ca5b13`)
  - `HIGH` contact: Critical alert crimson (`--color-l3` / `#c13c49`)
  - `LOW` contact: Caution gold (`--color-l1` / `#9b7000`)
  - Deep Navy background (`#102b3b`) with crisp white panels (`#ffffff`) and slate hairline borders.
- **Zero-Pill Discipline**: Metadata uses clean inline typography with middle dots (`Agos Prototype QC-001 · 850 m away · 2 min ago`) rather than bloated candy pill badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Station Coordinate Mapping**:
  - *Decision*: Prototype stations whose upstream Supabase payload has `null` coordinates are resolved using `CONFIGURED_STATION_LOCATIONS` (already established in `monitoring.ts` for QC-001). Unmapped bench units without physical coordinates are safely skipped so they never trigger false 0,0 proximity alerts.
  - *Trade-off*: Only prototypes with verified physical coordinates participate in proximity calculations, preventing ghost alerts.
- **Threshold Sensitivity vs Nuisance Alarms**:
  - *Decision*: Prototype alerts trigger when `water_level >= avoidLevel(settings)`. If a motorcycle rider's avoid level is `2` (MID), a `LOW` reading will not trigger a nuisance proximity alert, while `MID` and `HIGH` will immediately trigger.
  - *Trade-off*: Riders are protected from noise when water is below their vehicle's concern threshold, while retaining safety-critical warnings.
- **Unified Alert Model**:
  - *Decision*: Extend `NearbyAlert` with `source: 'prototype' | 'community'`, adding station code, rain status, and telemetry verification flags while maintaining backward compatibility with `NearbyBanner` and `AlertFeed`.

---

## 4. Technical Architecture & Data Strategy

### System Flow & Proximity Evaluation Pipeline

```
┌────────────────────────────────────────────────────────┐
│                   App Location Watch                   │
│             (startDeviceLocationWatch GPS)             │
└───────────────────────────┬────────────────────────────┘
                            │ [lat, lng]
                            ▼
┌────────────────────────────────────────────────────────┐
│             evaluateProximityDetections()              │
│  - Filters active prototype stations (lat/lng mapped)  │
│  - Checks reading validity & water_level >= threshold  │
│  - Filters active community reports (6h TTL)           │
│  - Computes distM(userLoc, targetLoc) <= radiusM       │
│  - Sorts by distance (nearest prototype/report first)   │
│  - Deduplicates using trackedInRadius Map state         │
└───────────────────────────┬────────────────────────────┘
                            │ newAlerts[]
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Dual Delivery Dispatch               │
├───────────────────────────┬────────────────────────────┤
│ In-App Banner             │ System Local Notification   │
│ (NearbyBanner Top Modal)  │ (Capacitor / Web Worker)   │
└───────────────────────────┴────────────────────────────┘
```

### Component & Data Modifications

1. **`src/data/nearby-alerts.ts`**:
   - Update `NearbyAlert` interface:
     ```typescript
     export type NearbyAlert = {
       id: string
       reportId: string
       place: string
       lat: number
       lng: number
       level: Exclude<Level, 0>
       distanceM: number
       detectedAt: number
       note?: string
       source: 'community' | 'prototype'
       stationCode?: string
       rain?: boolean | null
     }
     ```
   - Create `findNearbyPrototypes(userLoc, stations, radiusM, minLevel)` using `getStationLocation()` and `stationState()`.
   - Update `evaluateNearbyDetections()` to accept stations and user `avoidLevel`, merging nearest prototypes and community reports.
   - Refactor `sendNearbyNotification()` to tailor notification title and message based on whether the hazard is from an Agos Prototype station or a community report.
2. **`src/App.tsx`**:
   - Pass `snapshot.data?.stations` and `avoidLevel(settings)` into the proximity check loop inside the location watch effect.
   - Update `trackedInRadius` key format (e.g., prefix `proto-` vs `rep-`) so level changes on prototypes update state correctly.
3. **`src/components/NearbyBanner.tsx` & `src/components/AlertFeed.tsx`**:
   - Display station badge/tag and live sensor context when `alert.source === 'prototype'`.
   - Add direct action button to view the station in the Ride monitor view.
4. **`tests/nearby-alerts.test.cjs`**:
   - Add unit tests verifying prototype proximity filtering within 1km, rejection when water is below threshold, deduplication across re-checks, and multi-source handling.

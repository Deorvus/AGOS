const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (m, file) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    file
  );

const {
  findNearbyReports,
  findNearbyPrototypes,
  evaluateNearbyDetections,
  formatDistance,
} = require('../src/data/nearby-alerts.ts');

const userAt = [14.6500, 121.0500]; // Quezon City coordinates
const now = 1700000000000;

function createReport(id, lat, lng, level = 2, extra = {}) {
  return {
    id,
    lat,
    lng,
    place: `Test Place ${id}`,
    level,
    note: 'Water over curb',
    photos: ['data:image/jpeg;base64,sample'],
    takenAt: now - 1000,
    createdAt: now - 1000,
    by: 'Rider 1',
    stillFlooded: 1,
    cleared: 0,
    ...extra,
  };
}

test('formatDistance displays metres under 1km and kilometres above 1km', () => {
  assert.equal(formatDistance(350), '350 m');
  assert.equal(formatDistance(999), '999 m');
  assert.equal(formatDistance(1000), '1.0 km');
  assert.equal(formatDistance(1500), '1.5 km');
  assert.equal(formatDistance(2400), '2.4 km');
});

test('nearby flood detection excludes reports outside radius and includes reports within radius', () => {
  // ~500m away (lat + 0.004 is roughly ~440m)
  const closeReport = createReport('rep-close', 14.6540, 121.0500);
  // ~5km away
  const farReport = createReport('rep-far', 14.7000, 121.0500);

  const matched = findNearbyReports(userAt, [closeReport, farReport], 1000, now);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].id, 'rep-close');
  assert.ok(matched[0].distanceM < 1000);
});

test('expired reports (older than 6h TTL) and future-stamped reports are rejected', () => {
  const sixHoursMs = 6 * 60 * 60 * 1000;
  const expiredReport = createReport('rep-exp', 14.6510, 121.0500, 2, {
    createdAt: now - (sixHoursMs + 1000),
  });
  const futureReport = createReport('rep-fut', 14.6510, 121.0500, 2, {
    createdAt: now + 50000,
  });

  const matched = findNearbyReports(userAt, [expiredReport, futureReport], 1000, now);
  assert.equal(matched.length, 0);
});

test('cleared reports (cleared > stillFlooded) are rejected', () => {
  const clearedReport = createReport('rep-cleared', 14.6510, 121.0500, 2, {
    stillFlooded: 1,
    cleared: 2,
  });
  const matched = findNearbyReports(userAt, [clearedReport], 1000, now);
  assert.equal(matched.length, 0);
});

test('coordinates outside Philippines or malformed coordinates are rejected', () => {
  const outOfCountry = createReport('rep-nyc', 40.7128, -74.0060);
  const nanReport = createReport('rep-nan', NaN, 121.0500);
  const matched = findNearbyReports(userAt, [outOfCountry, nanReport], 1000000, now);
  assert.equal(matched.length, 0);
});

test('deduplication prevents repeat alerts unless level changes or user re-enters radius', () => {
  const rep = createReport('rep-1', 14.6520, 121.0500, 1); // ~220m away

  // First evaluation: report is new in radius -> 1 alert generated
  const pass1 = evaluateNearbyDetections(userAt, [rep], 1000, new Map(), now);
  assert.equal(pass1.newAlerts.length, 1);
  assert.equal(pass1.newAlerts[0].reportId, 'rep-1');
  assert.equal(pass1.newAlerts[0].level, 1);
  assert.equal(pass1.newAlerts[0].source, 'community');

  // Second evaluation at same level -> 0 new alerts
  const pass2 = evaluateNearbyDetections(userAt, [rep], 1000, pass1.updatedTracked, now + 10000);
  assert.equal(pass2.newAlerts.length, 0);

  // Third evaluation: report severity increased to 2 (MID) -> 1 new alert generated
  const repUpdated = createReport('rep-1', 14.6520, 121.0500, 2);
  const pass3 = evaluateNearbyDetections(userAt, [repUpdated], 1000, pass2.updatedTracked, now + 20000);
  assert.equal(pass3.newAlerts.length, 1);
  assert.equal(pass3.newAlerts[0].level, 2);

  // Fourth evaluation: user moves away (5km away) -> report is no longer in radius, removed from tracked
  const farAway = [14.7000, 121.0500];
  const pass4 = evaluateNearbyDetections(farAway, [repUpdated], 1000, pass3.updatedTracked, now + 30000);
  assert.equal(pass4.newAlerts.length, 0);
  assert.equal(pass4.updatedTracked.has('rep-1'), false);

  // Fifth evaluation: user returns to userAt -> fires a fresh alert
  const pass5 = evaluateNearbyDetections(userAt, [repUpdated], 1000, pass4.updatedTracked, now + 40000);
  assert.equal(pass5.newAlerts.length, 1);
  assert.equal(pass5.newAlerts[0].reportId, 'rep-1');
});

test('configurable radius filters appropriately with 500m and 3000m settings', () => {
  // ~800m away
  const rep800m = createReport('rep-800', 14.6570, 121.0500);

  // At 500m radius, should NOT match
  const res500 = findNearbyReports(userAt, [rep800m], 500, now);
  assert.equal(res500.length, 0);

  // At 1000m radius, SHOULD match
  const res1000 = findNearbyReports(userAt, [rep800m], 1000, now);
  assert.equal(res1000.length, 1);

  // At 3000m radius, SHOULD match
  const res3000 = findNearbyReports(userAt, [rep800m], 3000, now);
  assert.equal(res3000.length, 1);
});

function createStation(stationCode = 'QC-001', water_level = 2, extra = {}) {
  const timestamp = new Date(now - 5000).toISOString();
  return {
    id: 'e9b020e8-af79-44f7-b690-4a44bf0f6b0a',
    station_code: stationCode,
    name: 'Agos Prototype QC-001',
    mode: 'bench',
    latitude: null,
    longitude: null,
    maintenance: false,
    is_active: true,
    latest_reading: {
      water_level,
      rain_detected: true,
      received_at: timestamp,
      device_observed_at: timestamp,
      inconsistent: false,
      low_wet: water_level >= 1,
      mid_wet: water_level >= 2,
      high_wet: water_level >= 3,
      low_adc: 3500,
      mid_adc: water_level >= 2 ? 3400 : 200,
      high_adc: water_level >= 3 ? 3300 : 150,
      rain_adc: 3200,
      ...extra.reading,
    },
    ...extra.station,
  };
}

test('prototype proximity detection alerts when near device and level matches or exceeds threshold', () => {
  // QC-001 is at [14.741361, 121.026694] (Deparo, Caloocan)
  // Rider located ~400m north: [14.7450, 121.026694]
  const nearUser = [14.7450, 121.026694];
  const stationMid = createStation('QC-001', 2); // MID level

  // When threshold is MID (2), prototype at MID (2) MUST trigger
  const matched = findNearbyPrototypes(nearUser, [stationMid], 1000, 2, now);
  assert.equal(matched.length, 1);
  assert.equal(matched[0].stationCode, 'QC-001');
  assert.equal(matched[0].level, 2);
  assert.ok(matched[0].distanceM < 1000);
  assert.equal(matched[0].rain, true);

  // When threshold is HIGH (3), prototype at MID (2) MUST NOT trigger
  const belowThreshold = findNearbyPrototypes(nearUser, [stationMid], 1000, 3, now);
  assert.equal(belowThreshold.length, 0);

  // When water_level is 0 (Below LOW), MUST NOT trigger
  const stationDry = createStation('QC-001', 0);
  const matchedDry = findNearbyPrototypes(nearUser, [stationDry], 1000, 1, now);
  assert.equal(matchedDry.length, 0);

  // When user is far away (Quezon City center ~10km away), MUST NOT trigger
  const farMatched = findNearbyPrototypes(userAt, [stationMid], 1000, 1, now);
  assert.equal(farMatched.length, 0);
});

test('prototype proximity evaluation deduplicates and alerts on water level escalation', () => {
  const nearUser = [14.7450, 121.026694];
  const stationMid = createStation('QC-001', 2);

  // Initial pass: new prototype detected in radius -> generates alert
  const pass1 = evaluateNearbyDetections(nearUser, [], 1000, new Map(), now, [stationMid], 2);
  assert.equal(pass1.newAlerts.length, 1);
  assert.equal(pass1.newAlerts[0].source, 'prototype');
  assert.equal(pass1.newAlerts[0].stationCode, 'QC-001');
  assert.equal(pass1.newAlerts[0].level, 2);

  // Second pass with same station level -> deduplicated (0 new alerts)
  const pass2 = evaluateNearbyDetections(nearUser, [], 1000, pass1.updatedTracked, now + 10000, [stationMid], 2);
  assert.equal(pass2.newAlerts.length, 0);

  // Third pass: water level escalates to HIGH (3) -> new alert generated
  const stationHigh = createStation('QC-001', 3);
  const pass3 = evaluateNearbyDetections(nearUser, [], 1000, pass2.updatedTracked, now + 20000, [stationHigh], 2);
  assert.equal(pass3.newAlerts.length, 1);
  assert.equal(pass3.newAlerts[0].level, 3);
  assert.equal(pass3.newAlerts[0].source, 'prototype');
});

test('prototype proximity detection works for MID and HIGH when inconsistent: true', () => {
  const nearUser = [14.7450, 121.026694];
  const stationMidInconsistent = createStation('QC-001', 2, { reading: { inconsistent: true } });
  const matchedMid = findNearbyPrototypes(nearUser, [stationMidInconsistent], 1000, 2, now);
  assert.equal(matchedMid.length, 1);
  assert.equal(matchedMid[0].level, 2);

  const stationHighInconsistent = createStation('QC-001', 3, { reading: { inconsistent: true } });
  const matchedHigh = findNearbyPrototypes(nearUser, [stationHighInconsistent], 1000, 2, now);
  assert.equal(matchedHigh.length, 1);
  assert.equal(matchedHigh[0].level, 3);
});


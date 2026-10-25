# Agos development preview

Agos is a mobile-first prototype recovered from the supplied Figma Make file. It reads the same public, read-only bench endpoint used by floodwatchz.pages.dev. The existing website, backend, firmware and deployment were not changed.

## Run locally

Install Node.js and pnpm, then run these commands from this folder:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local address displayed by the development server. To check the project:

```sh
pnpm check
pnpm build
pnpm test
```

Optional live endpoint check: set AGOS_LIVE_TEST=1 before running the tests. Tests for the service worker require a production build first.

## What is connected

The Monitoring screen polls the existing read-only Supabase bench RPC every 15 seconds. It validates readings and displays their measurement and receipt times. Old, invalid, inconsistent, missing and disconnected data have separate states. A saved snapshot is clearly labeled and is never substituted with random readings.

QC-001 has no deployed coordinates and is bench data. It therefore cannot provide road passability or route hazard coverage. The map demo is explicitly separate. Water categories are Below LOW, LOW, MID and HIGH; these are discrete contact states, not measured depth. Rain is detected/not detected, not intensity.

## Research and alerts

Research tools are a local notebook accessible from Settings > Developer tools. Historical and simulated trials stay separate from valid physical trials. Failed and excluded trials are retained and can be exported as CSV. No timing, accuracy or notification outcome is invented.

The notebook is not an authenticated researcher portal. Profiles and reports are device-local. Background push, remote report publication, secured researcher roles and server-side trial storage are not implemented. In-app events require fresh consecutive readings; replayed or old snapshots do not create alerts.

## Production build

The dist folder contains the production build. The manifest and service worker support an offline app shell; sensor POST requests and external map services are not cached as fresh measurements. Installation on actual Android/iOS phones and a fully offline browser session have not been verified.

This build assumes hosting at the site root. A subfolder deployment needs matching Vite base, manifest scope and service-worker paths, followed by testing. Do not copy it over the existing FloodWatch website without deciding how both applications will be hosted. Nothing has been published.

## Evacuation-site search

Help includes a Philippines-wide mapped-site finder. Manual location lookup uses Nominatim and requires internet. Optional GPS use is requested only from the user-facing button. Searches default to a bundled OpenStreetMap-derived extract from louislemsic/ph-evac-centers, upstream commit July 21, 2024. These are dated, partial records, not verified open shelters. Live map retrieval is available separately but public Overpass services were unreliable during verification. Opening status, capacity, route safety and access are unknown. Straight-line distances use mapped points or area centers, not verified entrances.

The dataset source, ODbL attribution and compilation license are in public/evacuation-data-attribution.txt and public/evacuation-dataset-license.txt. The saved extract is public/evacuation-sites.json. Update it through a reviewed source import before operational deployment; do not relabel its commit date as current shelter verification. Full offline search and actual GPS permissions are not verified. Replace public search services with a suitable supported provider before large-scale usage.
Location suggestions use Photon after a short typing pause; results are restricted to the Philippines. Nominatim is reserved for explicit manual form searches, not autocomplete. Photon is a public prototype service without an availability guarantee; use a supported provider for large-scale deployment.

Each evacuation result includes Navigate here. It opens Navigate with that site's coordinates as the destination, without assuming a starting location or automatically calculating a route. Choose a starting point, then Find routes. Mapped points may not be entrances; confirm the designated center with local authorities.

## Usability fixes (October 3, 2026)

See `FIXES_AND_VERIFICATION.md` for observed mobile results, remaining location and field-readiness blockers, and official references. `EVACUATION_TEXT_CORRECTIONS.json` records source-faithful UTF-8 repairs; the map snapshot date remains July 21, 2024. Location and route loading are cancellable; manual starts remain available. Nationwide Home/Work require explicit selection. Searches and route drafts survive tab switches within the current page session, but are not restored across reloads. No deployment or backend changes were made.

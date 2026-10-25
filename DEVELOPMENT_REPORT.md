# Agos development and verification report

Date: October 3, 2026. Local preview: http://127.0.0.1:5173/

## Delivered

- Existing mobile prototype preserved and connected to the website's actual read-only bench data endpoint.
- Timestamped monitoring, cached snapshot labeling, offline/stale/inconsistent states and manual refresh.
- Removed random monitoring values, measured-depth claims and unsupported passability verdicts.
- Explicit demo-map separation and route coverage limits for the bench station.
- Optional guest entry, mobile controls, larger form text, safe-area handling and reduced-motion support.
- Local research notebook with expected/observed states, exclusion reasons, timing and delivery fields, conservative statistics and CSV export.
- In-app fresh-reading events with duplicate/replay protection; no claim of background notification delivery.
- PWA manifest, icons and production app-shell service worker. Sensor API POSTs and external requests are excluded from its cache.
- Lazy map loading to reduce the initial application download.

## Results

PASS: TypeScript check and production build.

PASS: 10 automated checks covering payload validation, freshness and fault states, replay-safe events, fetch failure behavior, research denominators and CSV escaping, bench coverage exclusion, live read-only endpoint contract, route proximity/expired reports, generated cache contents and service-worker request boundaries/navigation fallback.

PASS: Actual browser checks at 390 x 844 verified guest entry, the timestamped monitoring panel, map rendering, route search from San Bartolome to Cubao, Settings/research access, historical trial saving and CSV download. The route result stated that road conditions were unknown and sensor coverage was unavailable.

PASS: The read-only endpoint returned HTTP 200 with QC-001's saved reading measured September 29, 2026 at 6:01:47 PM PHT, received at 6:01:50 PM PHT. Last-known values were Below LOW and rain not detected. Those are historical observations, not current conditions.

WARNING: The production map chunk is still relatively large; it is loaded separately from the main screen. The production welcome screen loaded, but a subsequent final preview reopen timed out during automatic permission review. No final screenshot was obtained.

NOT TESTED: Fresh physical ESP32 updates, physical sensor calibration, actual Android/iOS installation, denied system geolocation, real phone keyboard behavior, and a complete offline browser session. The user chose to continue with the last saved observation. Offline service-worker behavior passed controlled tests, not a phone test.

NOT IMPLEMENTED: Authenticated researcher roles, server-side trial storage, published community reports, background push delivery and deployed public-warning coverage. The research notebook and profiles are explicitly local prototype tools. These remaining features require backend work and device verification before an operational release.

## Research integrity

One browser QA record was saved as a historical review of the September 29 snapshot. It was excluded from physical metrics and did not generate accuracy or response-time results. It is not a physical experiment. Failed/excluded trials are retained. Delivery success statistics count confirmed received/failed outcomes only.

## Deployment status

No website, firmware, backend configuration or Cloudflare deployment was changed. The source ZIP includes the production dist folder and instructions. Hosting paths must be reviewed before publication so the existing website is preserved.

## Settings UX update — October 3, 2026

Everyday Settings now contains vehicle/saved-place navigation, voice directions, map appearance, phone installation help and About. Research trials, technical event thresholds, refresh information and installation verification status moved to a dedicated Developer tools screen. The developer link is secondary and the screen explicitly states that it is not a secured account.

Clear alerts, preference reset and profile reset moved into Manage my data. In-app dialogs describe exactly what will change and preserve, provide Cancel, support Escape and keyboard focus containment, and return focus to the triggering control. Reset profile does not claim to delete research records or community reports.

PASS: Browser verification of developer → research → developer → settings navigation, opening the preferences reset dialog and cancelling it, and map appearance persistence after reload. Settings had no horizontal overflow at 320px or 390px widths. Main Settings was visually inspected at 390px. Screenshot: Agos-settings-mobile.png.

PASS: TypeScript check, production build and the existing 10 automated checks. The optional live network test was not enabled during this UX rerun. The existing map bundle size warning remains. Actual phone installation remains unverified.

Design reference: Apple Human Interface Guidelines, Settings (https://developer.apple.com/design/human-interface-guidelines/settings), supports reducing unnecessary settings and focusing on user-facing preferences. Technical controls were moved to a separate screen using this principle; the exact layout is an Agos design decision.

## Help UX update — October 3, 2026

Removed the preparation checklist and stalled-engine instructions. Help now contains prominent verified emergency contacts (911 and QC Helpline 122), visible guidance to avoid flooded roads, a plain-language reading/status glossary, topic shortcuts and six expandable app questions. It explains stale readings, unknown route conditions, manual location entry, lack of background push and the local-only nature of reports. No rescue request or call was sent during development.

Safety references:
- PAGASA: https://www.pagasa.dost.gov.ph/learning-tools/floods
- US National Weather Service: https://www.weather.gov/safety/flood-turn-around-dont-drown
- QC Helpline: https://quezoncity.gov.ph/program/qc-helpline-122/
- Philippine Information Agency, Unified 911: https://pia.gov.ph/news/dilg-launches-unified-911-system-for-integrated-emergency-response/

Design reference: GOV.UK advises keeping essential content visible rather than hiding it in accordions (https://design-system.service.gov.uk/components/accordion/). Safety and contacts remain visible; only the secondary app questions expand. The layout is an Agos design decision, not a user-research-validated pattern.

PASS: TypeScript check and production build. Actual browser verification showed Help rendering at 390px, topic shortcuts focusing the requested section without leaving the Help route, route-safety and unchanged-reading answers expanding, keyboard collapse of an answer, no checklist inputs, correct tel:911 and tel:122 targets, and no horizontal overflow at 320px. Screenshot: Agos-help-mobile.png.

Telephone links were inspected without calling emergency services. Actual dialing, emergency availability and physical-phone behavior remain untested. Existing large-map build warning remains.

## Nationwide evacuation-site finder — October 3, 2026

Help now supports Philippine city/municipality/barangay search, optional location lookup, 10/25/50 km ranges, nearby mapped-site lists ordered by straight-line distance, source-map links and explicit unconfirmed opening status. QC 122 is labeled for Quezon City; other areas are directed to 911 or their local disaster office.

The default results use a bundled extract of explicitly tagged sites from the OpenStreetMap-derived ph-evac-centers dataset (1,429 filtered records). Upstream commit 08cc5b0e90c76b2a9940cabe2b880d39d62a4dd7 is dated July 21, 2024. This is the commit date, not the date of a verified observation or current shelter designation. The dataset is partial, potentially outdated, and not an official national directory. Geometry centers are approximate map points, not verified entrances. Source/license metadata and attribution are included with the project.

Users can try live Overpass map retrieval. During development, the main service returned HTTP 406/504 and the earlier mirror returned 429; another service timed out. Live failure preserves the dated saved listings with an unavailable message. The default saved-data path avoids making users wait for these services. Place-name lookup still needs internet access. The saved dataset is not part of the PWA offline-shell cache, so complete offline search is not claimed.

PASS: Real browser searches for Cebu City and Davao City returned location matches and two recorded nearby sites each, with the saved-data date and unconfirmed status displayed. The Davao list included Barangay 23-C Covered Court and Regional Evacuation Center. City-point distances differ from a real user's position and are explicitly labeled straight-line estimates.

PASS: No horizontal page overflow at 320px. Browser inspection at 390px verified source links, result cards, address-unavailable labels and status warnings. Screenshot: Agos-evacuation-search.png.

PASS: TypeScript, production build and 17 automated checks. New tests cover country/radius restrictions, invalid geometry, incomplete-service responses, generic-facility exclusion, ordering/identity, cancellation/failure, Philippine-only location results and dataset presence in Luzon, Visayas and Mindanao.

NOT TESTED: Real-device location permission, GPS precision/denial, physical accessibility, operational shelter designation/opening/capacity, and actual emergency calls. Reliable live map retrieval did not pass the current service test. No deployment was performed.

Sources:
- OpenStreetMap emergency-shelter tagging: https://wiki.openstreetmap.org/wiki/Key:emergency:*
- Dataset: https://github.com/louislemsic/ph-evac-centers
- Nominatim policy: https://operations.osmfoundation.org/policies/nominatim/
- Public Overpass instances and reliability guidance: https://wiki.openstreetmap.org/wiki/Overpass_API
- Government map resource: https://maps.dswd.gov.ph/

## Location suggestions — October 3, 2026

The evacuation search now shows location suggestions after three characters and a 450 ms typing pause. Photon supplies Philippine-only matches with city/area context; duplicate and invalid matches are discarded. Requests cancel when the query changes, focus is lost, a selection is made or the component unmounts. In-session query caching reduces repeat requests. Nominatim remains an explicit manual-submit fallback and is not queried for autocomplete.

The dropdown supports touch/click, Arrow Up/Down, Enter, Escape and normal Tab navigation. Selecting a location fills its full contextual label without submitting; Search area uses the selected coordinates directly. Editing the text clears the previous selection. Suggestion failures show a manual-search alternative without fabricated recommendations.

PASS: Actual browser input Quezon City returned Quezon City with Eastern Manila District, Metro Manila, Philippines context, alongside relevant named places. Arrow Down selected the first entry; Enter filled the field and closed the list; Search area returned 142 saved mapped sites within 25 km of the selected map point. Opening status remained unconfirmed.

PASS: Mobile screenshot at 390px; no horizontal overflow at 320px. Screenshot: Agos-location-suggestions.png. TypeScript, production build and 19 automated checks passed. New checks cover country/context filtering, duplicates, malformed coordinates, short-query behavior, cancellation and unavailable-service behavior. Large-scale provider availability and actual phone keyboard behavior remain unverified.

Provider reference: https://github.com/komoot/photon/blob/master/docs/api-v1.md

## Evacuation-site navigation — October 3, 2026

Added Navigate here to every displayed evacuation result, including results revealed by Show more sites. Help passes the selected site's name and coordinates to Navigate. Evacuation trips start with no assumed origin and do not automatically calculate routes; Find routes stays disabled until an origin is selected. Existing Ride trip behavior is preserved. The navigation view explains that the mapped point may not be an entrance and the center's opening status needs confirmation.

PASS: Actual browser search near Quezon City returned 142 mapped sites, with a navigation button on all 10 initially displayed cards. Selecting Multifunction Hall Montevista opened #/nav, filled that destination, left Starting point blank and Find routes disabled. Mobile layout checked at 390 by 844; screenshot: Agos-evacuation-navigation.png. Type checking, all 19 existing automated tests and production build passed. Existing large map bundle warning remains. Full travel guidance, GPS permissions and the center's present opening status were not verified.

## Location error correction — October 3, 2026

Confirmed Navigate previously reported every getCurrentPosition failure as permission denied, including timeout and position unavailable. It now distinguishes the three error codes and offers manual starting-point entry plus relevant recovery guidance. Type checking, production build and simulated callback checks for all three codes passed. Actual device location access and Windows/browser permission state have not been verified; the screenshot cannot identify which error code occurred.

## Route-origin location timeout adjustment — October 3, 2026

The user reported the corrected timeout message. Route planning previously requested high accuracy with an 8-second deadline. It now requests standard accuracy, allows 20 seconds and accepts a position cached within 30 seconds. This can return an approximate origin; it does not guarantee the device will obtain a position. Type checking and production build passed. Actual device location acquisition remains unverified. Active navigation's accuracy options are unchanged.

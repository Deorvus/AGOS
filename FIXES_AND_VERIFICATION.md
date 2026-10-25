# Agos fixes and verification

Reviewed October 3, 2026. Starting point: `Agos-usability-review.md`. This is a simulated commuter assessment and local implementation, not field certification. The existing FloodWatch website, backend and firmware were not overwritten or deployed.

## Changes

- Location acquisition uses a cancellable watch, accepts the first valid position, clears the watch, ignores late callbacks and has a 20-second deadline. Getting location and calculating routes have separate messages. Cancellation also aborts routing requests. Manual-start recovery focuses the starting-point field. Denial, unavailable position and timeout have separate explanations; no substitute location is generated. Switching away stops navigation acquisition; hiding Help cancels an outstanding location acquisition.
- The input/swap layout reserves 44 pixels for the swap button. Route cards shrink and wrap inside the viewport. Quick actions wrap at narrow widths; the planner scrolls vertically. Suggestions support arrow keys, Enter and Escape. Editing a selected input invalidates its previous coordinates.
- Home and Work now accept explicitly selected Philippine search suggestions. New users have neither place assumed. Existing saved strings still resolve, and a selected nationwide place stores its name and coordinates. The stored coordinates are the chosen saved place, not an automatically captured device position.
- Help search and Navigate drafts stay mounted during tab switches. New search and New trip explicitly clear their respective tasks. New evacuation handoffs reset the destination even when successive listings have the same name. Persistence is within the current page session; a reload intentionally does not restore route drafts or precise device location.
- Reading age and unknown road conditions lead the flood panel. Technical timestamps are under Reading details. Welcome and first-ride guidance now describe the actual bench prototype. The sensor categories remain discrete contact conditions, never road depth or vehicle clearance.
- Corrected 58 text fields from the original UTF-8 source dataset, matched by OSM identity. The import previously read UTF-8 bytes using the Windows default encoding. Tañong High School and Ermitaño Covered Court now display correctly. No site coordinates, names absent from source, contacts, entrances, or opening statuses were invented. The July 21, 2024 dataset date remains unchanged. Missing names/addresses are explicitly marked incomplete. See `Agos-evacuation-text-corrections.json` for the audit trail.

## Verification results

Actual interfaces were exercised at 390 × 844 and 320 × 640 using local development and production builds. Tests used temporary Guest browser sessions; the user's existing application preferences were not cleared. No report, emergency call, permission-setting change or deployment occurred.

| Check | Result | Evidence |
|---|---|---|
| Manual routing | PASS | Quezon Memorial Circle → Araneta City, Cubao returned 9 min / 5.4 km at both widths. Distance and unknown-condition message stayed visible. |
| Route layout | PASS | At 320 px the route button occupied x=32–288; document width was 320. Swap has its own column. See route/planner screenshots. |
| Keyboard selection | PASS | ArrowDown + Enter selected a place and enabled manual routing; free text alone did not preserve the old chosen coordinates. |
| Separate location/route loading | PASS | Authorized location attempt showed Getting your location and a 20-second message. Manual routing showed Calculating routes and Contacting the route service. |
| Actual device position acquisition | FAIL | The one authorized new attempt timed out without returning a position. A GPS route could not be calculated. No invented position used. |
| Timeout/manual recovery | PASS | Accurate timeout appeared; manual alternative cleared My location, focused the start input and disabled routing until a start was selected. Manual routing subsequently succeeded. |
| Cancellation | PASS | Cancel request during manual route calculation returned Request cancelled and restored controls. Automated tests verify stopping a pending location watch and ignoring a late callback. Actual-device cancellation was not repeated because only one new acquisition test was authorized. |
| Permission denial / unavailable position | NOT VERIFIED on device | Distinct errors and cleanup pass automated injected-provider tests. Device permissions were not changed to induce these states. |
| Luzon search | PASS | Quezon City suggestion included Metro Manila context; 142 mapped sites within 25 km at both widths. Correct ñ characters visible. |
| Visayas search | PASS | Cebu City, Central Visayas: 2 mapped sites within 25 km at both widths; incomplete listings marked. |
| Mindanao search | PASS | Davao City, Davao Region: 2 mapped sites within 25 km at both widths. |
| Empty results | PASS | Basco, Batanes: no mapped sites within 25 km at both widths; message explicitly says this does not establish that no evacuation centers exist. |
| Evacuation handoff | PASS | Cordova Evacuation Center and Tañong High School transferred to Navigate; origin remained blank. At 320 px Multifunction Hall Montevista transferred correctly; its full name wraps in the selected-site notice. These are map points, not verified entrances. |
| Tab persistence | PASS | Route preview retained after Help switch. Cebu search, selected area and 2 results retained after Navigate here and returning to Help. |
| New search / New trip | PASS | Search cleared its query/results. New trip cleared both route inputs; route button disabled. A leftover evacuation notice was corrected so it only applies to the selected mapped destination. |
| Nationwide saved places | PASS | Davao City explicitly selected as Home, survived reload, while legacy Araneta City Work stayed intact. Save remained disabled before a suggestion was selected. A separate first-use origin showed Home and Work as Not set. |
| FloodWatch read-only integration | PASS | Production interface reached the shared source and displayed Offline, historical Below LOW / rain not detected, measurement Sep 29, 2026 6:01:47 PM PHT, age 3 days, and unknown current conditions. No physical new measurement verified. |
| Onboarding | PASS | Final built first-ride screen describes the unlocated bench sensor and unknown road conditions. |
| Physical phone keyboard, accessibility aids, unreliable network | NOT VERIFIED | Desktop mobile viewport and keyboard selection are not proof of software-keyboard, screen-reader or slow-network behavior. |

Type checking and production build pass. All 25 automated tests pass, including monitoring freshness/failure, route coverage, nationwide evacuation constraints, suggestion cancellation, saved-place migration, location cleanup/error codes and offline-shell behavior. Production map chunk remains about 1.22 MB minified (334 KB gzip); poor-network performance needs separate testing. A build alone is not the basis for the interface results above.

## Remaining blockers and causes

1. **Device location:** confirmed timeout, not confirmed permission denial. Browser/OS location provider availability, device settings, environment policy and signal availability are hypotheses. The app cannot force a provider to return coordinates. Compare this same URL in a normal supported browser and on a physical phone, after the user permits a new test. Do not change permissions without consent. Standard-accuracy acquisition reduces reliance on high-accuracy fixes; it does not guarantee positioning.
2. **Monitoring coverage:** the reached endpoint is a bench prototype with no verified installed road location. The last saved reading remains historical. Nationwide search does not imply nationwide sensor coverage. Need deployed stations with verified coordinates, calibration and physical readings, uptime/freshness monitoring, and reviewed interpretation before any field warning claim.
3. **Evacuation data:** the bundled map snapshot is dated July 21, 2024. Encoding was restored from source, not verified by local authorities. Current opening, capacity, accessibility, contact and entrance remain unconfirmed. Source-backed text correction cannot establish operation today.
4. **Shared reports:** reports remain device-local; they are not community-wide or rescue requests. Sharing requires an authorized backend design, anti-abuse and moderation, expiry, privacy/retention policy and access controls. No missing service is represented as active.
5. **Background notifications:** existing in-app alerts do not prove delivery while closed. Production push needs a service worker push handler, explicit user permission, subscription storage, server delivery and server-held keys. Native/PWA behavior, lock-screen delivery and revoked-permission recovery need real-device testing. No keys or paid service were created.

## Readiness and priority

| Use | Verdict | Next requirements |
|---|---|---|
| Student demonstration | Conditional ready | Demonstrate manual routes, historical bench readings and unconfirmed map listings. Explain GPS timeout and service dependency; avoid a road-safety demonstration. |
| Supervised pilot | Ready for usability sessions only; field safety pilot not ready | First test real phones and weak connections with commuters; verify local centers and install/calibrate sensors for a geographically limited field pilot. |
| Everyday public use | Not ready | Reliable verified coverage, operational-center review, location/routing reliability, incident response and monitoring, privacy/access controls, and real-user testing are unresolved. |

Priority 1: preserve unknown/current/stale distinctions and verify physical stations and designated centers before travel-safety claims. Priority 2: test location on physical Android/iOS devices, software keyboards, denied/revoked permissions, slow/offline service failure and long names. Priority 3: add reviewed center records with dated verification and official source attribution, without merging operational claims into community map data. Priority 4: scope moderated shared reports and server-backed notifications only after credentials, infrastructure and user approval are available. Priority 5: measure and reduce map startup payload after profiling, and conduct supervised commuter usability sessions.

## Official technical references consulted

Geolocation requires a secure context and may be affected by permission policy and user permission. A watch can be cleared; these APIs cannot guarantee the underlying device returns a position. [MDN watchPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition), [MDN geolocation Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/geolocation).

For proposed shared reports, access rules and database change delivery require explicit backend work and reviewed access permissions. [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes).

Web push involves subscription, service-worker handling and server delivery; secret signing keys belong on the server. It is a proposed capability, not a feature completed in this change. [web.dev push notifications overview](https://web.dev/articles/push-notifications-overview).

Evacuation snapshot attribution: [original dataset repository](https://github.com/louislemsic/ph-evac-centers), commit `08cc5b0e90c76b2a9940cabe2b880d39d62a4dd7`; [OpenStreetMap attribution](https://www.openstreetmap.org/copyright). Archived source text was used for encoding corrections, not an assertion of current official status.

## Screenshots

- `Agos-fixed-route-320.png`: route detail fits narrow screen.
- `Agos-fixed-route-390.png`: route detail at 390 px.
- `Agos-fixed-planner-320.png`: separate swap column and wrapped actions.
- `Agos-fixed-location-loading.png`, `Agos-fixed-location-timeout.png`: authorized acquisition and timeout.
- `Agos-fixed-evacuation-handoff.png`, `Agos-fixed-handoff-320.png`: destination handoff.
- `Agos-fixed-source-names.png`: corrected source characters.
- `Agos-fixed-empty-results.png`: cautious empty-result guidance.
- `Agos-fixed-saved-place.png`, `Agos-fixed-new-profile.png`: nationwide editor and blank defaults.
- `Agos-fixed-reading-age.png`, `Agos-fixed-onboarding.png`: historical status and honest first-use guidance.

The updated ZIP includes editable source, public data, tests, the built application, this report, the correction audit and earlier documentation. Screenshots are also supplied in the separate evidence ZIP. No deployment occurred.

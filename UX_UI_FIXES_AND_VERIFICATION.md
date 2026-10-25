# Agos UX/UI fixes and verification

October 3, 2026 · Local implementation and interface testing. Starting reference: `Agos-UX-UI-expert-review.md` and its evidence. This is an expert prototype assessment, not verification of safe roads or operating evacuation centers.

## What changed

- **Accurate capability wording:** About now says Explore route options, Rain detection, Water contact states and Monitoring events. It explicitly states that routes, demonstration data and local reports do not establish road safety. Existing historical-reading, local-report and unavailable-background-notification explanations remain visible.
- **Independent page positions and predictable focus:** Page scroll is remembered separately during the current session. Unvisited pages start at the top; returning to Help restores Help's own position. Tab navigation focuses the named main region without scrolling it. Help search and Navigate remain mounted to retain task context. No precise device coordinates are added to persistent storage.
- **Truthful suggestions:** An empty trip field no longer supplies QC landmarks as if the user saved them. Actual Home/Work locations can appear as Saved place; matching predefined landmarks are Suggested landmark. Nationwide suggestions retain the distinguishing area once, with wrapping text.
- **Readable route identity:** The preview displays full From and To names, including the selected area. The header cannot shrink and clip its wrapped text. At 320 px, scrolling reaches route actions and the safety warning.
- **Honest evacuation actions:** Buttons say Route to mapped point. Missing names and missing/partial addresses are flagged. Incomplete listings require a short, cancellable confirmation explaining unknown opening status and an unverified entrance. Escape closes it and restores focus to the triggering button. Confirming transfers the actual selected mapped point to Navigate.
- **Useful Profile hierarchy:** Home and Work appear before category preferences. Technical category controls sit inside Advanced route preferences, collapsed by default. Existing settings values and saved-place formats are preserved. Footer labels increase from 11 to 12 px.
- **First-use recovery:** Each guidance step starts at the top and focuses its heading. Help has a prominent shortcut to evacuation search above the longer information.

No evacuation names, addresses, coordinates, contacts or opening status were invented. The bundled OpenStreetMap extract, July 21, 2024 date, source links and earlier source-faithful character corrections are preserved. Address classification is conservative: absent address tags mean missing; an address without both a street and city/town/province is partial; the remaining map addresses are still **not reviewed**. There are no reviewed local records, so nothing is labeled reviewed or confirmed open.

Files changed: `src/App.tsx`, `src/components/AboutView.tsx`, `SafetyNotice.tsx`, `ProfileView.tsx`, `Navigate.tsx`, `HelpView.tsx`, `EvacuationSearch.tsx`, `src/data/evacuation.ts`, and `tests/evacuation.test.cjs`.

## Verification

Actual interface testing used the in-app browser at **390 × 844** and **320 × 640**, with temporary Guest sessions and public place names. Existing preferences and saved places were not saved, cleared or reset. One new actual-location attempt was explicitly authorized. No reports were submitted, emergency numbers called, permissions changed or deployment performed.

Before edits, fresh interface checks reproduced inherited scroll (Guest heading at −1036.8 px after Help → Profile at 320), the misleading Saved place labels, duplicated suggestion context, About's Safer routes claim, and the long route preview. The prior review supplied the original partial-address and first-use evidence. Those flows were exercised again after implementation. Do not interpret prior screenshots as a separate fresh pre-edit run of every finding.

PASS means the named behavior was observed, not that the entire feature is certified. NOT VERIFIED identifies remaining test conditions or permissions.

| Check | Result | Observed evidence |
|---|---|---|
| First use and step transitions | **PASS** | Fresh production-preview Guest session. At 320, step 2 started at scroll 0 with Prototype information heading focused and visible near y=84. Repeated steps at 390, acknowledged the non-binding monitoring notice and reached Ride. |
| Historical flood information | **PASS** | Both sizes: Offline, historical Below LOW / rain Not detected, 3 days old, measurement Sep 29, 2026 at 6:01:47 PM PHT. Current road/water/rain conditions explicitly unknown. Physical new readings remain NOT VERIFIED. |
| Manual routing and long destination | **PASS** | Cebu City → SM Seaside City Cebu, Mambaling: 6 min / 3.4 km. Full name and area wrap in the preview at both sizes. At 320 the trip header is x=12–308, height 176 px; actions and warning are reachable by scrolling. Only one route returned; multiple-option comparison is NOT VERIFIED. |
| Cancellation, manual alternative and new trip | **PASS for observed recovery** | Cancelled a manual route-service request. Manual alternative cleared the start and focused Starting point; selecting a real suggestion restored routing. New trip cleared both selections and disabled Find routes. Swapping retained the exact selected names. Actual GPS cancellation was not separately exercised. |
| Actual location acquisition | **FAIL — environmental cause unresolved** | One approved attempt at 390 showed Getting your location, the 20-second explanation and cancellation/manual controls, then an accurate timeout. No position or GPS route was obtained. No fabricated fallback. A later control lookup encountered an intervening changed test state; it is not evidence of successful timeout-specific recovery. Manual recovery was verified separately above. |
| Nationwide evacuation search | **PASS for mapped results** | Explicit suggestions and searches at both sizes: Quezon City 142, Cebu City 2, Davao City 2, within 25 km. Dataset age and unconfirmed opening status remain visible. This verifies search behavior, not completeness or operation. |
| Empty result | **PASS** | Basco, Batanes: no mapped sites at 25 km at both sizes. Explanation says this does not mean there are no centers and offers range/local-office alternatives. |
| Partial/missing listing and confirmation | **PASS** | Ermitaño Covered Court retains source text Grey and now says Partial address from map — not reviewed. Cebu's Mapped emergency shelter and Davao's Barangay 23-C Covered Court also trigger confirmation. At 320 the dialog is x=16–304, height 383.7 px; Cancel is initially focused. Tab reaches Continue; Escape restores focus to the site button. |
| Evacuation → Navigate | **PASS** | Confirmed Ermitaño Covered Court at 320 and Cordova Evacuation Center at 390. Exact destination names arrived, origin remained blank, route planning stayed disabled until an origin was selected, and entrance/opening limitations stayed visible. |
| Home/Work selection | **PASS for selection and cancellation; NOT VERIFIED for a new saved value** | Davao Home at 390 and Cebu Work at 320: Save disabled for text alone, enabled after explicit selection; Cancel left both Not set. No existing saved data was changed. Automated checks cover legacy and nationwide saved-place loading. |
| Tab continuity, scroll and focus | **PASS for exercised transitions** | Help → Using Agos scroll 3448.8 at 320; first Profile entry scroll 0, Guest heading y=92, main region focused. Help return restored 3448.8. Alerts first entry scroll 0, heading y=112.8. At 390, Help scroll 3697.6 did not transfer to Profile or Settings; each opened at scroll 0. Cebu search/results and the 6 min route survived tab changes. |
| Everyday information | **PASS** | About uses the corrected headings; Profile prioritizes Home/Work and hides category controls until expanded. MID motorcycle default remained selected. Help, Alerts and Settings retain local-only report, prototype and background-notification limitations. No preferences changed. |
| Phone layout and selected accessibility measurements | **PASS for measured checks; broader accessibility NOT VERIFIED** | At 320 swap target 44 × 44, footer Navigate target 64 × 65.99, label 12 px; input right edge 224 and swap left edge 248 do not overlap. Confirmation Continue target height 48. White on measured rgb(6,122,133) is approximately 5.08:1 contrast. Keyboard suggestions use ArrowDown/Enter; modal cancellation and page focus observed. No screen-reader certification claimed. |
| Final production build | **PASS smoke test** | Fresh preview loaded `/assets/index-B0ZmDdB5.js`; Profile showed Saved places before collapsed Advanced route preferences at mobile sizes. Source interface journeys above used the final local implementation. |

Automated validation: type check **PASS**, production build **PASS**, **26 tests PASS**. New meaningful regression coverage ensures source address fragments remain unchanged and cannot become reviewed addresses. Existing monitoring, routing, suggestions, saved-place compatibility, geolocation error/cancellation and offline-shell checks also passed. The map chunk remains about 334 KB gzipped and produces a bundle-size warning; this does not establish acceptable poor-network behavior.

## Before and after evidence

Fresh before scroll reproduction:

![Before: inherited Profile scroll](Agos-UX-fix-before-scroll-320.png)

After: production Profile prioritizes everyday tasks:

![After: Profile hierarchy](Agos-UX-fix-profile-production-390.png)

Before route preview:

![Before: route identity truncated](Agos-UX-fix-before-route-320.png)

After: complete route identity, with actions reached by scrolling:

![After: full trip names at 320](Agos-UX-fix-route-320.png)

![After: route actions at 320](Agos-UX-fix-route-actions-320.png)

After: partial-address warning and confirmation:

![Partial source address identified](Agos-UX-fix-partial-320.png)

![Incomplete listing confirmation](Agos-UX-fix-confirmation-320.png)

The evidence ZIP contains these and additional first-use, handoff, suggestion, location and About screenshots. Original review screenshots remain in the earlier review evidence ZIP.

## Blockers and recommendations

1. **Location reliability:** Confirmed timeout; browser/device provider, signal, OS settings and intended installed-app environment remain hypotheses. Compare physical Android/iOS devices with explicit consent, record error category and elapsed time, and test cancellation/denial/unavailable outcomes. Keep manual starts prominent. This local UI work cannot manufacture a usable device position.
2. **Real monitoring coverage:** The reached record is historical and the station has no deployed road location. A field pilot needs installed/calibrated sensors, agreed freshness and maintenance practices, and verified coverage. Do not treat missing coverage as no flooding.
3. **Reviewed evacuation arrangements:** Obtain dated records from responsible local offices, with verified designation, entrance and operational information. Add an explicit reviewed-record model only when those records exist. Preserve map provenance; do not rename fragments or assign open status by inference.
4. **Real-device accessibility and connection testing:** Test physical keyboards/soft keyboards, zoom, assistive technology, low-end devices, interruption and genuinely poor/offline networks. Only selected contrast and target measurements were made here. Reduce map delivery cost after measuring actual loading; do not call an untested connection usable.
5. **Shared reports and background alerts:** Current reports are device-local and background notification services are not connected. Shared reporting needs an approved backend, access controls, moderation and retention rules. Background alerts need permission, delivery infrastructure and device testing. Neither service was implemented or presented as working.

| Readiness | Verdict and next step |
|---|---|
| Student demonstration | **Ready with explicit prototype framing.** Demonstrate historical readings, manual routing, mapped-site confirmation and manual recovery; explain source age and unknown road conditions. |
| Supervised usability pilot | **Ready with limits.** Observe consenting real commuters completing controlled tasks across regions and phone sizes; collect confusion and task completion rather than inferring it from this expert test. |
| Supervised field pilot | **Not ready.** Requires physical coverage, reviewed evacuation arrangements and reliable device/location behavior. |
| Everyday public use | **Not ready.** Requires the field prerequisites plus operational monitoring, accessibility/network validation and reliable support/alert infrastructure. |

The main exploration tasks are more coherent and readable. A mapped route still cannot establish safe travel or an open evacuation center. Real hardware, physical phones, assistive technology, poor-network conditions and user research remain NOT VERIFIED.

Implementation reference: [MDN dialog guidance](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) was checked for native modal focus and dismissal behavior. Accessibility interpretation follows [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html); measured checks here are not an overall conformance claim.

# Agos and FloodWatch integration

Agos now uses the existing public get_floodwatch_bench_data RPC in src/data/monitoring.ts. The browser publishable key is intentionally public; no device credentials or privileged server keys are included. The app makes read-only requests and does not modify stations, observations, firmware or website files.

The endpoint currently supplies bench station QC-001 with no coordinates. Public-warning eligibility is false. Sensor observations are displayed with timestamps and freshness labels, and are excluded from public route coverage. The saved September 29 observation must not be interpreted as present conditions.

The existing website remains at https://floodwatchz.pages.dev. Agos links to it and reads the same backend; it does not embed or replace the website. No deployment was performed. The user requested a local, reviewable build before publishing.

Before deployment, choose a separate Cloudflare Pages project or a reviewed combined deployment. The current dist build targets a root URL. A /rider deployment requires changing and testing asset base paths, service-worker scope and manifest URLs. Preserve the existing website when packaging any combined deployment.

Before a public operational release, implement secured researcher authentication and authorization, server-side research records, real deployed station coordinates and eligibility rules, and verified background delivery if required. Keep measured depth, rainfall intensity, forecast and passability claims out of the interface unless appropriate data supports them.

Mapping and routing depend on external services and send search/location coordinates when used. Manual location entry remains available. Actual phone installation, denied geolocation and background notifications need separate device testing.

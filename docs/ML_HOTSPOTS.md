# Automatic ML hotspot data

The Leaflet map reads experimental DBSCAN clusters from the Vercel Function at `/api/hotspots`. The function queries only `category`, `severity`, `latitude`, and `longitude`, and returns no report IDs, descriptions, or reporter fields. It requests the existing public report statuses (`Verified` and `Resolved`), rejects invalid coordinates, and relies on the existing public RLS policy to exclude withdrawn reports.

## Vercel environment variables

Set these for Preview and Production in **Vercel Project Settings → Environment Variables**:

- `SUPABASE_URL`: the Supabase project URL.
- `SUPABASE_ANON_KEY`: the Supabase publishable/anon key.

Both values are read only by the serverless function and must not use a `VITE_` prefix. The function uses the anon key so Supabase RLS and column grants still constrain access; do not configure or expose a service-role key for this feature. The existing browser environment configuration remains unchanged.

## Deploy and verify

1. Add the two variables to the Vercel project environments.
2. Deploy the repository through the existing Vercel Git integration (or `vercel deploy`). Vercel discovers root-level `api/*.js` Functions alongside a Vite frontend; the existing SPA rewrite remains in place.
3. Request `https://<deployment-host>/api/hotspots`. A successful response has `algorithm: "DBSCAN"`, `radius_meters: 250`, `min_samples: 3`, summary counts, and member coordinates. A missing configuration returns HTTP 503; a Supabase/query failure returns a generic HTTP 502 response.
4. After a report is reviewed into `Verified` (or `Resolved`) with valid coordinates and is not withdrawn, open the map and click **Refresh reports**. That action refreshes both the report list and hotspot result. The map also refreshes hotspot data every 60 seconds. A new report may form a cluster, join a cluster, or remain noise according to the existing parameters.

The response is CDN cached for up to 15 seconds. Hotspots are experimental geographic clusters, not validated flood-risk predictions.

## Experimental hyperlocal risk layer

The Alerts page consumes the existing `/api/hotspots` response without changing DBSCAN or its API contract. The endpoint already limits inputs to public `Verified` and `Resolved` reports with valid coordinates. DBSCAN noise points are excluded from cluster scores and alerts, and the app's demo fallback data is not used for this layer.

For each cluster, the experimental score is:

`0.40 × concentration + 0.35 × mean severity + 0.25 × weather`

Each component is on a 0–100 scale. Concentration is `100 × n / (n + 7)`, where `n` is the cluster's eligible report count; this diminishing-returns curve gives a minimum 3-report cluster 30 points and approaches, but never automatically reaches, 100. Severity averages report counts mapped to LOW=25, MODERATE=50, HIGH=75, CRITICAL=100; legacy MEDIUM is treated as MODERATE. The weather component averages two clamped heuristics: temperature maps 20–40°C to 0–100, and current-period precipitation maps 0–50 mm to 0–100. Values outside those ranges clamp to the nearest endpoint. The score is rounded to an integer before classification: 0–24 Low, 25–49 Moderate, 50–74 High, and 75–100 Critical.

An overall score is marked incomplete if cluster count, complete recognized severity counts, current temperature, or current precipitation is unavailable. No missing value is silently treated as zero. Weather is fetched from the existing Open-Meteo integration at each cluster centroid and is modelled context, not proof of local impact or a predictor on its own.

Category alerts require at least two reports of the same category within an existing DBSCAN cluster plus matching current weather: Flooding / Waterlogging and Drainage Problem require at least 5 mm current-period precipitation; Extreme Heat requires at least 35°C; Road Problem, Infrastructure Damage, Fallen Tree, and Power Issue require at least 5 mm current-period precipitation. These are transparent educational triggers, not official warning thresholds. A triggered alert remains visible if other risk-score inputs are missing, and labels its risk assessment incomplete.

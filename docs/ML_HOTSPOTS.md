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

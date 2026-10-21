import { clusterReports, hasValidCoordinates } from '../src/data/dbscan.js';
import { createClient } from '@supabase/supabase-js';

const PUBLIC_STATUSES = ['Verified', 'Resolved'];

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=15');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return response.status(503).json({ error: 'Hotspot data is not configured.' });
  }

  try {
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.from('reports')
      .select('category,severity,latitude,longitude')
      .in('status', PUBLIC_STATUSES)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    if (error) {
      console.error('Hotspot report query failed:', error.code || 'Unknown database error');
      return response.status(502).json({ error: 'Hotspot data could not be loaded.' });
    }

    const eligibleReports = Array.isArray(data) ? data.filter(hasValidCoordinates) : null;
    if (!eligibleReports) {
      console.error('Hotspot report query returned an unexpected response.');
      return response.status(502).json({ error: 'Hotspot data could not be loaded.' });
    }
    return response.status(200).json(clusterReports(eligibleReports));
  } catch (error) {
    console.error('Hotspot computation failed:', error instanceof Error ? error.message : 'Unknown error');
    return response.status(502).json({ error: 'Hotspot data could not be computed.' });
  }
}

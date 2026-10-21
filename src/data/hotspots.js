const HOTSPOTS_URL = '/api/hotspots';

function isValidHotspot(hotspot) {
  return hotspot && Number.isFinite(hotspot.cluster_id)
    && Number.isFinite(hotspot.latitude) && hotspot.latitude >= -90 && hotspot.latitude <= 90
    && Number.isFinite(hotspot.longitude) && hotspot.longitude >= -180 && hotspot.longitude <= 180
    && Number.isFinite(hotspot.report_count) && hotspot.report_count >= 0
    && Number.isFinite(hotspot.high_or_critical) && hotspot.high_or_critical >= 0
    && hotspot.categories && typeof hotspot.categories === 'object' && !Array.isArray(hotspot.categories)
    && Object.values(hotspot.categories).every((count) => Number.isFinite(count) && count >= 0);
}

function validMember(member) {
  return member && Number.isFinite(member.latitude) && member.latitude >= -90 && member.latitude <= 90
    && Number.isFinite(member.longitude) && member.longitude >= -180 && member.longitude <= 180;
}

export async function fetchHotspots({ signal } = {}) {
  const response = await fetch(HOTSPOTS_URL, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Hotspot data request failed (${response.status}).`);

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Hotspot data is not valid JSON.');
  }

  if (!data || data.algorithm !== 'DBSCAN'
    || !Number.isFinite(data.radius_meters) || data.radius_meters <= 0
    || !Number.isFinite(data.min_samples) || data.min_samples < 1
    || !Array.isArray(data.hotspots) || typeof data.note !== 'string' || !data.note.trim()
    || !Number.isFinite(data.analyzed_reports) || !Number.isFinite(data.cluster_count)
    || !Number.isFinite(data.noise_count)) {
    throw new Error('Hotspot data is missing required fields.');
  }

  return {
    radiusMeters: data.radius_meters,
    note: data.note,
    generatedAt: data.generated_at,
    hotspots: data.hotspots.filter(isValidHotspot).map((hotspot) => ({
      ...hotspot,
      severity_counts: hotspot.severity_counts && typeof hotspot.severity_counts === 'object'
        && !Array.isArray(hotspot.severity_counts) ? hotspot.severity_counts : {},
      // An absent or malformed member list simply means this cluster has no boundary.
      members: Array.isArray(hotspot.members) ? hotspot.members.filter(validMember) : [],
    })),
  };
}

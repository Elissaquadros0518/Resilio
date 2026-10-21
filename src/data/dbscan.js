export const DBSCAN_RADIUS_METERS = 250;
export const DBSCAN_MIN_SAMPLES = 3;
const EARTH_RADIUS_METERS = 6_371_000;

export function hasValidCoordinates(report) {
  return Number.isFinite(report?.latitude) && report.latitude >= -90 && report.latitude <= 90
    && Number.isFinite(report?.longitude) && report.longitude >= -180 && report.longitude <= 180;
}

function angularDistance(first, second) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function clusterReports(inputReports) {
  const reports = (Array.isArray(inputReports) ? inputReports : []).filter(hasValidCoordinates);
  const epsilon = DBSCAN_RADIUS_METERS / EARTH_RADIUS_METERS;
  const labels = new Array(reports.length).fill(undefined);
  const neighborsOf = (index) => reports.flatMap((report, candidate) =>
    angularDistance(reports[index], report) <= epsilon ? [candidate] : []
  );
  let clusterCount = 0;

  for (let index = 0; index < reports.length; index += 1) {
    if (labels[index] !== undefined) continue;
    const neighbors = neighborsOf(index);
    if (neighbors.length < DBSCAN_MIN_SAMPLES) {
      labels[index] = -1;
      continue;
    }

    const clusterId = ++clusterCount;
    labels[index] = clusterId;
    const seeds = [...neighbors];
    const queued = new Set(seeds);
    for (let cursor = 0; cursor < seeds.length; cursor += 1) {
      const candidate = seeds[cursor];
      if (labels[candidate] === -1) labels[candidate] = clusterId;
      if (labels[candidate] !== undefined) continue;
      labels[candidate] = clusterId;
      const candidateNeighbors = neighborsOf(candidate);
      if (candidateNeighbors.length >= DBSCAN_MIN_SAMPLES) {
        candidateNeighbors.forEach((neighbor) => {
          if (!queued.has(neighbor)) {
            queued.add(neighbor);
            seeds.push(neighbor);
          }
        });
      }
    }
  }

  const clusters = new Map();
  reports.forEach((report, index) => {
    const label = labels[index];
    if (label === -1) return;
    if (!clusters.has(label)) clusters.set(label, []);
    clusters.get(label).push(report);
  });

  const hotspots = [...clusters.entries()].map(([clusterId, members]) => {
    const categories = {};
    const severityCounts = {};
    members.forEach((member) => {
      const category = typeof member.category === 'string' && member.category.trim()
        ? member.category.trim() : 'Uncategorized';
      const severity = typeof member.severity === 'string' && member.severity.trim()
        ? member.severity.trim().toUpperCase() : 'UNKNOWN';
      categories[category] = (categories[category] || 0) + 1;
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    });
    return {
      cluster_id: clusterId,
      latitude: members.reduce((sum, member) => sum + member.latitude, 0) / members.length,
      longitude: members.reduce((sum, member) => sum + member.longitude, 0) / members.length,
      report_count: members.length,
      high_or_critical: (severityCounts.HIGH || 0) + (severityCounts.CRITICAL || 0),
      severity_counts: severityCounts,
      categories,
      members: members.map(({ latitude, longitude }) => ({ latitude, longitude })),
    };
  });

  return {
    generated_at: new Date().toISOString(),
    algorithm: 'DBSCAN',
    radius_meters: DBSCAN_RADIUS_METERS,
    min_samples: DBSCAN_MIN_SAMPLES,
    analyzed_reports: reports.length,
    cluster_count: hotspots.length,
    noise_count: labels.filter((label) => label === -1).length,
    hotspots,
    note: 'Experimental geographic clusters, not validated flood-risk predictions.',
  };
}

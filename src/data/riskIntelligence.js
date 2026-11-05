// Experimental, explainable heuristics built on the existing DBSCAN output.
// Concentration uses a saturating curve: 100 * n / (n + 7), so the minimum
// 3-report DBSCAN cluster scores 30 and no finite cluster automatically hits 100.
const SEVERITY_SCORE = { LOW: 25, MODERATE: 50, MEDIUM: 50, HIGH: 75, CRITICAL: 100 };
const WEIGHTS = { concentration: 0.4, severity: 0.35, weather: 0.25 };

export function classifyRisk(score) {
  if (!Number.isFinite(score)) return null;
  if (score < 25) return 'Low';
  if (score < 50) return 'Moderate';
  if (score < 75) return 'High';
  return 'Critical';
}

function severityScore(hotspot) {
  const counts = hotspot?.severity_counts;
  if (!counts || typeof counts !== 'object') return null;
  let total = 0;
  let weighted = 0;
  for (const [rawSeverity, count] of Object.entries(counts)) {
    if (!Number.isFinite(count) || count < 0) return null;
    if (count === 0) continue;
    const score = SEVERITY_SCORE[rawSeverity.toUpperCase()];
    if (score === undefined) return null;
    total += count;
    weighted += score * count;
  }
  if (!total || total !== hotspot.report_count) return null;
  return weighted / total;
}

function weatherScore(weather) {
  const temperature = weather?.current?.temperature;
  const precipitation = weather?.current?.precipitation;
  if (!Number.isFinite(temperature) || !Number.isFinite(precipitation) || precipitation < 0) return null;
  // Heuristic scales: 20–40°C maps to 0–100, and 0–50 mm current-period
  // precipitation maps to 0–100. Each is clamped; their mean is the weather term.
  const heat = Math.max(0, Math.min(100, ((temperature - 20) / 20) * 100));
  const rain = Math.max(0, Math.min(100, (precipitation / 50) * 100));
  return (heat + rain) / 2;
}

export function assessClusterRisk(hotspot, weather) {
  const count = hotspot?.report_count;
  const concentration = Number.isFinite(count) && count > 0 ? (100 * count) / (count + 7) : null;
  const severity = severityScore(hotspot);
  const weatherRisk = weatherScore(weather);
  const missing = [
    concentration === null && 'cluster concentration',
    severity === null && 'complete recognized severity counts',
    weatherRisk === null && 'current temperature and precipitation',
  ].filter(Boolean);
  if (missing.length) {
    return { score: null, classification: null, components: { concentration, severity, weather: weatherRisk }, missing };
  }
  const score = Math.round((WEIGHTS.concentration * concentration)
    + (WEIGHTS.severity * severity) + (WEIGHTS.weather * weatherRisk));
  return { score, classification: classifyRisk(score), components: { concentration, severity, weather: weatherRisk }, missing: [] };
}

function categoryKind(category) {
  const value = category.toLowerCase();
  if (value.includes('flood') || value.includes('waterlog') || value.includes('drainage')) return 'flood';
  if (value.includes('heat')) return 'heat';
  if (value.includes('road') || value.includes('infrastructure') || value.includes('tree') || value.includes('power')) return 'infrastructure';
  return null;
}

const PRECAUTIONS = {
  flood: 'Avoid waterlogged routes and do not enter flowing or standing floodwater.',
  heat: 'Limit strenuous outdoor activity, seek shade, and drink water.',
  infrastructure: 'Use an alternate route around the reported hazard and keep a safe distance.',
};

export function generateCategoryAlerts(hotspots = [], weatherByCluster = {}, calculatedAt = new Date().toISOString()) {
  const alerts = [];
  for (const hotspot of hotspots) {
    const counts = hotspot?.categories;
    if (!counts || typeof counts !== 'object') continue;
    const weather = weatherByCluster[hotspot.cluster_id];
    const risk = assessClusterRisk(hotspot, weather);
    for (const [incidentCategory, rawCount] of Object.entries(counts)) {
      const evidenceCount = Number(rawCount);
      const kind = categoryKind(incidentCategory);
      // At least two reports of the same category are required inside a DBSCAN
      // cluster. A single category report is not promoted to a pattern alert.
      if (!kind || !Number.isFinite(evidenceCount) || evidenceCount < 2) continue;
      const temperature = weather?.current?.temperature;
      const precipitation = weather?.current?.precipitation;
      const weatherCondition = kind === 'heat'
        ? Number.isFinite(temperature) && temperature >= 35
        : Number.isFinite(precipitation) && precipitation >= 5;
      if (!weatherCondition) continue;
      alerts.push({
        id: `${hotspot.cluster_id}-${kind}-${incidentCategory}`,
        clusterId: hotspot.cluster_id,
        locality: `Cluster ${hotspot.cluster_id}`,
        incidentCategory,
        evidenceCount,
        score: risk.score,
        classification: risk.classification,
        riskIncomplete: risk.score === null,
        contributingFactors: kind === 'heat'
          ? [`${evidenceCount} ${incidentCategory} reports in one DBSCAN cluster`, `Current model temperature ${temperature}°C (heat trigger ≥35°C)`]
          : [`${evidenceCount} ${incidentCategory} reports in one DBSCAN cluster`, `Current model precipitation ${precipitation} mm (rain trigger ≥5 mm)`],
        precaution: PRECAUTIONS[kind],
        calculatedAt,
      });
    }
  }
  return alerts;
}

export const RISK_SCORING_NOTES = 'Experimental heuristic: 40% concentration (100 × n/(n+7)), 35% mean report severity, 25% weather. Severity maps LOW/MODERATE/HIGH/CRITICAL to 25/50/75/100 (legacy MEDIUM=50). Weather averages a clamped 20–40°C heat scale and 0–50 mm current-period precipitation scale. Missing components make the total incomplete. Weather context alone does not predict an incident.';

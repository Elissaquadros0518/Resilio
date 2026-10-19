const DAY_MS = 24 * 60 * 60 * 1000;
export const INSIGHT_TIME_FILTERS = ['7 Days', '30 Days', '6 Months', '1 Year'];

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function getInsightWindow(timeFilter, now = new Date()) {
  const end = new Date(now);
  const today = startOfUtcDay(end);
  if (timeFilter === '7 Days') return { start: new Date(today.getTime() - 6 * DAY_MS), end, bucket: 'day' };
  if (timeFilter === '30 Days') return { start: new Date(today.getTime() - 29 * DAY_MS), end, bucket: 'day' };
  if (timeFilter === '6 Months') return { start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1)), end, bucket: 'month' };
  if (timeFilter === '1 Year') return { start: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1)), end, bucket: 'month' };
  throw new Error('Choose a supported time range.');
}

function uniqueReports(reports = []) {
  const seen = new Set();
  return reports.filter((report) => {
    if (!report || report.id === null || report.id === undefined) return false;
    const id = String(report.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function timestampOf(report) {
  if (typeof report.createdAt !== 'string' && !(report.createdAt instanceof Date)) return null;
  const timestamp = new Date(report.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function categoryOf(report) {
  return typeof report.category === 'string' && report.category.trim() ? report.category.trim() : 'Other';
}

function groupCounts(reports, keyOf) {
  const counts = new Map();
  for (const report of reports) {
    const key = keyOf(report);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, reports]) => ({ label, reports }))
    .sort((a, b) => b.reports - a.reports || a.label.localeCompare(b.label));
}

function dateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function trendData(reports, window) {
  const bucketCounts = new Map();
  for (const report of reports) {
    const timestamp = timestampOf(report);
    if (timestamp === null) continue;
    const date = new Date(timestamp);
    const key = window.bucket === 'day' ? dateKey(date) : monthKey(date);
    bucketCounts.set(key, (bucketCounts.get(key) || 0) + 1);
  }

  const result = [];
  if (window.bucket === 'day') {
    for (let day = new Date(window.start); day <= window.end; day = new Date(day.getTime() + DAY_MS)) {
      const key = dateKey(day);
      result.push({ key, label: `${String(day.getUTCMonth() + 1).padStart(2, '0')}/${String(day.getUTCDate()).padStart(2, '0')}`, reports: bucketCounts.get(key) || 0 });
    }
    return result;
  }
  for (let month = new Date(Date.UTC(window.start.getUTCFullYear(), window.start.getUTCMonth(), 1)); month <= window.end; month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1))) {
    const key = monthKey(month);
    result.push({ key, label: new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(month), reports: bucketCounts.get(key) || 0 });
  }
  return result;
}

function groupedAreas(reports) {
  const cells = new Map();
  let missingCoordinates = 0;
  for (const report of reports) {
    const latitude = Number(report.lat);
    const longitude = Number(report.lng);
    if (report.lat === null || report.lat === undefined || report.lng === null || report.lng === undefined || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      missingCoordinates += 1;
      continue;
    }
    const latitudeCell = Math.floor(latitude * 200);
    const longitudeCell = Math.floor(longitude * 200);
    const key = `${latitudeCell}:${longitudeCell}`;
    const cell = cells.get(key) || { reports: 0, categories: new Map() };
    cell.reports += 1;
    const category = categoryOf(report);
    cell.categories.set(category, (cell.categories.get(category) || 0) + 1);
    cells.set(key, cell);
  }

  const areas = [...cells.entries()]
    .map(([key, cell]) => {
      const [latitudeCell, longitudeCell] = key.split(':').map(Number);
      const latitude = (latitudeCell + 0.5) / 200;
      const longitude = (longitudeCell + 0.5) / 200;
      const mainCategory = [...cell.categories.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
      return { key, label: `Around ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`, reports: cell.reports, mainCategory };
    })
    .filter((area) => area.reports >= 2)
    .sort((a, b) => b.reports - a.reports || a.label.localeCompare(b.label));
  return { areas: areas.slice(0, 6), missingCoordinates };
}

export function buildReportInsights(reports, { timeFilter = '7 Days', source = 'supabase', now = new Date() } = {}) {
  const unique = uniqueReports(reports);
  const isDemo = source === 'demo';
  const window = getInsightWindow(timeFilter, now);
  const missingTimestamps = unique.filter((report) => timestampOf(report) === null).length;
  const selected = isDemo
    ? unique
    : unique.filter((report) => {
      const timestamp = timestampOf(report);
      return timestamp !== null && timestamp >= window.start.getTime() && timestamp <= window.end.getTime();
    });
  const categories = groupCounts(selected, categoryOf).map(({ label, reports: count }) => ({ category: label, reports: count }));
  const severities = groupCounts(selected, (report) => String(report.severity || 'Unknown').toUpperCase());
  const statuses = groupCounts(selected, (report) => String(report.status || 'Unknown'));
  const areaGroups = groupedAreas(selected);

  return {
    source: isDemo ? 'demo' : 'supabase',
    timeFilter,
    window,
    reports: selected,
    total: selected.length,
    uniqueTotal: unique.length,
    missingTimestamps,
    categories,
    severities,
    statuses,
    trend: isDemo ? [] : trendData(selected, window),
    areas: areaGroups.areas,
    missingCoordinates: areaGroups.missingCoordinates,
  };
}

export function formatUtcWindow(window) {
  const formatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
  return `${formatter.format(window.start)} – ${formatter.format(window.end)} UTC`;
}

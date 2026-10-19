import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const CENTER = [19.076, 72.896];
const CATEGORY_FILTERS = [
  ['ALL', 'All categories'],
  ['Flooding / Waterlogging', 'Flooding'],
  ['Extreme Heat', 'Heat'],
  ['Water Shortage', 'Water shortage'],
  ['Drainage Problem', 'Drainage'],
  ['Road Problem', 'Road'],
  ['Infrastructure Damage', 'Infrastructure'],
  ['Fallen Tree', 'Fallen tree'],
  ['Power Issue', 'Power'],
  ['Other', 'Other'],
];
const SEVERITIES = ['LOW', 'MODERATE', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['Verified', 'Under verification'];
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const escapePopupText = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const markerColor = (severity) => ({
  CRITICAL: '#b91c1c',
  HIGH: '#c2410c',
  MODERATE: '#b45309',
  MEDIUM: '#b45309',
  LOW: '#047857',
}[severity] || '#475569');

function timestampForReport(report) {
  if (report.createdAt) {
    const parsed = new Date(report.createdAt);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  // Sample data uses relative labels instead of timestamps. Interpret those
  // labels only for the clearly marked demo dataset.
  if (report.source === 'demo') {
    const match = String(report.time || '').match(/(\d+)\s+(minute|min|hour|day)s?\s+ago/i);
    if (match) {
      const units = { minute: 60_000, min: 60_000, hour: 3_600_000, day: 86_400_000 };
      return new Date(Date.now() - Number(match[1]) * units[match[2].toLowerCase()]);
    }
    if (/just now|recently/i.test(report.time || '')) return new Date();
  }
  return null;
}

function matchesCategory(report, selected) {
  if (selected === 'ALL') return true;
  return String(report.category || '').toLowerCase() === selected.toLowerCase();
}

function displayDate(report) {
  const date = timestampForReport(report);
  return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable';
}

export default function LiveMapPage({
  reports = [], reportsLoading = false, reportsError = null, reportSource = 'supabase',
  onRefreshReports, selectedIncident, setSelectedIncident, setActiveTab,
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const setSelectedIncidentRef = useRef(setSelectedIncident);
  const setActiveTabRef = useRef(setActiveTab);
  const [mapError, setMapError] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState('ALL');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  useEffect(() => { setSelectedIncidentRef.current = setSelectedIncident; }, [setSelectedIncident]);
  useEffect(() => { setActiveTabRef.current = setActiveTab; }, [setActiveTab]);

  const filteredReports = useMemo(() => {
    const now = Date.now();
    const cutoff = filterDate === '24h' ? now - 24 * 60 * 60 * 1000
      : filterDate === '7d' ? now - 7 * 24 * 60 * 60 * 1000
        : filterDate === '30d' ? now - 30 * 24 * 60 * 60 * 1000 : null;
    return reports.filter((report) => {
      if (!matchesCategory(report, filterCategory)) return false;
      if (filterSeverity !== 'ALL' && report.severity !== filterSeverity) return false;
      if (filterStatus !== 'ALL' && report.status !== filterStatus) return false;
      if (cutoff !== null) {
        const date = timestampForReport(report);
        if (!date || date.getTime() < cutoff) return false;
      }
      return true;
    });
  }, [reports, filterCategory, filterSeverity, filterStatus, filterDate]);

  const locatedReports = useMemo(() => filteredReports.filter((report) =>
    Number.isFinite(report.lat) && report.lat >= -90 && report.lat <= 90
    && Number.isFinite(report.lng) && report.lng >= -180 && report.lng <= 180
  ), [filteredReports]);

  useEffect(() => {
    if (!reportsLoading && !reportsError) setLastUpdatedAt(new Date());
  }, [reports, reportsLoading, reportsError]);

  useEffect(() => {
    if (!mapElementRef.current || !globalThis.L) {
      setMapError('The map library could not be loaded. Refresh this page to try again.');
      return undefined;
    }
    const map = globalThis.L.map(mapElementRef.current, { scrollWheelZoom: true }).setView(CENTER, 14);
    mapRef.current = map;
    globalThis.L.tileLayer(TILE_URL, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(map);
    markerLayerRef.current = globalThis.L.layerGroup().addTo(map);
    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => map.invalidateSize()) : null;
    resizeObserver?.observe(mapElementRef.current);
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => {
      window.clearTimeout(resizeTimer);
      resizeObserver?.disconnect();
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = markerLayerRef.current;
    if (!map || !layerGroup || !globalThis.L) return;
    layerGroup.clearLayers();
    locatedReports.forEach((report) => {
      const color = markerColor(report.severity);
      const icon = globalThis.L.divIcon({
        className: 'riskscape-report-marker',
        html: `<span style="background:${color};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:12px;border:2px solid #fff;box-shadow:0 2px 8px #0f172a55">!</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const marker = globalThis.L.marker([report.lat, report.lng], { icon }).addTo(layerGroup);
      const title = escapePopupText(report.title || report.category || 'Community report');
      const category = escapePopupText(report.category || 'Uncategorized');
      const severity = escapePopupText(report.severity || 'Unknown');
      const status = escapePopupText(report.status || 'Unknown');
      const date = escapePopupText(displayDate(report));
      const location = escapePopupText(report.location || 'Location unavailable');
      marker.bindPopup(`
        <article style="font-family:Inter,system-ui,sans-serif;min-width:210px;max-width:280px;padding:4px;color:#1e293b">
          <h3 style="font-size:15px;font-weight:800;margin:2px 0 8px">${title}</h3>
          <p style="font-size:12px;margin:3px 0"><strong>Category:</strong> ${category}</p>
          <p style="font-size:12px;margin:3px 0"><strong>Severity:</strong> ${severity}</p>
          <p style="font-size:12px;margin:3px 0"><strong>Status:</strong> ${status}</p>
          <p style="font-size:12px;margin:3px 0 8px"><strong>Reported:</strong> ${date}</p>
          <p style="font-size:12px;color:#64748b;margin:0 0 10px">${location}</p>
          <button type="button" data-report-detail="true" style="background:#166534;color:white;border:0;border-radius:8px;padding:7px 10px;font-weight:700;cursor:pointer">View report details</button>
        </article>
      `);
      marker.on('popupopen', ({ popup }) => {
        const detailsButton = popup.getElement()?.querySelector('[data-report-detail]');
        detailsButton?.addEventListener('click', () => {
          setSelectedIncidentRef.current(report);
          setActiveTabRef.current?.('incident-detail');
        }, { once: true });
      });
      marker.on('click', () => setSelectedIncidentRef.current(report));
      if (selectedIncident?.id === report.id) {
        map.setView([report.lat, report.lng], Math.max(map.getZoom(), 16));
        marker.openPopup();
      }
    });
  }, [locatedReports, selectedIncident]);

  const openReportDetails = (report) => {
    setSelectedIncidentRef.current(report);
    setActiveTabRef.current?.('incident-detail');
  };

  const hasFilters = filterCategory !== 'ALL' || filterSeverity !== 'ALL' || filterStatus !== 'ALL' || filterDate !== 'ALL';
  const reportsLoadIssue = reportsError && !(reportSource === 'demo' && /not configured/i.test(reportsError.message || ''));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-5 animate-fadeIn">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">Live Interactive Map</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Community reports with public map details for the ResiliMap coverage area.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onRefreshReports} disabled={!onRefreshReports || reportsLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-200">
            <RefreshCw className={`h-4 w-4 ${reportsLoading ? 'animate-spin' : ''}`} /> {reportsLoading ? 'Refreshing…' : 'Refresh reports'}
          </button>
        </div>
      </div>

      {reportSource === 'demo' && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong>Demo mode:</strong> these are sample reports and are not mixed with persisted community reports.</div>}
      {reportsLoadIssue && <div role="alert" className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between"><span>Could not load the latest report data: {reportsError.message || 'Connection error.'}</span><button type="button" onClick={onRefreshReports} disabled={reportsLoading} className="shrink-0 font-bold underline disabled:opacity-50">Retry</button></div>}

      <section aria-label="Map filters" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-navy-800">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by report category">
          {CATEGORY_FILTERS.map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilterCategory(value)} aria-pressed={filterCategory === value} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${filterCategory === value ? 'bg-emerald-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-navy-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Severity
            <select value={filterSeverity} onChange={(event) => setFilterSeverity(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-100">
              <option value="ALL">All severities</option>{SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-100">
              <option value="ALL">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reported
            <select value={filterDate} onChange={(event) => setFilterDate(event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-100">
              <option value="ALL">Any time</option><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option>
            </select>
          </label>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section aria-label="Community report map" className="relative h-[390px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card sm:h-[520px] lg:col-span-2 dark:border-slate-700 dark:bg-navy-800">
          <div ref={mapElementRef} className="h-full w-full rounded-xl" />
          {mapError && <p role="alert" className="absolute left-4 right-4 top-4 z-[1000] rounded-lg bg-rose-50 p-3 text-sm text-rose-900">{mapError}</p>}
        </section>

        <aside className="flex h-[390px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:h-[520px] dark:border-slate-700 dark:bg-navy-800">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Reports ({filteredReports.length})</h3>
              <p className="mt-1 text-[11px] text-slate-500">{locatedReports.length} shown on map</p>
            </div>
            {lastUpdatedAt && <time className="text-right text-[11px] text-slate-400" dateTime={lastUpdatedAt.toISOString()}>Updated<br />{lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1" aria-label="Marker severity legend">
            {[
              ['CRITICAL', '#b91c1c'], ['HIGH', '#c2410c'], ['MODERATE / MEDIUM', '#b45309'], ['LOW', '#047857'],
            ].map(([label, color]) => <span key={label} className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{label}</span>)}
          </div>
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
            {reportsLoading && <p role="status" className="py-8 text-center text-sm text-slate-500">Loading reports…</p>}
            {!reportsLoading && filteredReports.length === 0 && <div className="py-8 text-center"><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{hasFilters ? 'No reports match these filters.' : 'No reports to show yet.'}</p>{hasFilters && <button type="button" className="mt-2 text-xs font-bold text-tealAccent underline" onClick={() => { setFilterCategory('ALL'); setFilterSeverity('ALL'); setFilterStatus('ALL'); setFilterDate('ALL'); }}>Clear filters</button>}</div>}
            {!reportsLoading && filteredReports.length > 0 && locatedReports.length === 0 && <p className="py-3 text-center text-xs text-slate-500">These reports do not have valid map coordinates. They remain available in the feed.</p>}
            {filteredReports.map((report) => (
              <article key={report.id} className={`w-full rounded-xl border p-3 transition ${selectedIncident?.id === report.id ? 'border-tealAccent bg-tealAccent/10' : 'border-slate-100 dark:border-slate-700/70'}`}>
                <button type="button" onClick={() => { setSelectedIncidentRef.current(report); if (Number.isFinite(report.lat) && Number.isFinite(report.lng)) mapRef.current?.setView([report.lat, report.lng], 16); }} aria-pressed={selectedIncident?.id === report.id} className="w-full text-left">
                  <span className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-extrabold" style={{ color: markerColor(report.severity) }}>{report.severity}</span><span className="shrink-0 text-[10px] text-slate-400">{report.time || displayDate(report)}</span></span>
                  <span className="mt-1 block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{report.title || report.category}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{report.category} · {report.status}</span>
                </button>
                <button type="button" className="mt-2 text-[11px] font-bold text-tealAccent underline" onClick={() => openReportDetails(report)}>View details</button>
              </article>
            ))}
          </div>
        </aside>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">Marker colors show report severity. The heatmap is unavailable until a real report-density layer is implemented. Tiles © OpenStreetMap contributors; map tiles load on demand. <a className="font-semibold underline" href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Report a map issue</a>.</p>
    </div>
  );
}

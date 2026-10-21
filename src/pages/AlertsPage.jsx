import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchHotspots } from '../data/hotspots';

function generatedTime(value) {
  if (!value) return 'Update time unavailable';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `Data generated ${date.toLocaleString()}` : 'Update time unavailable';
}

export default function AlertsPage({ setActiveTab, onSelectHotspot }) {
  const requestRef = useRef(null);
  const [hotspotData, setHotspotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSuccessfulAt, setLastSuccessfulAt] = useState(null);

  const refreshHotspots = useCallback(async () => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const data = await fetchHotspots({ signal: controller.signal });
      setHotspotData(data);
      setLastSuccessfulAt(new Date());
      setError('');
    } catch (fetchError) {
      if (!controller.signal.aborted) setError(fetchError.message || 'Cluster data could not be refreshed.');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshHotspots();
    const interval = window.setInterval(refreshHotspots, 60_000);
    return () => {
      window.clearInterval(interval);
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [refreshHotspots]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Climate Alerts & Early Warnings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Experimental geographic incident clusters from community reports. These are not official warnings, flood predictions, or validated risk scores.</p>
      </div>

      {error && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{hotspotData ? 'Could not refresh cluster data; showing the last successful result.' : 'Experimental cluster data is temporarily unavailable.'} {lastSuccessfulAt && `Last loaded ${lastSuccessfulAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`}</p>}
      {loading && !hotspotData && <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-300">Loading experimental cluster data…</p>}

      {hotspotData?.hotspots.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-card dark:border-slate-700 dark:bg-navy-800 dark:text-slate-300">No DBSCAN clusters are available from the current eligible reports.</div>}

      {hotspotData?.hotspots.length > 0 && <div className="space-y-4">
        {hotspotData.hotspots.map((hotspot) => (
          <article key={hotspot.cluster_id} className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-l-4 border-l-violet-600 border-y-slate-200 border-r-slate-200 bg-white p-5 shadow-card dark:border-y-slate-700 dark:border-r-slate-700 dark:bg-navy-800 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-extrabold text-violet-900 dark:bg-violet-900/40 dark:text-violet-200">EXPERIMENTAL CLUSTER</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cluster {hotspot.cluster_id}</span>
                <span className="text-xs font-medium text-slate-400">{generatedTime(hotspotData.generatedAt)}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{hotspot.report_count} reports grouped geographically</h3>
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">HIGH / CRITICAL reports: {hotspot.high_or_critical} · DBSCAN neighborhood distance: {hotspotData.radiusMeters} m</p>
              <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Category breakdown: </span>
                {Object.entries(hotspot.categories).map(([category, count]) => `${category}: ${count}`).join(' · ') || 'None returned'}
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">The {hotspotData.radiusMeters} m value is DBSCAN’s neighborhood distance, not a maximum distance from the centroid. This cluster’s geographic extent is not a flood-risk boundary.</p>
            </div>
            <button
              type="button"
              onClick={() => { onSelectHotspot?.(hotspot.cluster_id); setActiveTab('map'); }}
              className="shrink-0 rounded-xl bg-emerald-800 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-900"
            >
              View Map
            </button>
          </article>
        ))}
      </div>}
    </div>
  );
}

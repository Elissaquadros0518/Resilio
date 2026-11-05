import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchHotspots } from '../data/hotspots';
import { fetchWeather } from '../data/weather';
import { assessClusterRisk, generateCategoryAlerts, RISK_SCORING_NOTES } from '../data/riskIntelligence';

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
  const [weatherByCluster, setWeatherByCluster] = useState({});

  const refreshHotspots = useCallback(async () => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    try {
      const data = await fetchHotspots({ signal: controller.signal });
      const weatherResults = await Promise.all(data.hotspots.map(async (hotspot) => {
        try {
          const weather = await fetchWeather(hotspot.latitude, hotspot.longitude);
          return [hotspot.cluster_id, weather];
        } catch {
          return [hotspot.cluster_id, null];
        }
      }));
      if (controller.signal.aborted) return;
      setHotspotData(data);
      setWeatherByCluster(Object.fromEntries(weatherResults));
      setLastSuccessfulAt(new Date());
      setError('');
    } catch (fetchError) {
      if (!controller.signal.aborted) setError(fetchError.message || 'Cluster data could not be refreshed.');
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const calculatedAt = lastSuccessfulAt?.toISOString() || hotspotData?.generatedAt || null;
  const categoryAlerts = hotspotData
    ? generateCategoryAlerts(hotspotData.hotspots, weatherByCluster, calculatedAt || new Date().toISOString())
    : [];

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

      {hotspotData?.hotspots.length > 0 && <section aria-labelledby="hyperlocal-risk-title" className="space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <h3 id="hyperlocal-risk-title" className="font-extrabold">Experimental hyperlocal risk assessment</h3>
          <p className="mt-1">{RISK_SCORING_NOTES}</p>
          <p className="mt-1">Uses eligible Supabase reports already returned by the hotspot API and Open-Meteo model estimates at each cluster center. It is not an official warning or validated disaster prediction.</p>
          <p className="mt-1">DBSCAN noise points are not included in cluster scores or category alerts. Risk bands: 0–24 Low, 25–49 Moderate, 50–74 High, 75–100 Critical.</p>
        </div>
        {hotspotData.hotspots.map((hotspot) => {
          const weather = weatherByCluster[hotspot.cluster_id];
          const risk = assessClusterRisk(hotspot, weather);
          const dominant = Object.entries(hotspot.categories).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'Unknown';
          return <article key={`risk-${hotspot.cluster_id}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-navy-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Cluster {hotspot.cluster_id} · {hotspot.report_count} eligible reports</p><h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-slate-100">{dominant}</h3></div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-right dark:bg-navy-900"><div className="text-xs text-slate-500 dark:text-slate-400">Risk score</div><div className="font-extrabold text-slate-900 dark:text-slate-100">{risk.score === null ? 'Incomplete' : `${risk.score}/100 · ${risk.classification}`}</div></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-navy-900">Temperature <strong>{Number.isFinite(weather?.current?.temperature) ? `${weather.current.temperature}°C` : 'Unavailable'}</strong></div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-navy-900">Precipitation <strong>{Number.isFinite(weather?.current?.precipitation) ? `${weather.current.precipitation} mm` : 'Unavailable'}</strong></div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-navy-900">Severity mix <strong>{risk.components.severity === null ? 'Incomplete' : `${Math.round(risk.components.severity)}/100`}</strong></div>
            </div>
            {risk.missing.length > 0 && <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">Incomplete because {risk.missing.join(' and ')} {risk.missing.length === 1 ? 'is' : 'are'} unavailable.</p>}
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Calculated {calculatedAt ? new Date(calculatedAt).toLocaleString() : 'when current data is available'}. Weather is a context signal, not an incident prediction.</p>
          </article>;
        })}
      </section>}

      {hotspotData && <section aria-labelledby="category-alerts-title" className="space-y-3">
        <h3 id="category-alerts-title" className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Category-specific alerts</h3>
        {categoryAlerts.length === 0
          ? <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-300">No category alert currently meets both the clustered evidence and weather thresholds. Isolated category reports are not promoted to alerts.</p>
          : categoryAlerts.map((alert) => <article key={alert.id} className="rounded-2xl border border-orange-200 bg-white p-5 shadow-card dark:border-orange-900 dark:bg-navy-800">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-extrabold text-orange-900 dark:bg-orange-900/40 dark:text-orange-200">{alert.classification ? `${alert.classification.toUpperCase()} RISK` : 'INCOMPLETE RISK'}</span><span className="text-xs text-slate-500 dark:text-slate-400">{alert.locality} · {alert.evidenceCount} matching reports</span></div>
            <h4 className="mt-2 font-extrabold text-slate-900 dark:text-slate-100">{alert.incidentCategory}{alert.score !== null ? ` · ${alert.score}/100` : ''}</h4>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">Why this alert: {alert.contributingFactors.join('; ')}.</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Precaution: {alert.precaution}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Last calculated {new Date(alert.calculatedAt).toLocaleString()}</p>
          </article>)}
      </section>}

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

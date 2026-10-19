import React, { useCallback, useEffect, useState } from 'react';
import { Award, CheckCircle, Clock, FileText, RefreshCw, XCircle } from 'lucide-react';
import { fetchCommunityOverview } from '../data/reports';

const numberFormat = new Intl.NumberFormat();

function formatAverage(seconds) {
  const value = Number(seconds);
  if (seconds === null || seconds === undefined || !Number.isFinite(value) || value < 0) return 'N/A';
  if (value < 60) return `${Math.round(value)} sec`;
  if (value < 3600) return `${Math.round(value / 60)} min`;
  return `${(value / 3600).toFixed(1)} hrs`;
}

function formatDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function formatRefreshedAt(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(value);
}

export default function CommunityPage({ onOpenReport }) {
  const [communityData, setCommunityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const loadCommunityData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommunityOverview();
      setCommunityData(data);
      setLastRefreshed(new Date());
    } catch (loadError) {
      setCommunityData(null);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  // The page mounts when opened and remounts when the user returns to it.
  useEffect(() => { loadCommunityData(); }, [loadCommunityData]);

  const summary = communityData?.summary || null;
  const contributors = Array.isArray(summary?.contributors) ? summary.contributors : [];
  const stats = [
    { label: 'Reports Submitted', value: summary ? numberFormat.format(summary.total_reports || 0) : '—', icon: FileText, color: 'text-skyBlue' },
    { label: 'Verified Reports', value: summary ? numberFormat.format(summary.verified_reports || 0) : '—', icon: CheckCircle, color: 'text-safeGreen' },
    { label: 'Rejected Reports', value: summary ? numberFormat.format(summary.rejected_reports || 0) : '—', icon: XCircle, color: 'text-criticalRed' },
    { label: 'Avg Verification Time', value: summary ? formatAverage(summary.average_verification_seconds) : '—', icon: Clock, color: 'text-warmOrange' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-8 animate-fadeIn">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">ResiliMap Community</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Neighbourhood participation making our community resilient, transparent, and connected.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && <span className="text-xs font-semibold text-slate-400">Last refreshed {formatRefreshedAt(lastRefreshed)}</span>}
          <button type="button" onClick={loadCommunityData} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700" aria-label="Refresh community data">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          <span>Community data could not be loaded: {error.message || 'Please try again.'}</span>
          <button type="button" onClick={loadCommunityData} disabled={loading} className="shrink-0 font-bold underline disabled:opacity-60">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" aria-busy={loading}>
        {stats.map((stat) => {
          const IconComp = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-navy-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-card">
              <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-navy-700 w-fit mb-3 ${stat.color}`}>
                <IconComp className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100" aria-live="polite">{loading && !summary ? '…' : stat.value}</div>
              <div className="text-xs font-semibold text-slate-500 mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-navy-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Award className="w-5 h-5 text-warmOrange" aria-hidden="true" />
            <span>Top Community Contributors</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">Verified reports</span>
        </div>
        {error && !summary ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">Contributor data is unavailable until the community request succeeds.</div>
        ) : loading && !summary ? (
          <div role="status" className="py-6 text-center text-sm text-slate-500">Loading contributor totals…</div>
        ) : contributors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">No verified contributions yet.</div>
        ) : (
          <div className="space-y-3.5">
            {contributors.map((contributor, index) => {
              const rank = Number(contributor.rank) || index + 1;
              return (
                <div key={`${rank}-${contributor.name}`} className="p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-sm ${
                      rank === 1 ? 'bg-warmOrange text-white' : rank === 2 ? 'bg-slate-300 text-slate-900' : 'bg-tealAccent/20 text-tealAccent'
                    }`}>#{rank}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{contributor.name || 'Community member'}</div>
                      <div className="text-xs font-medium text-slate-500">{numberFormat.format(contributor.verified_reports || 0)} verified reports</div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-extrabold px-3.5 py-1.5 rounded-full bg-tealAccent/15 text-tealAccent">{numberFormat.format(contributor.verified_reports || 0)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-navy-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Recent Community Reports</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Published reports visible to the community.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{communityData ? `${communityData.recentReports.length} reports` : ''}</span>
        </div>
        {error && !communityData ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">Recent reports are unavailable until the community request succeeds.</div>
        ) : loading && !communityData ? (
          <div role="status" className="py-6 text-center text-sm text-slate-500">Loading recent reports…</div>
        ) : communityData?.recentReports.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/70">
            {communityData.recentReports.map((report) => (
              <div key={report.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  {onOpenReport ? (
                    <button type="button" onClick={() => onOpenReport(report.id)} className="text-left font-bold text-sm text-slate-900 hover:text-tealAccent hover:underline dark:text-slate-100">{report.title}</button>
                  ) : <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{report.title}</div>}
                  <div className="mt-1 text-xs font-medium text-slate-500">{report.category} · {report.location} · {formatDate(report.createdAt)}</div>
                </div>
                <span className="w-fit shrink-0 rounded-full bg-safeGreen/10 px-3 py-1 text-xs font-bold text-safeGreen">{report.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">No public reports are available yet.</div>
        )}
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { CloudRain, RefreshCw, ShieldAlert, Sun } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import WeatherSnapshot from '../components/WeatherSnapshot';
import { buildReportInsights, formatUtcWindow, INSIGHT_TIME_FILTERS } from '../data/insights';

const CHART_COLORS = ['#0F766E', '#2563EB', '#D97706', '#7C3AED', '#DB2777', '#475569', '#059669', '#EA580C'];

function Distribution({ title, items }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-navy-800">
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h4>
      {items.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item.label} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-navy-900 dark:text-slate-200">
              <span className="font-semibold">{item.label}</span><span className="ml-2 font-bold">{item.reports}</span>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">No reports in this range.</p>}
    </section>
  );
}

function ChartEmpty({ children }) {
  return <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-400">{children}</div>;
}

export default function RiskInsightsPage({ darkMode, reports = [], reportSource = 'demo', reportsLoading = false, reportsError = null, reportsUpdatedAt = null, onRefreshReports }) {
  const [timeFilter, setTimeFilter] = useState('7 Days');
  const insights = useMemo(() => buildReportInsights(reports, { timeFilter, source: reportSource }), [reports, timeFilter, reportSource]);
  const demoMode = insights.source === 'demo';
  const axisColor = darkMode ? '#CBD5E1' : '#64748B';
  const tooltipStyle = { backgroundColor: darkMode ? '#0F1E36' : '#FFFFFF', borderColor: darkMode ? '#334155' : '#CBD5E1', borderRadius: '10px', color: darkMode ? '#F8FAFC' : '#1E293B' };
  const reportSummary = insights.total === 0
    ? 'No reports fall within the selected period.'
    : `${insights.total} ${insights.total === 1 ? 'report' : 'reports'} in the selected period. ${insights.categories.map((item) => `${item.category}: ${item.reports}`).join('; ')}.`;
  const severitySummary = insights.severities.map((item) => `${item.label}: ${item.reports}`).join(', ') || 'none';
  const statusSummary = insights.statuses.map((item) => `${item.label}: ${item.reports}`).join(', ') || 'none';

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Climate Risk Insights</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">Community-submitted observations and independent weather forecasts, shown as separate data sources.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div aria-label="Filter report insights by time range" className="flex flex-wrap rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-navy-800">
            {INSIGHT_TIME_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setTimeFilter(filter)}
                disabled={demoMode || reportsLoading}
                title={demoMode ? 'Exact creation timestamps are not available in demo records.' : undefined}
                aria-pressed={timeFilter === filter}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${
                  timeFilter === filter ? 'bg-white text-emerald-900 shadow-sm dark:bg-navy-700 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                }`}
              >{filter}</button>
            ))}
          </div>
          {onRefreshReports && <button type="button" onClick={onRefreshReports} disabled={reportsLoading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:opacity-50 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-200 dark:hover:bg-navy-700"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${reportsLoading ? 'animate-spin' : ''}`} />Refresh reports</button>}
        </div>
      </div>

      <WeatherSnapshot reports={reports} reportSource={reportSource} />

      {demoMode && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <strong>Demo reports only.</strong> {reportsError?.message || 'The Supabase report feed is not available.'} Sample records below are never mixed with persisted reports. Their relative-time labels are not exact timestamps, so date filters and trends are unavailable in demo mode.
          {onRefreshReports && <button type="button" onClick={onRefreshReports} disabled={reportsLoading} className="ml-2 font-bold underline disabled:opacity-50">{reportsLoading ? 'Refreshing…' : 'Retry'}</button>}
        </div>
      )}
      {!demoMode && reportsError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          Latest report refresh failed: {reportsError.message || 'Unknown error.'} {reportsUpdatedAt ? 'The displayed report snapshot is from the previous successful refresh.' : ''}
          {onRefreshReports && <button type="button" onClick={onRefreshReports} disabled={reportsLoading} className="ml-2 font-bold underline disabled:opacity-50">Retry</button>}
        </div>
      )}

      <section aria-labelledby="report-summary-title" className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 dark:border-slate-700 dark:bg-navy-800 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800 dark:border-slate-600 dark:bg-navy-700 dark:text-emerald-300">{demoMode ? 'DEMO REPORTS' : 'COMMUNITY REPORTS'}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{demoMode ? 'All sample records · no date filter' : `${timeFilter} · ${formatUtcWindow(insights.window)}`}</span>
            </div>
            <h3 id="report-summary-title" className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100">{reportsLoading ? 'Loading report insights…' : `${insights.total} ${insights.total === 1 ? 'report' : 'reports'}`}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{reportsLoading ? 'Fetching the report data available to this session.' : reportSummary}</p>
            {!demoMode && insights.missingTimestamps > 0 && <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{insights.missingTimestamps} record(s) without a valid creation timestamp were excluded from this date range.</p>}
            {demoMode && <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">Time trends are unavailable because demo data contains relative labels, not exact created-at timestamps.</p>}
          </div>
          <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
            {reportsUpdatedAt && !demoMode ? `Reports refreshed ${new Date(reportsUpdatedAt).toLocaleString()}` : demoMode ? 'Sample data · not a live refresh' : 'Awaiting report data'}
          </div>
        </div>
      </section>

      {reportsLoading ? (
        <div role="status" className="grid grid-cols-1 gap-6 lg:grid-cols-2"><div className="h-80 animate-pulse rounded-3xl bg-slate-100 dark:bg-navy-800" /><div className="h-80 animate-pulse rounded-3xl bg-slate-100 dark:bg-navy-800" /></div>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/25 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-950 dark:text-amber-100"><ShieldAlert aria-hidden="true" className="h-4 w-4" />Composite environmental-risk indicator</h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-amber-900 dark:text-amber-200">Insufficient data. A defensible composite requires a calibrated hazard baseline and exposure data; community reports and general weather forecasts alone do not provide either. No score is calculated.</p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-amber-900 dark:bg-navy-800 dark:text-amber-200">Insufficient data</span>
          </section>

          <section aria-label="Report severity and status summary" className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Distribution title={`Severity distribution · ${severitySummary}`} items={insights.severities} />
            <Distribution title={`Status distribution · ${statusSummary}`} items={insights.statuses} />
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section aria-labelledby="trend-title" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700/80 dark:bg-navy-800 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 id="trend-title" className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100"><CloudRain aria-hidden="true" className="h-4 w-4 text-sky-700 dark:text-sky-300" />Report submissions over time</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Count of unique reports by UTC {insights.window.bucket === 'day' ? 'calendar day' : 'calendar month'}.</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{demoMode ? 'Demo dates unavailable' : timeFilter}</span>
              </div>
              {demoMode ? <ChartEmpty>Exact dates are not included in the demo records. No trend is inferred from relative labels.</ChartEmpty> : insights.total === 0 ? <ChartEmpty>No report submissions in this selected period.</ChartEmpty> : (
                <div className="h-72 w-full" role="img" aria-label={`Line chart of unique report submissions by ${insights.window.bucket} for ${timeFilter}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={insights.trend} margin={{ top: 12, right: 16, left: 0, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#475569' : '#CBD5E1'} opacity={0.55} />
                      <XAxis dataKey="label" stroke={axisColor} fontSize={11} interval="preserveStartEnd" />
                      <YAxis stroke={axisColor} fontSize={11} allowDecimals={false} width={34} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} ${value === 1 ? 'report' : 'reports'}`, 'Submissions']} labelFormatter={(label) => `${insights.window.bucket === 'day' ? 'UTC date' : 'UTC month'}: ${label}`} />
                      <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
                      <Line name="Report submissions" type="monotone" dataKey="reports" stroke="#0F766E" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="sr-only">{demoMode ? 'Trend chart is unavailable for demo records because their timestamps are not exact.' : `Unique report submissions in this range: ${insights.total}.`}</p>
            </section>

            <section aria-labelledby="category-title" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700/80 dark:bg-navy-800 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 id="category-title" className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100"><Sun aria-hidden="true" className="h-4 w-4 text-amber-700 dark:text-amber-300" />Reports by category</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Unique community reports in the selected date range.</p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{demoMode ? 'Demo sample' : timeFilter}</span>
              </div>
              {insights.categories.length === 0 ? <ChartEmpty>No category totals are available for this period.</ChartEmpty> : (
                <div className="h-72 w-full" role="img" aria-label="Horizontal bar chart of unique reports by category">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights.categories} layout="vertical" margin={{ top: 8, right: 18, left: 4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#475569' : '#CBD5E1'} opacity={0.55} horizontal={false} />
                      <XAxis type="number" stroke={axisColor} fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="category" stroke={axisColor} fontSize={10} width={120} tick={{ width: 116 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} ${value === 1 ? 'report' : 'reports'}`, 'Submissions']} />
                      <Legend wrapperStyle={{ color: axisColor, fontSize: 12 }} />
                      <Bar name="Report submissions" dataKey="reports" fill="#0F766E" radius={[0, 6, 6, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="sr-only">Category totals: {insights.categories.map((item) => `${item.category}, ${item.reports} reports`).join('; ') || 'no reports'}.</p>
            </section>
          </div>

          <section aria-label="Report data summary" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-200">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Accessible report summary</h3>
            <p className="mt-1">{reportSummary} Severity: {severitySummary}. Status: {statusSummary}. {insights.missingCoordinates} report(s) have no valid coordinates and are excluded from geographic grouping.</p>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Report concentrations</h3>
              <p className="mt-1 max-w-4xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">Groups use fixed 0.005° latitude/longitude grid cells (about 0.5 × 0.5 km near Vidyavihar). Only cells with at least 2 reports are shown, ordered by count. This is report density, not a hazard estimate, risk score, or population-exposure measure.</p>
            </div>
            {insights.areas.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {insights.areas.map((area, index) => (
                  <article key={area.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-navy-800">
                    <div className="flex items-start justify-between gap-3"><h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{area.label}</h4><span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-navy-700 dark:text-slate-200">#{index + 1}</span></div>
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{area.reports} {area.reports === 1 ? 'submitted report' : 'submitted reports'}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Most reported category: {area.mainCategory}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-400">{insights.total === 0 ? 'No report coordinates are available for this period.' : 'No grid cell has at least 2 reports with valid coordinates in this period.'}</p>
            )}
          </section>

        </>
      )}
    </div>
  );
}

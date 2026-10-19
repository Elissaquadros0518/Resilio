import React from 'react';
import { ShieldAlert, AlertTriangle, MapPin, ArrowRight, ExternalLink, PlusCircle, Map } from 'lucide-react';
import HomeWeatherConditions from '../components/HomeWeatherConditions';

export default function HomePage({ setActiveTab, reports = [], reportsLoading, reportsError, reportSource = 'demo', onRetryReports, canRetryReports = false }) {
  const recentReports = reports.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-8 animate-fadeIn">
      
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-slate-900 p-6 sm:p-10 rounded-3xl border border-emerald-100 shadow-card overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-white text-emerald-800 border border-emerald-200 text-xs font-bold px-3.5 py-1 rounded-full flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-700"></span>
              <span>Community reports & local weather</span>
            </span>
            <span className="bg-white text-slate-600 border border-slate-200 text-xs font-medium px-3.5 py-1 rounded-full flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-800" />
              <span>Vidyavihar, Mumbai, Maharashtra</span>
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-2xl">
            Turn local observations into smarter climate action.
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
            Your neighbourhood. Your observations. A more resilient community. View community reports alongside weather estimates for local context.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={() => setActiveTab('report')}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-3 rounded-xl text-sm font-bold transition flex items-center space-x-2.5"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Report an Issue</span>
            </button>
            <button 
              onClick={() => setActiveTab('map')}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-5 py-3 rounded-xl text-sm font-bold transition flex items-center space-x-2.5"
            >
              <Map className="w-5 h-5" />
              <span>Explore Live Map</span>
            </button>
          </div>
        </div>
      </div>

      <HomeWeatherConditions />

      {/* Risk Overview Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-tealAccent" />
              <span>Risk Overview</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recent community reports submitted to Riskscape.</p>
          </div>
          <button onClick={() => setActiveTab('map')} className="text-xs font-bold text-tealAccent hover:underline flex items-center space-x-1">
            <span>View all reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {reportSource === 'demo' && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><span className="font-bold">Demo sample reports.</span> These examples are not live community submissions. {reportsError?.message || ''} {canRetryReports && <button type="button" onClick={onRetryReports} disabled={reportsLoading} className="ml-1 font-bold underline disabled:opacity-60">{reportsLoading ? 'Connecting…' : 'Retry live reports'}</button>}</p>}
        {reportSource !== 'demo' && reportsError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">Live reports could not be refreshed: {reportsError.message || 'Connection error.'} {canRetryReports && <button type="button" onClick={onRetryReports} disabled={reportsLoading} className="font-bold underline disabled:opacity-60">Retry</button>}</p>}
        {reportsLoading && <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-300">Loading reports…</p>}
        {!reportsLoading && !recentReports.length && !reportsError && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center dark:border-slate-700 dark:bg-navy-800"><p className="font-semibold text-slate-800 dark:text-slate-100">No community reports yet</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">New reports will appear here after they are submitted.</p><button type="button" onClick={() => setActiveTab('report')} className="mt-4 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-900">Report an issue</button></div>}
        {!reportsLoading && !recentReports.length && reportsError && reportSource !== 'demo' && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">Reports are unavailable. Retry the connection to load the current Riskscape data.</div>}
        {recentReports.length > 0 && <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {recentReports.map((rep) => (
            <article key={rep.id} className="bg-white dark:bg-navy-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-card flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                    rep.severity === 'CRITICAL' ? 'bg-criticalRed/15 text-criticalRed' :
                    rep.severity === 'HIGH' ? 'bg-warmOrange/15 text-warmOrange' : 'bg-amber-500/15 text-amber-500'
                  }`}>
                    {rep.severity} SEVERITY
                  </span>
                  <span className="text-xs font-medium text-slate-400">{rep.time}</span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-tealAccent" />
                  <span>{rep.title || rep.category}</span>
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-skyBlue" />
                  <span>{rep.location}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{rep.description}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${rep.status === 'Resolved' || rep.status === 'Verified' || rep.status === 'Authority notified' ? 'bg-safeGreen/15 text-safeGreen' : rep.status === 'Rejected' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>
                  {rep.status}
                </span>
                <button onClick={() => setActiveTab('map')} className="text-xs font-bold text-tealAccent hover:underline flex items-center space-x-1">
                  <span>View on map</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>}
        {reportSource === 'demo' && recentReports.length > 0 && <p className="text-[11px] text-slate-500 dark:text-slate-400">Cards above are sample entries from the development dataset.</p>}
      </div>

    </div>
  );
}

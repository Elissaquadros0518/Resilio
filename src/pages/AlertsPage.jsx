import React from 'react';

export default function AlertsPage({ notifications, setActiveTab }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Climate Alerts & Early Warnings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time hazard advisories issued for Vidyavihar ward via Riskscape.</p>
      </div>

      <div className="space-y-4">
        {notifications.map(n => (
          <div key={n.id} className={`p-5 rounded-2xl border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-navy-800 ${
            n.type === 'CRITICAL' ? 'border-l-4 border-l-criticalRed border-y-slate-200 border-r-slate-200 dark:border-y-slate-700 dark:border-r-slate-700' :
            n.type === 'WARNING' ? 'border-l-4 border-l-amber-600 border-y-slate-200 border-r-slate-200 dark:border-y-slate-700 dark:border-r-slate-700' : 'border-slate-200 dark:border-slate-700'
          }`}>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                  n.type === 'CRITICAL' ? 'bg-criticalRed text-white' :
                  n.type === 'WARNING' ? 'bg-warmOrange text-white' : 'bg-tealAccent/15 text-tealAccent'
                }`}>
                  {n.type}
                </span>
                <span className="text-xs font-medium text-slate-400">{n.time}</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{n.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{n.desc}</p>
            </div>
            <button
              onClick={() => setActiveTab('map')}
              className="px-4 py-2.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition shrink-0"
            >
              View Map
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

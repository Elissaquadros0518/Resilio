import React from 'react';

export default function AlertsPage({ notifications, setActiveTab }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Climate Alerts & Early Warnings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time hazard advisories issued for Vidyavihar ward.</p>
      </div>

      <div className="space-y-4">
        {notifications.map(n => (
          <div key={n.id} className={`p-6 rounded-3xl border shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            n.type === 'CRITICAL' ? 'bg-criticalRed/10 border-criticalRed/30' :
            n.type === 'WARNING' ? 'bg-warmOrange/10 border-warmOrange/30' : 'bg-white dark:bg-navy-800 border-slate-200 dark:border-slate-700'
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
              className="px-5 py-2.5 bg-slate-900 dark:bg-navy-700 text-white rounded-2xl text-xs font-bold hover:bg-tealAccent transition shrink-0 shadow-sm"
            >
              View Map
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
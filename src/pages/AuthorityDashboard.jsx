import React from 'react';

export default function AuthorityDashboard({ reports, setReports, showToast }) {
  const handleVerify = (id) => {
    setReports(reports.map(r => r.id === id ? { ...r, status: 'Verified', verified: true } : r));
    showToast(`Report ${id} verified successfully.`);
  };

  const handleResolve = (id) => {
    setReports(reports.map(r => r.id === id ? { ...r, status: 'Resolved' } : r));
    showToast(`Report ${id} marked as resolved.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="bg-warmOrange/20 text-warmOrange text-xs font-extrabold px-3.5 py-1 rounded-full">
            Municipal Ward N Authority Portal
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">Authority Incident Command</h2>
          <p className="text-sm text-slate-500">Verify community submissions, assign field teams, and manage priority queues.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
        {[
          { label: 'Active Incidents', val: '142', color: 'text-skyBlue' },
          { label: 'Critical', val: '18', color: 'text-criticalRed' },
          { label: 'High Priority', val: '47', color: 'text-warmOrange' },
          { label: 'Pending Verification', val: '29', color: 'text-amber-500' },
          { label: 'Resolved Today', val: '36', color: 'text-safeGreen' }
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card">
            <div className={`text-3xl font-extrabold ${s.color}`}>{s.val}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-navy-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">Priority Response Queue & Incident Manager</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-navy-900 text-slate-400 text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="p-5">Incident ID / Category</th>
                <th className="p-5">Location</th>
                <th className="p-5">Severity</th>
                <th className="p-5">Status</th>
                <th className="p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {reports.map(rep => (
                <tr key={rep.id} className="hover:bg-slate-50 dark:hover:bg-navy-700/40 transition">
                  <td className="p-5">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{rep.category}</div>
                    <div className="text-xs text-slate-400 font-medium">{rep.id} • {rep.time}</div>
                  </td>
                  <td className="p-5 text-xs font-medium text-slate-600 dark:text-slate-300">{rep.location}</td>
                  <td className="p-5">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                      rep.severity === 'CRITICAL' ? 'bg-criticalRed/15 text-criticalRed' : 'bg-warmOrange/15 text-warmOrange'
                    }`}>
                      {rep.severity}
                    </span>
                  </td>
                  <td className="p-5">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      rep.status === 'Resolved' ? 'bg-safeGreen/15 text-safeGreen' : 'bg-amber-500/15 text-amber-500'
                    }`}>
                      {rep.status}
                    </span>
                  </td>
                  <td className="p-5 text-right space-x-2">
                    {!rep.verified && (
                      <button 
                        onClick={() => handleVerify(rep.id)}
                        className="px-4 py-2 bg-tealAccent text-white rounded-xl text-xs font-bold hover:opacity-90 transition shadow-sm"
                      >
                        Verify
                      </button>
                    )}
                    {rep.status !== 'Resolved' && (
                      <button 
                        onClick={() => handleResolve(rep.id)}
                        className="px-4 py-2 bg-slate-900 dark:bg-navy-700 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-sm"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
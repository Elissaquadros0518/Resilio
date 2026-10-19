import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { fetchReportEvidenceLinks } from '../data/reports';

export default function IncidentDetailPage({ incident, setActiveTab, returnTab = 'map' }) {
  const [evidenceLinks, setEvidenceLinks] = useState([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceRetry, setEvidenceRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setEvidenceLinks([]);
    setEvidenceError('');
    setEvidenceLoading(false);
    if (!incident?.id || incident.source === 'demo') return () => { active = false; };
    setEvidenceLoading(true);
    fetchReportEvidenceLinks(incident.id)
      .then((links) => { if (active) setEvidenceLinks(links); })
      .catch((error) => { if (active) setEvidenceError(error?.message || 'Evidence could not be loaded.'); })
      .finally(() => { if (active) setEvidenceLoading(false); });
    return () => { active = false; };
  }, [incident?.id, incident?.source, evidenceRetry]);

  if (!incident) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-500">No incident selected.</p>
        <button onClick={() => setActiveTab(returnTab)} className="px-5 py-2.5 bg-tealAccent text-white rounded-2xl text-sm font-bold shadow-md">Back to {returnTab === 'profile' ? 'My Reports' : 'Map'}</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <button onClick={() => setActiveTab(returnTab)} className="text-xs font-bold text-tealAccent flex items-center space-x-1.5 hover:underline">
        <ArrowLeft className="w-4 h-4" />
        <span>{returnTab === 'profile' ? 'Back to My Reports' : 'Back to Live Map'}</span>
      </button>

      <div className="bg-white dark:bg-navy-800 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
            incident.severity === 'CRITICAL' ? 'bg-criticalRed/15 text-criticalRed' : 'bg-warmOrange/15 text-warmOrange'
          }`}>
            {incident.severity} SEVERITY
          </span>
          <span className="text-xs font-semibold text-slate-400">Report ID: {incident.id}</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{incident.category}</h2>
        <div className="text-sm font-medium text-slate-500 flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-skyBlue" />
          <span>{incident.location}</span>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{incident.description}</p>
        {evidenceLoading ? <div role="status" className="flex h-72 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-400">Loading report photos…</div>
          : evidenceError ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">Evidence could not be loaded: {evidenceError}<button type="button" onClick={() => setEvidenceRetry((value) => value + 1)} className="ml-2 font-bold underline">Retry</button></div>
            : incident.source === 'demo' ? <div className="flex h-72 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-400">Evidence is unavailable for demonstration reports.</div>
              : evidenceLinks.length === 0 ? <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-400">No photos were uploaded for this report.</div>
                : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{evidenceLinks.map((item) => <div key={item.id} className="h-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner dark:border-slate-700 dark:bg-navy-900">{item.media_type === 'video'
                  ? <video src={item.signedUrl} controls className="h-full w-full object-contain bg-slate-950" aria-label="Private report evidence video" />
                  : <img src={item.signedUrl} alt="Community-submitted evidence for this report" loading="lazy" className="h-full w-full object-contain" />}</div>)}</div>}
      </div>
    </div>
  );
}

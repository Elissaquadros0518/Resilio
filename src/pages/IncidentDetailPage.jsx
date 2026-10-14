import React from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';

export default function IncidentDetailPage({ incident, setActiveTab }) {
  if (!incident) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-500">No incident selected.</p>
        <button onClick={() => setActiveTab('map')} className="px-5 py-2.5 bg-tealAccent text-white rounded-2xl text-sm font-bold shadow-md">Back to Map</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <button onClick={() => setActiveTab('map')} className="text-xs font-bold text-tealAccent flex items-center space-x-1.5 hover:underline">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Live Map</span>
      </button>

      <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-6">
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
        <div className="rounded-2xl overflow-hidden h-72 border border-slate-200 dark:border-slate-700 shadow-inner">
          <img src={incident.evidence} alt="Evidence" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
}
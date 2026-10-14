import React from 'react';
import { MapPin, Phone, Navigation } from 'lucide-react';
import { EMERGENCY_RESOURCES } from '../data/mockData';

export default function ResourcesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Nearby Emergency Resources</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Verified hospitals, fire stations, police posts, and emergency shelters around Vidyavihar, Mumbai.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {EMERGENCY_RESOURCES.map(res => (
          <div key={res.id} className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-tealAccent/15 text-tealAccent">
                  {res.type}
                </span>
                <span className="text-xs font-bold text-slate-400">{res.distance} away</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{res.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-skyBlue shrink-0 mt-0.5" />
                <span>{res.address}</span>
              </p>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-bold flex items-center space-x-2">
                <Phone className="w-4 h-4 text-safeGreen shrink-0" />
                <span>{res.phone}</span>
              </p>
            </div>
            <button 
              onClick={() => alert(`Directions to ${res.name} opened in navigation app.`)}
              className="w-full bg-slate-100 dark:bg-navy-700 hover:bg-tealAccent hover:text-white text-slate-800 dark:text-slate-200 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <Navigation className="w-4 h-4" />
              <span>Get Directions</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
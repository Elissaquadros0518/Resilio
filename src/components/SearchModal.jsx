import React from 'react';
import { Search, MapPin, Hospital } from 'lucide-react';

export default function SearchModal({ isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery, setActiveTab }) {
  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-start justify-center pt-24 px-4 animate-fadeIn">
      <div className="bg-white dark:bg-navy-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search Riskscape locations, incidents, or emergency resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm font-medium"
            autoFocus
          />
          <button onClick={() => setIsSearchOpen(false)} className="text-xs px-2.5 py-1.5 bg-slate-100 dark:bg-navy-700 rounded-xl text-slate-500 font-semibold">ESC</button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Quick Navigation</div>
          <div 
            onClick={() => { setIsSearchOpen(false); setActiveTab('map'); }}
            className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-navy-700/50 flex items-center justify-between cursor-pointer transition"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-skyBlue/10 text-skyBlue"><MapPin className="w-4 h-4" /></div>
              <div>
                <div className="font-bold text-sm">Vidyavihar Railway Station West</div>
                <div className="text-xs text-slate-500">High Risk Waterlogging Zone</div>
              </div>
            </div>
            <span className="text-xs bg-criticalRed/10 text-criticalRed font-bold px-2.5 py-1 rounded-full">Risk 82</span>
          </div>
          <div 
            onClick={() => { setIsSearchOpen(false); setActiveTab('resources'); }}
            className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-navy-700/50 flex items-center justify-between cursor-pointer transition"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-tealAccent/10 text-tealAccent"><Hospital className="w-4 h-4" /></div>
              <div>
                <div className="font-bold text-sm">Rajawadi Hospital</div>
                <div className="text-xs text-slate-500">Emergency Medical Facility (1.8 km)</div>
              </div>
            </div>
            <span className="text-xs bg-safeGreen/10 text-safeGreen font-bold px-2.5 py-1 rounded-full">Open 24/7</span>
          </div>
        </div>
      </div>
    </div>
  );
}
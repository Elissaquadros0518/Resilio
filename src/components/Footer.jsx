import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function Footer({ setActiveTab }) {
  return (
    <footer className="bg-white dark:bg-navy-900 text-slate-600 dark:text-slate-300 py-10 px-4 sm:px-6 lg:px-8 mt-auto hidden sm:block border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg text-slate-900 dark:text-white">Riskscape</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            A community-driven climate risk mapping and resilience platform. Mapping Risks. Building Resilience. — starting from Vidyavihar, Mumbai.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm tracking-wide">Platform</h4>
          <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <li><button onClick={() => setActiveTab('home')} className="hover:text-tealAccent transition">Home Dashboard</button></li>
            <li><button onClick={() => setActiveTab('map')} className="hover:text-tealAccent transition">Live Map & Heatmap</button></li>
            <li><button onClick={() => setActiveTab('insights')} className="hover:text-tealAccent transition">Climate Risk Insights</button></li>
            <li><button onClick={() => setActiveTab('community')} className="hover:text-tealAccent transition">Community Contributors</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm tracking-wide">Emergency & Data</h4>
          <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <li><button onClick={() => setActiveTab('resources')} className="hover:text-tealAccent transition">Emergency Resources</button></li>
            <li><button onClick={() => setActiveTab('alerts')} className="hover:text-tealAccent transition">Early Warning System</button></li>
            <li><span className="text-slate-500">Data Sources: OpenStreetMap, IMD, NASA</span></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-sm tracking-wide">Civic Workflow</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            Observe → Report → Verify → Analyze → Predict → Respond → Plan. Building a safer neighbourhood together.
          </p>
          <div className="flex items-center space-x-2 text-xs text-tealAccent bg-tealAccent/10 px-3 py-2 rounded-xl border border-tealAccent/20">
            <span className="w-2 h-2 rounded-full bg-tealAccent animate-ping"></span>
            <span>Ward N Telemetry Live</span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        © 2026 Riskscape. Community-driven climate resilience for Mumbai.
      </div>
    </footer>
  );
}

import React from 'react';
import { ShieldAlert, Activity, Thermometer, Droplets, CloudRain, Wind, AlertTriangle, Sun, Droplet, Hammer, MapPin, ArrowRight, ExternalLink, PlusCircle, Map } from 'lucide-react';

export default function HomePage({ setActiveTab, reports }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fadeIn">
      
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-900 text-white p-8 sm:p-12 rounded-3xl shadow-2xl overflow-hidden border border-slate-700/60">
        <div className="absolute right-0 top-0 translate-x-16 -translate-y-16 w-96 h-96 bg-tealAccent/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-skyBlue/15 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-tealAccent/20 text-tealAccent border border-tealAccent/30 text-xs font-bold px-3.5 py-1 rounded-full flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-tealAccent animate-pulse"></span>
              <span>Live Local Telemetry</span>
            </span>
            <span className="bg-white/10 backdrop-blur-md text-slate-200 text-xs font-medium px-3.5 py-1 rounded-full flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-skyBlue" />
              <span>Vidyavihar, Mumbai, Maharashtra</span>
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Turn local observations into smarter climate action.
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Your neighbourhood. Your data. A more resilient Vidyavihar. Monitor flood risks, extreme heat, water stress, and infrastructure integrity in real-time.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <button 
              onClick={() => setActiveTab('report')}
              className="bg-gradient-to-r from-skyBlue to-tealAccent hover:opacity-95 text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-xl shadow-tealAccent/30 transition flex items-center space-x-2.5"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Report an Issue</span>
            </button>
            <button 
              onClick={() => setActiveTab('map')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 px-6 py-3.5 rounded-2xl text-sm font-bold transition flex items-center space-x-2.5"
            >
              <Map className="w-5 h-5" />
              <span>Explore Live Map</span>
            </button>
          </div>
        </div>
      </div>

      {/* Current Conditions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-tealAccent" />
            <span>Current Local Conditions</span>
          </h3>
          <span className="text-xs font-medium text-slate-400">Updated 5 mins ago • Ward N</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Temperature', val: '31°C', sub: 'Feels like 35°C', icon: Thermometer, color: 'text-warmOrange', bg: 'bg-warmOrange/10' },
            { label: 'Humidity', val: '72%', sub: 'Coastal moisture', icon: Droplets, color: 'text-skyBlue', bg: 'bg-skyBlue/10' },
            { label: 'Rainfall', val: '18 mm', sub: 'Last 3 hours', icon: CloudRain, color: 'text-tealAccent', bg: 'bg-tealAccent/10' },
            { label: 'Air Quality', val: 'Moderate', sub: 'AQI 96 (PM2.5)', icon: Wind, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Overall Risk', val: 'Moderate', sub: 'Score: 54/100', icon: AlertTriangle, color: 'text-warmOrange', bg: 'bg-warmOrange/10' }
          ].map((c, i) => {
            const IconComponent = c.icon;
            return (
              <div key={i} className="bg-white dark:bg-navy-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card hover:shadow-lg transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{c.label}</span>
                  <div className={`p-2.5 rounded-2xl ${c.bg} ${c.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{c.val}</div>
                <div className="text-[11px] font-medium text-slate-400 mt-1">{c.sub}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Overview Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-criticalRed" />
            <span>Vidyavihar Risk Overview</span>
          </h3>
          <button onClick={() => setActiveTab('insights')} className="text-xs font-bold text-tealAccent hover:underline flex items-center space-x-1">
            <span>View Deep Insights</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { title: 'Flood Risk', score: '68/100', label: 'Moderate-High', desc: 'Recent rainfall & historical waterlogging near subway', progress: 'w-[68%]', color: 'bg-warmOrange', icon: CloudRain },
            { title: 'Heat Risk', score: '57/100', label: 'Moderate', desc: 'High asphalt temperatures & urban heat islands', progress: 'w-[57%]', color: 'bg-amber-500', icon: Sun },
            { title: 'Water Stress', score: '34/100', label: 'Low-Moderate', desc: 'Minor short-duration supply complaint counts', progress: 'w-[34%]', color: 'bg-safeGreen', icon: Droplet },
            { title: 'Infrastructure', score: '61/100', label: 'Moderate-High', desc: 'Road pothole and stormwater drain blockage reports', progress: 'w-[61%]', color: 'bg-warmOrange', icon: Hammer }
          ].map((r, i) => {
            const IconComp = r.icon;
            return (
              <div key={i} className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-navy-700 text-slate-700 dark:text-slate-200">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-slate-100 dark:bg-navy-700 text-slate-700 dark:text-slate-300">
                      {r.score}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{r.title}</h4>
                  <div className="text-xs font-bold text-tealAccent mt-0.5">{r.label}</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">{r.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="w-full bg-slate-100 dark:bg-navy-700 h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full ${r.color} ${r.progress} rounded-full`}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Community Incidents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">What’s happening around Vidyavihar?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Recent community reports verified by automated telemetry & moderators</p>
          </div>
          <button onClick={() => setActiveTab('map')} className="text-xs font-bold text-tealAccent hover:underline flex items-center space-x-1">
            <span>View all incidents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reports.slice(0, 3).map((rep) => (
            <div key={rep.id} className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card flex flex-col justify-between space-y-4">
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
                  <span>{rep.category}</span>
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-skyBlue" />
                  <span>{rep.location}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{rep.description}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/60">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${rep.verified ? 'bg-safeGreen/15 text-safeGreen' : 'bg-amber-500/15 text-amber-500'}`}>
                  {rep.status}
                </span>
                <button onClick={() => setActiveTab('map')} className="text-xs font-bold text-tealAccent hover:underline flex items-center space-x-1">
                  <span>View on map</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
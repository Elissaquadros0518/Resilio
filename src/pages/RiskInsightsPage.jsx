import React, { useState } from 'react';
import { CloudRain, Sun } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CLIMATE_TIME_SERIES, HOTSPOTS } from '../data/mockData';

export default function RiskInsightsPage() {
  const [timeFilter, setTimeFilter] = useState('7 Days');
  const chartData = CLIMATE_TIME_SERIES[timeFilter];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Climate Risk Insights</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Understand how climate risks and incidents are evolving across Vidyavihar.</p>
        </div>
        <div className="flex bg-slate-200 dark:bg-navy-800 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-700">
          {['7 Days', '30 Days', '6 Months', '1 Year'].map(t => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                timeFilter === t ? 'bg-white dark:bg-tealAccent text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-navy-800 via-navy-700 to-navy-900 text-white p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-700">
        <div className="space-y-3">
          <span className="bg-warmOrange/20 text-warmOrange border border-warmOrange/30 text-xs font-bold px-3.5 py-1 rounded-full">
            Ward N Climate Analytics
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold">Vidyavihar Climate Vulnerability Score</h3>
          <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
            Combines environmental telemetry, historical flood logs, urban heat island metrics, and verified community reports into a single actionable index.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/10 flex flex-col items-center justify-center min-w-[220px]">
          <div className="text-xs uppercase tracking-wider text-slate-300 font-bold mb-1">Vulnerability Index</div>
          <div className="text-5xl font-extrabold text-warmOrange">67<span className="text-xl text-slate-400">/100</span></div>
          <div className="text-xs font-bold text-warmOrange mt-2 bg-warmOrange/20 px-3 py-1 rounded-full">Moderate-High Vulnerability</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-navy-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
              <CloudRain className="w-4 h-4 text-skyBlue" />
              <span>Flooding & Waterlogging Incidents</span>
            </h4>
            <span className="text-xs text-slate-400 font-medium">Trend Analysis</span>
          </div>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0F1E36', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                <Line type="monotone" dataKey="floods" stroke="#0EA5E9" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-navy-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center space-x-2">
              <Sun className="w-4 h-4 text-warmOrange" />
              <span>Heat & Infrastructure Reports</span>
            </h4>
            <span className="text-xs text-slate-400 font-medium">Bar Distribution</span>
          </div>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0F1E36', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                <Legend />
                <Bar dataKey="heat" fill="#F97316" radius={[6, 6, 0, 0]} />
                <Bar dataKey="infra" fill="#14B8A6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Recurring Risk Hotspots</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOTSPOTS.map((h, i) => (
            <div key={h.id} className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-criticalRed/15 text-criticalRed">
                  Score: {h.score}/100
                </span>
                <span className="text-xs text-slate-400 font-bold">Hotspot #{i+1}</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{h.title}</h4>
              <p className="text-xs text-slate-500 font-medium">Main Issue: {h.issue}</p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                <span className="text-slate-500">Reports: <b className="text-slate-800 dark:text-slate-200">{h.reports}</b></span>
                <span className="text-tealAccent font-bold">Trend: {h.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
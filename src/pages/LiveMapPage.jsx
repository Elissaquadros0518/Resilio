import React, { useState, useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import { HOTSPOTS } from '../data/mockData';

export default function LiveMapPage({ reports, selectedIncident, setSelectedIncident }) {
  const mapRef = useRef(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('leaflet-map-container').setView([19.0760, 72.8960], 15);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
    }

    const map = mapRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    if (showHeatmap) {
      HOTSPOTS.forEach(h => {
        L.circle([h.lat, h.lng], {
          color: h.score > 75 ? '#EF4444' : '#F97316',
          fillColor: h.score > 75 ? '#EF4444' : '#F97316',
          fillOpacity: 0.35,
          radius: 350
        }).addTo(map).bindPopup(`<b>${h.title}</b><br>Risk Score: ${h.score}/100<br>Main Issue: ${h.issue}`);
      });
    }

    reports.forEach(rep => {
      if (filterCategory !== 'ALL' && !rep.category.toLowerCase().includes(filterCategory.toLowerCase())) return;

      const markerColor = rep.severity === 'CRITICAL' ? '#EF4444' : rep.severity === 'HIGH' ? '#F97316' : '#14B8A6';
      
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background-color: ${markerColor}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 14px; border: 2px solid white;">⚠️</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([rep.lat, rep.lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; min-width: 200px; padding: 4px;">
          <span style="font-size: 10px; font-weight: 800; background: #FEF3C7; color: #D97706; padding: 3px 8px; border-radius: 6px;">${rep.severity}</span>
          <h4 style="font-weight: 700; font-size: 15px; margin: 6px 0 2px 0; color: #0F172A;">${rep.category}</h4>
          <p style="font-size: 12px; color: #64748B; margin: 0 0 8px 0;">📍 ${rep.location}</p>
          <p style="font-size: 12px; color: #334155; margin: 0 0 8px 0;">${rep.description}</p>
          <span style="font-size: 11px; color: #14B8A6; font-weight: 700;">Status: ${rep.status}</span>
        </div>
      `);

      if (selectedIncident && selectedIncident.id === rep.id) {
        map.setView([rep.lat, rep.lng], 17);
        marker.openPopup();
      }
    });

  }, [reports, filterCategory, showHeatmap, selectedIncident]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">Live Interactive Map</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Hyperlocal incident tracking & risk heatmaps across Vidyavihar, Mumbai</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition flex items-center space-x-2 shadow-md ${
              showHeatmap ? 'bg-warmOrange text-white' : 'bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>{showHeatmap ? 'Hide Risk Heatmap' : 'View Risk Heatmap'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 pb-2">
        {['ALL', 'Flooding', 'Heat', 'Drainage', 'Road', 'Infrastructure'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition shadow-sm ${
              filterCategory === cat
                ? 'bg-tealAccent text-white'
                : 'bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[550px] bg-white dark:bg-navy-800 p-3 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card relative">
          <div id="leaflet-map-container" className="w-full h-full rounded-2xl"></div>
        </div>

        <div className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card flex flex-col h-[550px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Active Feed ({reports.length})</h3>
            <span className="text-xs text-slate-400 font-medium">Vidyavihar Ward N</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3.5 pt-4">
            {reports.map(rep => (
              <div
                key={rep.id}
                onClick={() => setSelectedIncident(rep)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  selectedIncident && selectedIncident.id === rep.id
                    ? 'border-tealAccent bg-tealAccent/10'
                    : 'border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-navy-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    rep.severity === 'CRITICAL' ? 'bg-criticalRed/15 text-criticalRed' : 'bg-warmOrange/15 text-warmOrange'
                  }`}>
                    {rep.severity}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">{rep.time}</span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{rep.category}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">📍 {rep.location}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
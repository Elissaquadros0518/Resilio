import React from 'react';
import { ShieldAlert, Search, Bell, Sun, Moon, PlusCircle, ShieldCheck } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isAuthorityView, setIsAuthorityView, setIsSearchOpen, darkMode, setDarkMode }) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-navy-800/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => { setActiveTab('home'); setIsAuthorityView(false); }}>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-skyBlue via-tealAccent to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-tealAccent/20 group-hover:scale-105 transition">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Vidyavihar ClimateWatch
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide">Hyperlocal Resilience & Intelligence</p>
          </div>
        </div>

        <nav className="hidden lg:flex items-center space-x-1.5 bg-slate-100 dark:bg-navy-900/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          {[
            { id: 'home', label: 'Home' },
            { id: 'map', label: 'Live Map' },
            { id: 'insights', label: 'Risk Insights' },
            { id: 'community', label: 'Community' },
            { id: 'resources', label: 'Resources' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setIsAuthorityView(false); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === tab.id && !isAuthorityView
                  ? 'bg-white dark:bg-tealAccent text-slate-900 dark:text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-3">
          <button onClick={() => setIsSearchOpen(true)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-navy-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition" title="Search">
            <Search className="w-5 h-5" />
          </button>

          <button onClick={() => setActiveTab('alerts')} className="p-2.5 rounded-xl bg-slate-100 dark:bg-navy-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition relative" title="Alerts">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-criticalRed rounded-full animate-ping"></span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-criticalRed rounded-full"></span>
          </button>

          <button
            onClick={() => { setIsAuthorityView(!isAuthorityView); setActiveTab('authority'); }}
            className={`hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
              isAuthorityView ? 'bg-warmOrange text-white' : 'bg-slate-100 dark:bg-navy-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isAuthorityView ? 'Citizen View' : 'Authority View'}</span>
          </button>

          <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-navy-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition" title="Theme">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-skyBlue to-tealAccent text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-tealAccent/25 hover:shadow-tealAccent/40 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report Issue</span>
          </button>
        </div>

      </div>
    </header>
  );
}
import React from 'react';

export default function ProfilePage({ darkMode, setDarkMode }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-skyBlue via-tealAccent to-emerald-400 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl">
          AS
        </div>
        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Aarav Sharma</h2>
          <p className="text-xs font-medium text-slate-500">📍 Vidyavihar Resident & Gold Contributor</p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 pt-3">
            <span className="text-xs bg-tealAccent/15 text-tealAccent px-3.5 py-1 rounded-full font-bold">24 Reports Submitted</span>
            <span className="text-xs bg-safeGreen/15 text-safeGreen px-3.5 py-1 rounded-full font-bold">18 Verified</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-6">
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">App Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700/60">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">Dark Mode Theme</div>
              <div className="text-xs text-slate-500">Switch between light and dark display modes</div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-14 h-7 flex items-center rounded-full p-1 transition ${darkMode ? 'bg-tealAccent justify-end' : 'bg-slate-300 justify-start'}`}
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
            </button>
          </div>
          <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700/60">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-slate-100">Hyperlocal Push Alerts</div>
              <div className="text-xs text-slate-500">Receive warnings for flooding & heavy rainfall in Vidyavihar</div>
            </div>
            <span className="text-xs bg-safeGreen/15 text-safeGreen font-extrabold px-3 py-1 rounded-full">Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
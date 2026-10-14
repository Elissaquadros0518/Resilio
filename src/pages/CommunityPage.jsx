import React from 'react';
import { FileText, CheckCircle, CheckCheck, Clock, Award } from 'lucide-react';

export default function CommunityPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Vidyavihar Community</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Neighbourhood participation making Vidyavihar resilient, transparent, and connected.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: 'Reports Submitted', val: '2,481', icon: FileText, color: 'text-skyBlue' },
          { label: 'Verified Reports', val: '1,932', icon: CheckCircle, color: 'text-safeGreen' },
          { label: 'Issues Resolved', val: '549', icon: CheckCheck, color: 'text-tealAccent' },
          { label: 'Avg Response Time', val: '3.4 hrs', icon: Clock, color: 'text-warmOrange' }
        ].map((s, i) => {
          const IconComp = s.icon;
          return (
            <div key={i} className="bg-white dark:bg-navy-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card">
              <div className={`p-3 rounded-2xl bg-slate-100 dark:bg-navy-700 w-fit mb-4 ${s.color}`}>
                <IconComp className="w-5 h-5" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{s.val}</div>
              <div className="text-xs font-semibold text-slate-500 mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Award className="w-5 h-5 text-warmOrange" />
            <span>Top Community Contributors</span>
          </h3>
          <span className="text-xs font-bold text-slate-400">Updated Weekly</span>
        </div>
        <div className="space-y-3.5">
          {[
            { rank: 1, name: 'Local Volunteer (Aarav S.)', reports: 87, badge: 'Gold Resilient Leader', points: '1,420 pts' },
            { rank: 2, name: 'Somaiya Resident Group', reports: 63, badge: 'Silver Civic Group', points: '980 pts' },
            { rank: 3, name: 'Community Member (Rohan K.)', reports: 51, badge: 'Active Observer', points: '760 pts' },
            { rank: 4, name: 'Garodia Nagar Watch', reports: 42, badge: 'Verified Reporter', points: '610 pts' }
          ].map(u => (
            <div key={u.rank} className="p-4.5 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-sm ${
                  u.rank === 1 ? 'bg-warmOrange text-white' : u.rank === 2 ? 'bg-slate-300 text-slate-900' : 'bg-tealAccent/20 text-tealAccent'
                }`}>
                  #{u.rank}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{u.name}</div>
                  <div className="text-xs font-medium text-slate-500">{u.badge} • {u.reports} reports verified</div>
                </div>
              </div>
              <span className="text-xs font-extrabold px-3.5 py-1.5 rounded-full bg-tealAccent/15 text-tealAccent">
                {u.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
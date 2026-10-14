import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SearchModal from './components/SearchModal';
import HomePage from './pages/HomePage';
import LiveMapPage from './pages/LiveMapPage';
import ReportIssuePage from './pages/ReportIssuePage';
import RiskInsightsPage from './pages/RiskInsightsPage';
import CommunityPage from './pages/CommunityPage';
import ResourcesPage from './pages/ResourcesPage';
import AlertsPage from './pages/AlertsPage';
import ProfilePage from './pages/ProfilePage';
import AuthorityDashboard from './pages/AuthorityDashboard';
import IncidentDetailPage from './pages/IncidentDetailPage';
import { INITIAL_REPORTS, INITIAL_ALERTS } from './data/mockData';
import { CheckCircle, Home, Map, PlusCircle, Bell, User } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isAuthorityView, setIsAuthorityView] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('vidyavihar_reports_v2');
    return saved ? JSON.parse(saved) : INITIAL_REPORTS;
  });
  const [notifications] = useState(INITIAL_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('vidyavihar_dark') === 'true' || true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('vidyavihar_dark', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('vidyavihar_dark', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('vidyavihar_reports_v2', JSON.stringify(reports));
  }, [reports]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddReport = (newRep) => {
    const reportWithId = {
      ...newRep,
      id: `VW-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      time: 'Just now',
      status: 'Under verification',
      verified: false,
      upvotes: 1
    };
    setReports([reportWithId, ...reports]);
    showToast("Report submitted successfully! AI verification active.");
    setActiveTab('map');
  };

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-navy-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-tealAccent to-skyBlue text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 transition transform animate-bounce border border-white/20 backdrop-blur-md">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}

      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAuthorityView={isAuthorityView} 
        setIsAuthorityView={setIsAuthorityView} 
        setIsSearchOpen={setIsSearchOpen} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
      />

      <SearchModal 
        isSearchOpen={isSearchOpen} 
        setIsSearchOpen={setIsSearchOpen} 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        setActiveTab={setActiveTab} 
      />

      <main className="flex-1 pb-24 sm:pb-12">
        {isAuthorityView ? (
          <AuthorityDashboard reports={reports} setReports={setReports} showToast={showToast} />
        ) : (
          <>
            {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} reports={reports} />}
            {activeTab === 'map' && <LiveMapPage reports={reports} selectedIncident={selectedIncident} setSelectedIncident={setSelectedIncident} setActiveTab={setActiveTab} />}
            {activeTab === 'report' && <ReportIssuePage onAddReport={handleAddReport} />}
            {activeTab === 'insights' && <RiskInsightsPage />}
            {activeTab === 'community' && <CommunityPage reports={reports} />}
            {activeTab === 'resources' && <ResourcesPage />}
            {activeTab === 'alerts' && <AlertsPage notifications={notifications} setActiveTab={setActiveTab} />}
            {activeTab === 'profile' && <ProfilePage darkMode={darkMode} setDarkMode={setDarkMode} reports={reports} />}
            {activeTab === 'incident-detail' && <IncidentDetailPage incident={selectedIncident} setActiveTab={setActiveTab} />}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-navy-800/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-40 px-3 py-2 flex justify-around items-center shadow-2xl">
        {[
          { id: 'home', label: 'Home', icon: Home },
          { id: 'map', label: 'Map', icon: Map },
          { id: 'report', label: 'Report', icon: PlusCircle, isPrimary: true },
          { id: 'alerts', label: 'Alerts', icon: Bell },
          { id: 'profile', label: 'Profile', icon: User },
        ].map(item => {
          const IconComp = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsAuthorityView(false); }}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition ${
                item.isPrimary
                  ? 'bg-gradient-to-tr from-skyBlue to-tealAccent text-white shadow-lg shadow-tealAccent/30 -mt-6 p-3.5 rounded-full'
                  : activeTab === item.id && !isAuthorityView
                  ? 'text-tealAccent font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <IconComp className={item.isPrimary ? "w-6 h-6" : "w-5 h-5"} />
              {!item.isPrimary && <span className="text-[10px] font-semibold mt-1">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
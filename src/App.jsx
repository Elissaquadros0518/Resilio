import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { INITIAL_ALERTS } from './data/mockData';
import { createReport, fetchMyReports, fetchPublicReports, withdrawMyReport, fetchAuthorityAccess, fetchAuthorityReports, fetchAuthorityReportDetails, fetchCommunityReportDetails, reviewReport } from './data/reports';
import { CheckCircle } from 'lucide-react';
import { useAuth } from './auth/AuthProvider';
import { canAccessAuthorityDashboard, hasPermission } from './auth/permissions';
import { isSupabaseConfigured } from './lib/supabase';

export default function App() {
  const { user, profile, role, authLoading, profileLoading, profileStatus, profileError, refreshProfile, signOut, updateProfile } = useAuth();
  const routeTab = () => {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    if (path === '/forgot-password') return 'forgot-password';
    if (path === '/reset-password' || new URLSearchParams(window.location.search).get('tab') === 'reset-password') return 'reset-password';
    if (path === '/login') return 'sign-in';
    return 'landing';
  };
  const [activeTab, setActiveTab] = useState(routeTab);
  const [returnTab, setReturnTab] = useState('home');
  const isAuthorityView = activeTab === 'authority' && canAccessAuthorityDashboard(role);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [detailReturnTab, setDetailReturnTab] = useState('map');
  const [reports, setReports] = useState([]);
  const [reportSource, setReportSource] = useState(isSupabaseConfigured ? 'supabase' : 'demo');
  const [reportLoading, setReportLoading] = useState(true);
  const [reportLoadError, setReportLoadError] = useState(null);
  const [reportsUpdatedAt, setReportsUpdatedAt] = useState(null);
  const [authorityReports, setAuthorityReports] = useState([]);
  const [authorityLoading, setAuthorityLoading] = useState(false);
  const [authorityError, setAuthorityError] = useState(null);
  const [authorityAccess, setAuthorityAccess] = useState(null);
  const [authorityDetails, setAuthorityDetails] = useState(null);
  const [authorityDetailsLoading, setAuthorityDetailsLoading] = useState(false);
  const authorityAllowed = authorityAccess?.role === 'authority' && authorityAccess.jurisdictions?.length > 0;
  const [myReports, setMyReports] = useState([]);
  const [myReportsLoading, setMyReportsLoading] = useState(false);
  const [myReportsError, setMyReportsError] = useState(null);
  const reportRequest = useRef(0);
  const myReportsRequest = useRef(0);
  const authorityRequest = useRef(0);
  const authorityDetailsRequest = useRef(0);
  const [notifications] = useState(INITIAL_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    // Bug fix: original code had `|| true` which forced dark mode on permanently.
    // Now correctly reads the stored preference and defaults to false (light mode).
    const stored = localStorage.getItem('riskscape_dark');
    return stored !== null ? stored === 'true' : false;
  });

  const navigate = (tab) => {
    const route = { 'sign-in': '/login', 'forgot-password': '/forgot-password', 'reset-password': '/reset-password', landing: '/' }[tab];
    if (route && window.location.pathname !== route) window.history.pushState({}, '', route);
    const protectedTabs = ['report', 'profile', 'authority'];
    if (protectedTabs.includes(tab) && !user) {
      setReturnTab(tab);
      setActiveTab('sign-in');
      return;
    }
    setActiveTab(tab);
  };
  const finishSignIn = (destination) => {
    setActiveTab(destination || returnTab || 'home');
    setReturnTab('home');
    window.history.replaceState({}, '', '/');
  };

  useEffect(() => {
    const onPopState = () => setActiveTab(routeTab());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('riskscape_dark', 'true');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('riskscape_dark', 'false');
    }
  }, [darkMode]);

  const loadReports = useCallback(async () => {
    const requestId = ++reportRequest.current;
    setReportLoading(true);
    setReportLoadError(null);
    try {
      const result = await fetchPublicReports();
      if (requestId !== reportRequest.current) return;
      setReports(result.reports);
      setReportSource(result.source);
      setReportsUpdatedAt(result.source === 'supabase' ? Date.now() : null);
      if (result.warning) setReportLoadError(new Error(result.warning));
    } catch (error) {
      if (requestId !== reportRequest.current) return;
      // Never replace a failed live read with sample reports. That could make
      // a stale or rejected example appear to be a current community report.
      setReports([]);
      setReportSource('supabase');
      setReportsUpdatedAt(null);
      setReportLoadError(error);
    } finally {
      if (requestId === reportRequest.current) setReportLoading(false);
    }
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  // Reset authority state before the load effect runs when the signed-in
  // identity changes. Request IDs discard late responses from the old session.
  useEffect(() => {
    authorityRequest.current += 1;
    authorityDetailsRequest.current += 1;
    setAuthorityAccess(null);
    setAuthorityReports([]);
    setAuthorityError(null);
    setAuthorityLoading(false);
    setAuthorityDetails(null);
    setAuthorityDetailsLoading(false);
  }, [user?.id]);

  const loadAuthorityReports = useCallback(async () => {
    const requestId = ++authorityRequest.current;
    if (!user?.id) {
      setAuthorityReports([]);
      setAuthorityAccess(null);
      setAuthorityError(null);
      setAuthorityLoading(false);
      return;
    }
    setAuthorityLoading(true);
    setAuthorityError(null);
    try {
      // Approval may have happened while this session was open. Refresh the
      // trusted profile role before deciding whether to render authority UI.
      await refreshProfile();
      if (requestId !== authorityRequest.current) return;
      const access = await fetchAuthorityAccess();
      if (requestId !== authorityRequest.current) return;
      setAuthorityAccess(access);
      const permitted = access?.role === 'authority' && access.jurisdictions?.length > 0;
      if (!permitted) { setAuthorityReports([]); return; }
      const assignedReports = await fetchAuthorityReports();
      if (requestId === authorityRequest.current) setAuthorityReports(assignedReports);
    } catch (error) {
      if (requestId === authorityRequest.current) {
        setAuthorityError(error);
        setAuthorityReports([]);
      }
    } finally {
      if (requestId === authorityRequest.current) setAuthorityLoading(false);
    }
  }, [user?.id, refreshProfile]);
  useEffect(() => { if (activeTab === 'authority') loadAuthorityReports(); }, [activeTab, loadAuthorityReports]);

  const openAuthorityReport = async (report) => {
    const requestId = ++authorityDetailsRequest.current;
    setAuthorityDetails({ report, evidence: [], evidenceError: null });
    setAuthorityDetailsLoading(true);
    try {
      const detailData = await fetchAuthorityReportDetails(report.id);
      if (requestId === authorityDetailsRequest.current) setAuthorityDetails({ report, ...detailData });
    } catch (error) {
      if (requestId === authorityDetailsRequest.current) setAuthorityDetails({ report, evidence: [], evidenceError: error });
    } finally {
      if (requestId === authorityDetailsRequest.current) setAuthorityDetailsLoading(false);
    }
  };

  const closeAuthorityReportDetails = () => {
    authorityDetailsRequest.current += 1;
    setAuthorityDetails(null);
    setAuthorityDetailsLoading(false);
  };

  const loadMyReports = useCallback(async () => {
    if (!user) return;
    const requestId = ++myReportsRequest.current;
    setMyReportsLoading(true);
    setMyReportsError(null);
    try {
      const data = await fetchMyReports();
      if (requestId === myReportsRequest.current) setMyReports(data);
    } catch (error) {
      if (requestId === myReportsRequest.current) {
        setMyReports([]);
        setMyReportsError(error);
      }
    } finally {
      if (requestId === myReportsRequest.current) setMyReportsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    myReportsRequest.current += 1;
    setMyReports([]);
    setMyReportsError(null);
    setMyReportsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (activeTab === 'profile' && user && profileStatus === 'ready') loadMyReports();
  }, [activeTab, user, profileStatus, loadMyReports]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAddReport = async (input, options) => {
    const result = await createReport(input, options);
    reportRequest.current += 1;
    setReports((current) => [result.report, ...current.filter((report) => report.id !== result.report.id)]);
    setReportSource('supabase');
    setReportLoadError(null);
    setReportLoading(false);
    setReportsUpdatedAt(Date.now());
    setMyReports((current) => [result.report, ...current.filter((report) => report.id !== result.report.id)]);
    showToast(result.evidenceError ? 'Report saved; evidence upload needs attention.' : 'Report saved to ResiliMap.');
    return result;
  };

  const handleUpdateReportStatus = async (reportId, status, note) => {
    if (!hasPermission(role, 'report:update-assigned')) throw new Error('Your account is not authorized to review reports.');
    const updated = await reviewReport(reportId, status, note);
    setAuthorityReports((current) => current.map((report) => report.id === updated.id ? updated : report));
    setReports((current) => updated.status === 'Rejected'
      ? current.filter((report) => report.id !== updated.id)
      : current.map((report) => report.id === updated.id ? updated : report));
    setMyReports((current) => current.map((report) => report.id === updated.id ? updated : report));
    setReportsUpdatedAt(Date.now());
    showToast(`Report ${updated.id} updated to ${updated.status}.`);
    await loadAuthorityReports();
    if (authorityDetails?.report.id === updated.id) await openAuthorityReport(updated);
    return updated;
  };


  const handleWithdrawMyReport = async (reportId) => {
    await withdrawMyReport(reportId);
    setMyReports((current) => current.filter((report) => report.id !== reportId));
    setReports((current) => current.filter((report) => report.id !== reportId));
    setAuthorityReports((current) => current.filter((report) => report.id !== reportId));
    authorityDetailsRequest.current += 1;
    setAuthorityDetails((current) => current?.report.id === reportId ? null : current);
    setAuthorityDetailsLoading(false);
    setReportsUpdatedAt(Date.now());
    showToast('Report deleted from your active history and public views. Audit records were retained.');
  };

  const openCommunityReport = async (reportId) => {
    try {
      const incident = await fetchCommunityReportDetails(reportId);
      setSelectedIncident(incident);
      setDetailReturnTab('community');
      navigate('incident-detail');
    } catch (error) {
      showToast(error?.message || 'This report is no longer available.');
    }
  };

  // Public auth views are rendered without the app shell.
  const isPublicView = activeTab === 'landing' || activeTab === 'sign-in' || activeTab === 'forgot-password' || activeTab === 'reset-password';

  return (
    <div className={`min-h-screen flex flex-col ${
      darkMode ? 'dark bg-navy-900 text-slate-100' : 'bg-stone-50 text-slate-900'
    }`}>

      {/* ── Public views: landing and sign-in ─── */}
      {activeTab === 'landing' && <LandingPage setActiveTab={navigate} darkMode={darkMode} setDarkMode={setDarkMode} />}
      {activeTab === 'sign-in' && <SignInPage setActiveTab={navigate} onAuthSuccess={finishSignIn} darkMode={darkMode} setDarkMode={setDarkMode} />}
      {activeTab === 'forgot-password' && <ForgotPasswordPage setActiveTab={navigate} darkMode={darkMode} setDarkMode={setDarkMode} />}
      {activeTab === 'reset-password' && <ResetPasswordPage setActiveTab={navigate} darkMode={darkMode} setDarkMode={setDarkMode} />}

      {/* ── App shell: only shown when signed in ─ */}
      {!isPublicView && (
        <>
          {toastMessage && (
            <div className="fixed top-20 right-4 z-50 bg-gradient-to-r from-tealAccent to-skyBlue text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 transition transform animate-bounce border border-white/20 backdrop-blur-md">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">{toastMessage}</span>
            </div>
          )}

          <Navbar
            activeTab={activeTab}
            setActiveTab={navigate}
            isAuthorityView={isAuthorityView}
            hasAuthorityAccess={canAccessAuthorityDashboard(role)}
            user={user}
            profile={profile}
            profileStatus={profileStatus}
            onSignOut={async () => { await signOut(); setActiveTab('landing'); }}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />

          <SearchModal
            isSearchOpen={isSearchOpen}
            setIsSearchOpen={setIsSearchOpen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setActiveTab={navigate}
          />

          <main className="min-w-0 flex-1 pb-6 sm:pb-12">
            {reportSource === 'demo' && (
              <div className="mx-auto mt-5 max-w-7xl px-4 sm:px-6 lg:px-8">
                <div role="status" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                  <div><span className="font-bold">Demo reports only.</span> {reportLoadError?.message || 'Supabase is not configured.'} These examples are not saved user reports; submissions require a live signed-in Supabase session.</div>
                  {isSupabaseConfigured && <button type="button" onClick={loadReports} disabled={reportLoading} className="shrink-0 font-bold underline disabled:opacity-60">{reportLoading ? 'Connecting…' : 'Retry connection'}</button>}
                </div>
              </div>
            )}
            {reportLoading && reportSource === 'supabase' && <div className="mx-auto max-w-7xl px-4 pt-4 text-sm text-slate-500" role="status">Loading reports from ResiliMap…</div>}
            {(authLoading || (user && profileLoading && ['report', 'authority'].includes(activeTab))) && ['report', 'profile', 'authority'].includes(activeTab) ? (
              <div className="mx-auto my-24 max-w-md px-5 text-center text-sm font-semibold text-slate-500" role="status">Restoring your secure session…</div>
            ) : !user && ['report', 'profile'].includes(activeTab) ? (
              <section className="mx-auto my-16 max-w-xl px-5 text-center" role="alert"><div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-card"><h2 className="text-2xl font-extrabold text-stone-900">Sign in required</h2><p className="mt-3 text-sm text-stone-600">Sign in to submit a report or manage your profile.</p><button onClick={() => { setReturnTab(activeTab); setActiveTab('sign-in'); }} className="mt-6 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white">Continue to sign in</button></div></section>
            ) : activeTab === 'report' && (!profile || !hasPermission(role, 'report:create')) ? (
              <section className="mx-auto my-16 max-w-xl px-5 text-center" role="alert"><div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-card"><h2 className="text-2xl font-extrabold text-stone-900">Profile verification required</h2><p className="mt-3 text-sm text-stone-600">A verified community profile is required before submitting reports. {profileStatus === 'error' ? 'Your profile could not be loaded.' : profileStatus === 'missing' ? 'No profile exists for this account yet.' : 'Your account role does not include report submission.'}</p>{profileStatus === 'error' && <button onClick={refreshProfile} className="mt-5 font-bold text-emerald-800 underline">Retry profile load</button>}</div></section>
            ) : activeTab === 'authority' && (authorityLoading || (user && profileLoading)) ? (
              <div className="mx-auto my-24 max-w-md px-5 text-center text-sm font-semibold text-slate-500" role="status">Checking authority approval and jurisdiction…</div>
            ) : activeTab === 'authority' && (!isAuthorityView || !authorityAllowed) ? (
              <section className="mx-auto my-16 max-w-xl px-5 text-center" role="alert">
                <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-card">
                  <h2 className="text-2xl font-extrabold text-stone-900">Access unavailable</h2>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">This page requires an approved authority role and active jurisdiction assignment. {authorityError ? `Authorization could not be checked: ${authorityError.message}` : authorityAccess?.application_status === 'pending' ? 'Your application is pending project-owner review.' : authorityAccess?.application_status === 'rejected' ? 'Your application was rejected.' : profileStatus === 'error' ? 'Your profile could not be loaded, so no authority access is available.' : 'Your account does not have an approved authority role and active jurisdiction assignment.'} Contact the ResiliMap project owner if you need access.</p>
                  <p className="mt-4 text-xs text-stone-500">Client-side gating is only a navigation aid. A connected server must enforce every permission.</p>
                  <button onClick={() => navigate('home')} className="mt-6 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-900">Return to public information</button>
                </div>
              </section>
            ) : isAuthorityView ? (
              <AuthorityDashboard reports={authorityReports} onUpdateStatus={handleUpdateReportStatus} loading={authorityLoading} loadError={authorityError} onRetry={loadAuthorityReports} onOpenReport={openAuthorityReport} details={authorityDetails} detailsLoading={authorityDetailsLoading} onCloseDetails={closeAuthorityReportDetails} />
            ) : (
              <>
                {activeTab === 'home' && <HomePage setActiveTab={navigate} reports={reports} reportsLoading={reportLoading} reportsError={reportLoadError} reportSource={reportSource} onRetryReports={loadReports} canRetryReports={isSupabaseConfigured} />}
                {activeTab === 'map' && <LiveMapPage reports={reports} reportsLoading={reportLoading} reportsError={reportLoadError} reportSource={reportSource} onRefreshReports={loadReports} selectedIncident={selectedIncident} setSelectedIncident={setSelectedIncident} setActiveTab={navigate} />}
                {activeTab === 'report' && <ReportIssuePage onAddReport={handleAddReport} onViewReport={(incident) => { setSelectedIncident(incident); navigate('map'); }} />}
                {activeTab === 'insights' && <RiskInsightsPage darkMode={darkMode} reports={reports} reportSource={reportSource} reportsLoading={reportLoading} reportsError={reportLoadError} reportsUpdatedAt={reportsUpdatedAt} onRefreshReports={loadReports} />}
                {activeTab === 'community' && <CommunityPage onOpenReport={openCommunityReport} />}
                {activeTab === 'resources' && <ResourcesPage />}
                {activeTab === 'alerts' && <AlertsPage notifications={notifications} setActiveTab={navigate} />}
                {activeTab === 'profile' && <ProfilePage darkMode={darkMode} setDarkMode={setDarkMode} reports={myReports} reportsLoading={myReportsLoading} reportsError={myReportsError} onRetryReports={loadMyReports} profile={profile} user={user} profileLoading={profileLoading} profileStatus={profileStatus} profileError={profileError} onRetryProfile={refreshProfile} onSaveProfile={updateProfile} onDeleteReport={handleWithdrawMyReport} onOpenAuthority={() => navigate('authority')} onViewReport={(incident) => { setSelectedIncident(incident); setDetailReturnTab('profile'); navigate('incident-detail'); }} />}
                {activeTab === 'incident-detail' && <IncidentDetailPage incident={selectedIncident} setActiveTab={navigate} returnTab={detailReturnTab} />}
              </>
            )}
          </main>

          <Footer setActiveTab={navigate} />
        </>
      )}
    </div>
  );
}

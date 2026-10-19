import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarDays, Check, CircleAlert, FileText, MapPin, ShieldCheck } from 'lucide-react';
import AuthorityApplicationForm from '../components/AuthorityApplicationForm';
import { fetchMyAuthorityApplication } from '../data/reports';

const STATUS_LABELS = {
  'Under verification': 'Under verification',
  Verified: 'Verified',
  'Authority notified': 'Authority notified',
  Resolved: 'Resolved',
  Rejected: 'Rejected',
};

const STATUS_STYLES = {
  'Under verification': 'bg-amber-50 text-amber-800 ring-amber-200',
  Verified: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'Authority notified': 'bg-sky-50 text-sky-800 ring-sky-200',
  Resolved: 'bg-teal-50 text-teal-800 ring-teal-200',
  Rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
};

const FILTERS = [
  { id: 'all', label: 'All reports' },
  { id: 'pending', label: 'Pending' },
  { id: 'verified', label: 'Verified' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'rejected', label: 'Rejected' },
];

const PAGE_SIZE = 8;

function formatDate(value, options = { dateStyle: 'medium' }) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, options).format(date);
}

function statusFilter(report, filter) {
  switch (filter) {
    case 'pending': return report.status === 'Under verification';
    case 'verified': return report.status === 'Verified';
    case 'resolved': return report.status === 'Resolved';
    case 'rejected': return report.status === 'Rejected';
    default: return true;
  }
}

function roleLabel(role) {
  if (role === 'authority') return 'Authority';
  if (role === 'user') return 'Community Member';
  return 'Role unavailable';
}

function initials(name, email) {
  const value = (name || email || 'R').trim();
  const parts = value.includes('@') ? [value[0]] : value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]);
  return parts.join('').toUpperCase() || 'R';
}

export default function ProfilePage({
  darkMode, setDarkMode, reports = [], reportsLoading, reportsError, onRetryReports,
  profile, user, profileLoading, profileStatus, profileError, onRetryProfile, onSaveProfile, onDeleteReport, onViewReport, onOpenAuthority,
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(null);
  const [fieldError, setFieldError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedForDeletion, setSelectedForDeletion] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const deleteDialogRef = useRef(null);
  const [authorityApplication, setAuthorityApplication] = useState(null);
  const [authorityApplicationLoading, setAuthorityApplicationLoading] = useState(false);
  const [authorityApplicationError, setAuthorityApplicationError] = useState('');
  const [showAuthorityApplicationForm, setShowAuthorityApplicationForm] = useState(false);

  const loadAuthorityApplication = async () => {
    if (!user?.id) return;
    setAuthorityApplicationLoading(true);
    setAuthorityApplicationError('');
    try { setAuthorityApplication(await fetchMyAuthorityApplication()); }
    catch (error) { setAuthorityApplicationError(error.message || 'Application status could not be loaded.'); }
    finally { setAuthorityApplicationLoading(false); }
  };

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      setAuthorityApplication(null);
      setAuthorityApplicationError('');
      setAuthorityApplicationLoading(false);
      return undefined;
    }
    setAuthorityApplication(null);
    setAuthorityApplicationError('');
    setAuthorityApplicationLoading(true);
    fetchMyAuthorityApplication().then((application) => {
      if (active) setAuthorityApplication(application);
    }).catch((error) => {
      if (active) setAuthorityApplicationError(error.message || 'Application status could not be loaded.');
    }).finally(() => {
      if (active) setAuthorityApplicationLoading(false);
    });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (selectedForDeletion && !dialog.open) dialog.showModal();
    if (!selectedForDeletion && dialog.open) dialog.close();
  }, [selectedForDeletion]);

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
    setEditing(false);
    setMessage(null);
  }, [profile?.id, profile?.display_name]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [filter, sortOrder, reports.length]);

  const uniqueReports = useMemo(() => {
    const seen = new Set();
    return reports.filter((report) => {
      if (!report?.id || seen.has(report.id)) return false;
      seen.add(report.id);
      return true;
    });
  }, [reports]);

  const stats = useMemo(() => ({
    total: uniqueReports.length,
    verified: uniqueReports.filter((report) => report.status === 'Verified').length,
    pending: uniqueReports.filter((report) => report.status === 'Under verification').length,
    resolved: uniqueReports.filter((report) => report.status === 'Resolved').length,
  }), [uniqueReports]);

  const visibleReports = useMemo(() => uniqueReports
    .filter((report) => statusFilter(report, filter))
    .sort((a, b) => {
      const aTime = Date.parse(a.createdAt || '') || 0;
      const bTime = Date.parse(b.createdAt || '') || 0;
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    }), [uniqueReports, filter, sortOrder]);

  const saveProfile = async (event) => {
    event.preventDefault();
    const cleanedName = displayName.trim();
    if (!cleanedName) {
      setFieldError('Enter a display name.');
      return;
    }
    if (cleanedName.length > 100) {
      setFieldError('Display name must be 100 characters or fewer.');
      return;
    }
    setSaving(true);
    setMessage(null);
    setFieldError('');
    try {
      const result = await onSaveProfile(cleanedName);
      if (result?.error) throw result.error;
      setDisplayName(result?.data?.display_name || cleanedName);
      setEditing(false);
      setMessage({ type: 'success', text: 'Your display name was updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'We could not save your profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setDisplayName(profile?.display_name || '');
    setFieldError('');
    setMessage(null);
    setEditing(false);
  };

  const confirmDelete = async () => {
    if (!selectedForDeletion || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await onDeleteReport(selectedForDeletion.id);
      setSelectedForDeletion(null);
    } catch (error) {
      setDeleteError(error?.message || 'The report was not deleted. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const memberSince = user?.created_at ? formatDate(user.created_at, { month: 'long', year: 'numeric' }) : 'Membership date unavailable';
  const fullName = profile?.display_name?.trim() || 'Riskscape member';
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <header className="mb-7">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-800">Your account</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Profile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage your community profile and follow the reports you have submitted.</p>
      </header>

      <section aria-labelledby="profile-overview-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-navy-800 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xl font-bold text-white ring-4 ring-emerald-50 dark:ring-emerald-950">
            {initials(profile?.display_name, user?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="profile-overview-heading" className="truncate text-xl font-bold text-slate-900 dark:text-slate-100">{fullName}</h2>
            <p className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">{user?.email || 'Email unavailable'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:ring-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{roleLabel(profile?.role)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Member since {memberSince}</span>
            </div>
          </div>
          {profileStatus === 'ready' && !editing && <button type="button" onClick={() => { setMessage(null); setEditing(true); }} className="min-h-11 rounded-xl border border-emerald-800 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-950 dark:focus:ring-emerald-900">Edit profile</button>}
        </div>

        {profileLoading && <p role="status" className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-navy-900 dark:text-slate-300">Loading your profile…</p>}
        {profileStatus === 'missing' && <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><div><p className="font-semibold">Your profile record is missing.</p><p className="mt-1">Your permissions remain unavailable. Retry the profile check or ask the project owner to run the existing profile backfill.</p><button type="button" onClick={onRetryProfile} className="mt-2 font-semibold underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-amber-700">Retry profile check</button></div></div>}
        {profileStatus === 'error' && <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p>We couldn’t load your profile: {profileError?.message || 'Connection error.'} No elevated permissions are granted while profile loading fails.</p><button type="button" onClick={onRetryProfile} className="mt-2 font-semibold underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-rose-700">Retry profile load</button></div>}

        {profileStatus === 'ready' && editing && <form onSubmit={saveProfile} className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700">
          <label htmlFor="profile-display-name" className="mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-100">Display name</label>
          <input id="profile-display-name" value={displayName} onChange={(event) => { setDisplayName(event.target.value); setFieldError(''); }} maxLength={100} autoComplete="name" aria-invalid={!!fieldError} aria-describedby={fieldError ? 'profile-name-error' : 'profile-name-help'} className="min-h-11 w-full max-w-xl rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:border-slate-600 dark:bg-navy-900 dark:text-white dark:focus:ring-emerald-950" />
          <p id="profile-name-help" className="mt-1.5 text-xs text-slate-500">This name appears on your personal profile. Your email and role cannot be edited here.</p>
          {fieldError && <p id="profile-name-error" role="alert" className="mt-1.5 text-sm text-rose-700">{fieldError}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : <><Check className="h-4 w-4" aria-hidden="true" />Save changes</>}</button>
            <button type="button" onClick={cancelEdit} disabled={saving} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-navy-700">Cancel</button>
          </div>
        </form>}
        {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-lg px-3 py-2 text-sm ${message.type === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-900'}`}>{message.text}</p>}
      </section>

      {profile?.role === 'authority' && <section aria-labelledby="authority-access-heading" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="authority-access-heading" className="text-lg font-bold text-emerald-950 dark:text-emerald-100">Authority access approved</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900 dark:text-emerald-200">Your trusted profile role is authority. Open Authority View to check your authorization and assigned service area.</p>
          </div>
          <button type="button" onClick={onOpenAuthority} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Authority View</button>
        </div>
      </section>}

      {profile?.role === 'user' && <section aria-labelledby="authority-application-heading" className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="authority-application-heading" className="text-lg font-bold text-emerald-950 dark:text-emerald-100">Authority access</h2>
            {authorityApplicationLoading && <p role="status" className="mt-1 text-sm text-emerald-900 dark:text-emerald-200">Checking your application status…</p>}
            {authorityApplicationError && <div role="alert" className="mt-1 text-sm text-rose-800 dark:text-rose-200">Application status could not be loaded: {authorityApplicationError} <button type="button" onClick={loadAuthorityApplication} className="font-semibold underline">Retry</button></div>}
            {!authorityApplicationLoading && !authorityApplicationError && authorityApplication?.status === 'pending' && <><p className="mt-1 text-sm font-bold text-sky-900 dark:text-sky-200">Application Pending</p><p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900 dark:text-emerald-200">Your role remains community user while the project owner reviews your application.</p></>}
            {!authorityApplicationLoading && !authorityApplicationError && authorityApplication?.status === 'rejected' && <><p className="mt-1 text-sm font-bold text-amber-900 dark:text-amber-200">Application Rejected</p><p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900 dark:text-emerald-200">Your role remains community user. This account already has an application record, so the current database rules do not allow resubmission.</p>{authorityApplication.review_note && <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">Review note: {authorityApplication.review_note}</p>}</>}
            {!authorityApplicationLoading && !authorityApplicationError && authorityApplication?.status === 'approved' && <><p className="mt-1 text-sm font-bold text-emerald-900 dark:text-emerald-200">Application Approved</p><p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900 dark:text-emerald-200">The application is approved, but authority access appears only after the trusted profile role is updated.</p></>}
            {!authorityApplicationLoading && !authorityApplicationError && !authorityApplication && <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-900 dark:text-emerald-200">Request review of your organization and service area. Your role remains community user until the project owner approves you.</p>}
          </div>
          {!authorityApplicationLoading && !authorityApplicationError && !authorityApplication && !showAuthorityApplicationForm && <button type="button" onClick={() => setShowAuthorityApplicationForm(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200"><Building2 className="h-4 w-4" aria-hidden="true" />Request Authority Access</button>}
        </div>
        {showAuthorityApplicationForm && !authorityApplication && !authorityApplicationLoading && !authorityApplicationError && <AuthorityApplicationForm onCancel={() => setShowAuthorityApplicationForm(false)} onSubmitted={(application) => { setAuthorityApplication(application); setShowAuthorityApplicationForm(false); }} />}
      </section>}

      <section aria-labelledby="report-stats-heading" className="mt-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="report-stats-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">Your report activity</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Counts come from your authenticated report history.</p>
          </div>
          {reportsError && <button type="button" onClick={onRetryReports} className="text-sm font-semibold text-emerald-900 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:text-emerald-200">Retry loading</button>}
        </div>
        {reportsError ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">We couldn’t load your statistics or reports: {reportsError.message || 'Connection error.'} No zero counts are shown because your history could not be confirmed. <button type="button" onClick={onRetryReports} className="font-bold underline underline-offset-2">Retry</button></div> : <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Total reports', value: stats.total, hint: 'Submitted by you', icon: FileText },
            { label: 'Verified', value: stats.verified, hint: 'Current status', icon: ShieldCheck },
            { label: 'Pending verification', value: stats.pending, hint: 'Awaiting initial review', icon: CircleAlert },
            { label: 'Resolved', value: stats.resolved, hint: 'Current status', icon: Check },
          ].map(({ label, value, hint, icon: Icon }) => <div key={label} className="min-h-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-navy-800 sm:p-5">
            <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-600 dark:text-slate-300 sm:text-sm">{label}</p><Icon className="h-4 w-4 shrink-0 text-emerald-800 dark:text-emerald-300" aria-hidden="true" /></div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{reportsLoading ? <span className="inline-block h-7 w-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" aria-label="Loading count" /> : value}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
          </div>)}
        </div>}
        {!reportsError && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Pending verification means reports whose current database status is “Under verification.” “Authority notified” has passed initial verification.</p>}
      </section>

      <section aria-labelledby="my-reports-heading" className="mt-9">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="my-reports-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100">My reports</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Review the status and details of each report you submitted.</p>
          </div>
          {!reportsLoading && !reportsError && uniqueReports.length > 1 && <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="report-sort" className="sr-only">Sort reports</label>
            <select id="report-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-600 dark:bg-navy-800 dark:text-slate-100">
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
            </select>
          </div>}
        </div>

        {!reportsLoading && !reportsError && uniqueReports.length > 0 && <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter reports by status">
          {FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-100 ${filter === item.id ? 'bg-emerald-800 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-navy-800 dark:text-slate-200 dark:hover:bg-navy-700'}`}>{item.label}</button>)}
        </div>}

        <div aria-live="polite" aria-busy={reportsLoading}>
          {reportsLoading && <div className="space-y-3" role="status" aria-label="Loading reports">{[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-navy-800" />)}</div>}
          {reportsError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900"><p className="font-semibold">Your report list is unavailable.</p><p className="mt-1">{reportsError.message || 'Check your connection and try again.'}</p><button type="button" onClick={onRetryReports} className="mt-3 min-h-10 rounded-lg border border-rose-300 px-3 font-semibold hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-100">Retry</button></div>}
          {!reportsLoading && !reportsError && uniqueReports.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-600 dark:bg-navy-800"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"><FileText className="h-5 w-5" aria-hidden="true" /></div><h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">No reports yet</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">When you submit a community report, it will appear here.</p></div>}
          {!reportsLoading && !reportsError && uniqueReports.length > 0 && visibleReports.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-300">No reports match this status filter.</p>}
          {!reportsLoading && !reportsError && visibleReports.length > 0 && <ul className="space-y-3">
            {visibleReports.slice(0, visibleCount).map((report) => <li key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-navy-800 sm:p-5">
              <article className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-base font-bold text-slate-900 dark:text-slate-100">{report.title || report.category || 'Community report'}</h3>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[report.status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{STATUS_LABELS[report.status] || report.status || 'Status unavailable'}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <span>{report.category || 'Category unavailable'}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{report.location || 'Location unavailable'}</span>
                    <span>{formatDate(report.createdAt)}</span>
                    <span>Severity: {report.severity || 'Unavailable'}</span>
                  </div>
                  <p className="mt-2 break-all text-[11px] text-slate-400">Report reference: {report.id}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <button type="button" onClick={() => onViewReport?.(report)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-emerald-800 px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-950"><FileText className="h-4 w-4" aria-hidden="true" />View details</button>
                  {report.status === 'Under verification'
                    ? <button type="button" onClick={() => { setDeleteError(''); setSelectedForDeletion(report); }} className="min-h-10 rounded-lg border border-rose-300 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950">Delete</button>
                    : <button type="button" disabled aria-describedby={`retention-${report.id}`} className="min-h-10 cursor-not-allowed rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-400 dark:border-slate-700" title="Reports that have entered review are retained">Retained</button>}
                </div>
                <p id={`retention-${report.id}`} className="sr-only">This report has entered review and is retained to preserve audit history and evidence links.</p>
              </article>
            </li>)}
          </ul>}
          {!reportsLoading && !reportsError && visibleReports.length > visibleCount && <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="mt-4 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-600 dark:bg-navy-800 dark:text-slate-200">Load more reports</button>}
        </div>

        {!reportsError && uniqueReports.length > 0 && <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-300">You can delete a report while it is still under verification. Deleting removes it from your active history and public views, while its audit record is retained. Reports that have entered review cannot be deleted here.</p>}
      </section>

      <section aria-labelledby="preferences-heading" className="mt-9 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-navy-800 sm:p-6">
        <h2 id="preferences-heading" className="text-lg font-bold text-slate-900 dark:text-slate-100">Display preferences</h2>
        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 dark:bg-navy-900">
          <div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dark mode</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Switch between light and dark display modes.</p></div>
          <button type="button" role="switch" aria-checked={darkMode} aria-label="Dark mode" onClick={() => setDarkMode(!darkMode)} className={`flex h-7 w-14 shrink-0 items-center rounded-full p-1 focus:outline-none focus:ring-4 focus:ring-emerald-100 ${darkMode ? 'justify-end bg-emerald-800' : 'justify-start bg-slate-300'}`}><span className="h-5 w-5 rounded-full bg-white shadow" /></button>
        </div>
      </section>

      <dialog
        ref={deleteDialogRef}
        aria-labelledby="delete-report-heading"
        aria-describedby="delete-report-description"
        onCancel={(event) => { event.preventDefault(); if (!deleting) { setDeleteError(''); setSelectedForDeletion(null); } }}
        onClick={(event) => { if (event.target === deleteDialogRef.current && !deleting) { setDeleteError(''); setSelectedForDeletion(null); } }}
        className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-100"
      >
        {selectedForDeletion && <div className="p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Delete report</p>
          <h2 id="delete-report-heading" className="mt-1 text-xl font-bold">{selectedForDeletion.title || selectedForDeletion.category || 'This report'}</h2>
          <p id="delete-report-description" className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">This removes the report from your active history and public views. Its audit record and private evidence are retained for review. Only reports that have not entered review can be deleted.</p>
          {deleteError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">The report was not deleted. {deleteError}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" autoFocus disabled={deleting} onClick={() => { setDeleteError(''); setSelectedForDeletion(null); }} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-navy-700">Cancel</button>
            <button type="button" disabled={deleting} onClick={confirmDelete} className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:cursor-wait disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete report'}</button>
          </div>
        </div>}
      </dialog>
    </main>
  );
}

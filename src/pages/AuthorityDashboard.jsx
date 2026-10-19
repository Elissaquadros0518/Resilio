import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, RotateCw, X, ImageOff, Images, MapPin, CalendarDays, Check, CircleX, ClipboardList, Clock3, ExternalLink } from 'lucide-react';

const statuses = ['Under verification', 'Authority notified', 'Verified', 'Resolved', 'Rejected'];
const statusStyle = {
  'Under verification': 'bg-amber-50 text-amber-800 ring-amber-200',
  'Authority notified': 'bg-sky-50 text-sky-800 ring-sky-200',
  Verified: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Resolved: 'bg-teal-50 text-teal-800 ring-teal-200',
  Rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
};
const severityStyle = {
  CRITICAL: 'bg-rose-50 text-rose-800 ring-rose-200',
  HIGH: 'bg-orange-50 text-orange-800 ring-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-800 ring-amber-200',
  MODERATE: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  LOW: 'bg-slate-100 text-slate-700 ring-slate-200',
};
const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'MODERATE', 'LOW'];
const PAGE_SIZE = 25;
const dateLabel = (value) => value ? new Date(value).toLocaleString() : 'Unknown';
const isReviewable = (report) => ['Under verification', 'Authority notified'].includes(report.status);
const canReject = isReviewable;

function EvidenceCard({ item, onEnlarge, onRetry }) {
  const [imageState, setImageState] = useState(item.signedUrl ? 'loading' : 'error');
  useEffect(() => setImageState(item.signedUrl ? 'loading' : 'error'), [item.signedUrl]);
  const failed = imageState === 'error' || !item.signedUrl;

  return <article className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-navy-800">
    <div className="relative aspect-[4/3] bg-slate-100 dark:bg-navy-900">
      {item.media_type === 'video' && !failed ? <video src={item.signedUrl} controls preload="metadata" onError={() => setImageState('error')} className="h-full w-full object-cover" aria-label="Uploaded report video" /> : null}
      {item.media_type !== 'video' && !failed && <>
        {imageState === 'loading' && <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700" role="status" aria-label="Loading evidence image" />}
        <button type="button" onClick={() => onEnlarge(item)} disabled={imageState !== 'loaded'} aria-label="Enlarge report photo" className="h-full w-full disabled:cursor-wait">
          <img src={item.signedUrl} alt="Community-submitted report evidence" onLoad={() => setImageState('loaded')} onError={() => setImageState('error')} className={`h-full w-full object-cover transition-opacity ${imageState === 'loaded' ? 'opacity-100' : 'opacity-0'}`} />
        </button>
      </>}
      {failed && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-xs text-slate-600 dark:text-slate-300"><ImageOff className="h-6 w-6" aria-hidden="true" /><span>Image retrieval failed: {item.urlError || 'the evidence file could not be loaded.'}</span><button type="button" onClick={onRetry} className="font-bold text-emerald-800 underline dark:text-emerald-300">Retry evidence</button></div>}
      {item.media_type === 'video' && !failed && <button type="button" onClick={() => onEnlarge(item)} className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-slate-950/75 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-950"><ExternalLink className="h-3.5 w-3.5" />Enlarge</button>}
    </div>
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-slate-600 dark:text-slate-300"><span className="font-semibold capitalize">{item.media_type} evidence</span><time dateTime={item.uploaded_at}>{dateLabel(item.uploaded_at)}</time></div>
  </article>;
}

function ReportDetailsDialog({ details, detailsLoading, onClose, onRetry }) {
  const [enlargedEvidence, setEnlargedEvidence] = useState(null);
  useEffect(() => {
    if (!details) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (enlargedEvidence) setEnlargedEvidence(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [details, enlargedEvidence, onClose]);

  if (!details) return null;
  const report = details.report;
  const closeEnlarged = (event) => { if (event.target === event.currentTarget) setEnlargedEvidence(null); };
  const closeDetails = (event) => { if (event.target === event.currentTarget) onClose(); };

  return createPortal(<>
    <div className="fixed inset-0 z-[2000] grid place-items-center overflow-y-auto overscroll-contain bg-slate-950/60 p-3 backdrop-blur-sm [padding-top:max(0.75rem,env(safe-area-inset-top))] [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] sm:p-6" onMouseDown={closeDetails}>
      <section role="dialog" aria-modal="true" aria-labelledby="authority-report-detail-title" className="my-auto flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-navy-800 sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 dark:border-slate-700 sm:px-7">
          <div className="min-w-0">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${statusStyle[report.status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{report.status}</span>
            <h2 id="authority-report-detail-title" className="mt-3 break-words text-xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-2xl">{report.title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Submitted {dateLabel(report.createdAt)}</p>
          </div>
          <button type="button" aria-label="Close report details" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:hover:bg-navy-700"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
          <section aria-labelledby="report-description-heading">
            <h3 id="report-description-heading" className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Description</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-200">{report.description || 'No description was provided.'}</p>
          </section>

          <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 dark:bg-navy-900 sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</dt><dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{report.category || 'Unknown'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Severity</dt><dd className="mt-1"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${severityStyle[report.severity] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{report.severity}</span></dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt><dd className="mt-1 flex items-start gap-1.5 text-sm text-slate-900 dark:text-slate-100"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{report.location || 'Unknown'}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coordinates</dt><dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">{report.lat != null && report.lng != null ? `${report.lat}, ${report.lng}` : 'Not provided'}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current status</dt><dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{report.status}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</dt><dd className="mt-1 flex items-center gap-1.5 text-sm text-slate-900 dark:text-slate-100"><CalendarDays className="h-4 w-4 text-slate-500" />{dateLabel(report.createdAt)}</dd></div>
          </dl>

          {detailsLoading ? <div role="status" className="space-y-3"><div className="h-5 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" /><div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" /></div><p className="text-sm text-slate-500">Loading secure evidence…</p></div> : <>
            <section aria-labelledby="report-evidence-heading">
              <div className="flex items-center gap-2"><Images className="h-5 w-5 text-emerald-700" /><h3 id="report-evidence-heading" className="text-lg font-bold text-slate-900 dark:text-slate-100">Community evidence</h3></div>
              {details.evidenceError ? <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Uploaded evidence metadata could not be loaded: {details.evidenceError.message || String(details.evidenceError)} <button type="button" onClick={() => onRetry(report)} className="ml-1 font-bold underline">Retry</button></div>
                : details.evidence?.length ? <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{details.evidence.map((item) => <EvidenceCard key={item.id} item={item} onEnlarge={setEnlargedEvidence} onRetry={() => onRetry(report)} />)}</div> : <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-300"><ImageOff className="h-5 w-5 shrink-0" />No evidence photos or videos were uploaded with this report.</div>}
            </section>

          </>}
        </div>
      </section>
    </div>

    {enlargedEvidence && <div className="fixed inset-0 z-[2010] flex items-center justify-center bg-slate-950/90 p-4" onMouseDown={closeEnlarged} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Enlarged report evidence" className="relative max-h-full max-w-full" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => setEnlargedEvidence(null)} aria-label="Close enlarged evidence" className="absolute -right-2 -top-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg"><X className="h-5 w-5" /></button>
        {enlargedEvidence.media_type === 'video' ? <video src={enlargedEvidence.signedUrl} controls autoPlay className="max-h-[90vh] max-w-[92vw] rounded-xl" /> : <img src={enlargedEvidence.signedUrl} alt="Enlarged community-submitted report evidence" className="max-h-[90vh] max-w-[92vw] rounded-xl object-contain" />}
      </div>
    </div>}
  </>, document.body);
}

export default function AuthorityDashboard({ reports, onUpdateStatus, loading, loadError, onRetry, onOpenReport, details, detailsLoading, onCloseDetails }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(null);
  const reviewInFlight = useRef(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const categories = [...new Set(reports.map((report) => report.category).filter(Boolean))].sort();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = reports.filter((report) => (!term || `${report.title} ${report.description} ${report.location}`.toLowerCase().includes(term))
      && (category === 'all' || report.category === category)
      && (severity === 'all' || report.severity === severity)
      && (status === 'all' || report.status === status)
      && (!dateFrom || new Date(report.createdAt) >= new Date(`${dateFrom}T00:00:00`)));
    return rows.sort((a, b) => sort === 'oldest' ? new Date(a.createdAt) - new Date(b.createdAt)
      : sort === 'severity' ? severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
        : new Date(b.createdAt) - new Date(a.createdAt));
  }, [reports, query, category, severity, status, dateFrom, sort]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const cards = [
    { label: 'Assigned reports', value: reports.length, icon: ClipboardList, tone: 'text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/50' },
    { label: 'Awaiting review', value: reports.filter((report) => ['Under verification', 'Authority notified'].includes(report.status)).length, icon: Clock3, tone: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/50' },
    { label: 'Accepted / verified', value: reports.filter((report) => report.status === 'Verified').length, icon: Check, tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50' },
    { label: 'Rejected', value: reports.filter((report) => report.status === 'Rejected').length, icon: CircleX, tone: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50' },
  ];

  const act = async (report, nextStatus, note = '') => {
    if (reviewInFlight.current) return;
    if (!isReviewable(report) || !['Verified', 'Rejected'].includes(nextStatus)) {
      setActionError('This report is no longer awaiting review. Refresh the queue before trying again.');
      return;
    }
    reviewInFlight.current = true;
    setBusy(report.id);
    setActionError('');
    setActionSuccess('');
    try {
      await onUpdateStatus(report.id, nextStatus, note);
      setActionSuccess(nextStatus === 'Verified' ? 'Report accepted and marked verified.' : 'Report rejected and recorded.');
      setRejecting(null);
      setReason('');
    } catch (error) {
      setActionError(error.message || 'The report decision could not be saved. Refresh and retry.');
    } finally {
      reviewInFlight.current = false;
      setBusy(null);
    }
  };

  const detailsAction = (report) => <button type="button" onClick={() => onOpenReport(report)} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 px-3 text-xs font-bold text-slate-700 transition hover:border-emerald-700 hover:bg-emerald-50 hover:text-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-navy-700">Details</button>;
  const reviewActions = (report) => <div className="flex flex-wrap items-center gap-2">
    {detailsAction(report)}
    {isReviewable(report) && <button type="button" onClick={() => act(report, 'Verified')} disabled={!!busy} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-emerald-100">{busy === report.id ? 'Saving…' : <><Check className="h-3.5 w-3.5" />Accept</>}</button>}
    {canReject(report) && <button type="button" onClick={() => { setRejecting(report); setReason(''); setActionError(''); }} disabled={!!busy} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-300 px-3 text-xs font-bold text-rose-800 transition hover:bg-rose-50 disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-rose-100 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950/40"><X className="h-3.5 w-3.5" />Reject</button>}
  </div>;

  const filterControl = 'min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-100 dark:focus:ring-emerald-950';

  return <main className="mx-auto w-full max-w-7xl space-y-7 px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-800 dark:bg-orange-950/60 dark:text-orange-200">Authority Review Portal</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">Assigned reports</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Review community reports within your assigned service area and record a clear decision.</p>
      </div>
      <button type="button" onClick={onRetry} disabled={loading} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-200 dark:hover:bg-navy-700 sm:self-auto"><RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh queue</button>
    </header>

    {loadError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100" role="alert">Reports could not be loaded: {loadError.message} <button type="button" onClick={onRetry} className="ml-1 font-bold underline">Retry</button></div>}
    {actionError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100" role="alert">{actionError}</div>}
    {actionSuccess && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100" role="status">{actionSuccess}</div>}

    <section aria-label="Assigned report summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-navy-800 sm:p-5">
        <div className="flex items-start justify-between gap-2"><div><p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100 sm:text-3xl">{loading || loadError ? '—' : value}</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p></div><span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div>
      </article>)}
    </section>

    <section aria-labelledby="report-queue-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-navy-800">
      <div className="space-y-4 border-b border-slate-200 p-4 dark:border-slate-700 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="report-queue-heading" className="text-lg font-bold text-slate-900 dark:text-slate-100">Report queue</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Search and filter reports assigned to you.</p></div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{filtered.length} matching</p></div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative sm:col-span-2"><span className="sr-only">Search reports</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search reports" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search title, description, location" className={`${filterControl} pl-9 pr-3`} /></label>
          <select aria-label="Category filter" value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }} className={filterControl}><option value="all">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select aria-label="Severity filter" value={severity} onChange={(event) => { setSeverity(event.target.value); setPage(0); }} className={filterControl}><option value="all">All severities</option>{severityOrder.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select aria-label="Status filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className={filterControl}><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <label><span className="sr-only">From date</span><input aria-label="From date" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(0); }} className={filterControl} /></label>
          <select aria-label="Sort reports" value={sort} onChange={(event) => { setSort(event.target.value); setPage(0); }} className={filterControl}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="severity">Severity</option></select>
        </div>
      </div>

      {loading ? <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400" role="status">Loading assigned reports…</div>
        : loadError ? null
          : reports.length === 0 ? <div className="p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-navy-900 dark:text-slate-300"><ClipboardList className="h-5 w-5" /></div><h3 className="mt-3 font-bold text-slate-900 dark:text-slate-100">No assigned reports</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No reports are currently assigned to your active service area.</p></div>
            : filtered.length === 0 ? <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No reports match these filters. Adjust the search or filter selections.</div>
              : <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-navy-900 dark:text-slate-400"><tr><th className="px-5 py-3.5">Report</th><th className="px-4 py-3.5">Location</th><th className="px-4 py-3.5">Severity</th><th className="px-4 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">{pageRows.map((report) => <tr key={report.id} className="transition hover:bg-slate-50/80 dark:hover:bg-navy-700/40">
                      <td className="max-w-sm px-5 py-4"><button type="button" onClick={() => onOpenReport(report)} className="text-left focus:outline-none focus:ring-2 focus:ring-emerald-700"><span className="block truncate font-bold text-slate-900 hover:text-emerald-800 dark:text-slate-100 dark:hover:text-emerald-300">{report.title}</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{report.category} · {dateLabel(report.createdAt)}</span></button></td>
                      <td className="max-w-52 px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{report.location}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${severityStyle[report.severity] || severityStyle.LOW}`}>{report.severity}</span></td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyle[report.status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{report.status}</span></td>
                      <td className="px-5 py-4"><div className="flex justify-end">{reviewActions(report)}</div></td>
                    </tr>)}</tbody>
                  </table>
                </div>

                <ul className="divide-y divide-slate-100 dark:divide-slate-700 lg:hidden">{pageRows.map((report) => <li key={report.id} className="space-y-3 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-bold text-slate-900 dark:text-slate-100">{report.title}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{report.category} · {dateLabel(report.createdAt)}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${severityStyle[report.severity] || severityStyle.LOW}`}>{report.severity}</span></div>
                  <p className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{report.location}</p>
                  <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${statusStyle[report.status] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>{report.status}</span></div>
                  {reviewActions(report)}
                </li>)}</ul>

                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs dark:border-slate-700 sm:px-5"><span className="font-medium text-slate-500 dark:text-slate-400">Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}</span><div className="flex gap-2"><button type="button" disabled={!page} onClick={() => setPage(page - 1)} className="min-h-9 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200">Previous</button><button type="button" disabled={(page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(page + 1)} className="min-h-9 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200">Next</button></div></footer>
              </>}
    </section>

    {rejecting && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRejecting(null); }}><section role="dialog" aria-modal="true" aria-labelledby="reject-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800"><div className="flex items-start justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-wide text-rose-700">Report decision</span><h2 id="reject-title" className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100">Reject this report?</h2></div><button type="button" onClick={() => setRejecting(null)} aria-label="Close rejection dialog" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-700"><X className="h-5 w-5" /></button></div><p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Confirming records the rejection in the report history. You may add an optional note.</p><label htmlFor="rejection-reason" className="mt-4 block text-sm font-semibold text-slate-800 dark:text-slate-200">Review note (optional)</label><textarea id="rejection-reason" autoFocus value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} rows={4} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-100 dark:border-slate-600 dark:bg-navy-900 dark:text-white" placeholder="Add a note for the report history" /><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setRejecting(null)} className="min-h-10 rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-700 dark:border-slate-600 dark:text-slate-200">Cancel</button><button type="button" disabled={!!busy} onClick={() => act(rejecting, 'Rejected', reason)} className="min-h-10 rounded-lg bg-rose-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Submitting…' : 'Confirm rejection'}</button></div></section></div>}
    <ReportDetailsDialog key={details?.report.id || 'closed'} details={details} detailsLoading={detailsLoading} onClose={onCloseDetails} onRetry={onOpenReport} />
  </main>;
}

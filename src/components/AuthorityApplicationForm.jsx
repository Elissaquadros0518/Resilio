import React, { useEffect, useMemo, useState } from 'react';
import { Building2, X } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { fetchMyAuthorityApplication, fetchSupportedJurisdictions, submitAuthorityApplication } from '../data/reports';

const fieldClass = (invalid = false) => `w-full rounded-xl border ${invalid ? 'border-rose-400 focus:ring-rose-100' : 'border-stone-200 focus:border-teal-600 focus:ring-teal-100'} bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:ring-4`;

export default function AuthorityApplicationForm({ onCancel, onSubmitted }) {
  const { configured, user, profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.display_name || '');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');
  const [jurisdictions, setJurisdictions] = useState([]);
  const [jurisdictionsLoading, setJurisdictionsLoading] = useState(true);
  const [jurisdictionsError, setJurisdictionsError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setJurisdictionsLoading(true);
    setJurisdictionsError('');
    fetchSupportedJurisdictions()
      .then((rows) => { if (active) setJurisdictions(rows); })
      .catch((error) => { if (active) setJurisdictionsError(error.message || 'Verified service areas could not be loaded.'); })
      .finally(() => { if (active) setJurisdictionsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (profile?.display_name && !fullName) setFullName(profile.display_name);
  }, [profile?.display_name, fullName]);

  const visibleAreas = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    return jurisdictions.filter((area) => !value || `${area.display_name} ${area.city} ${area.state}`.toLocaleLowerCase().includes(value));
  }, [jurisdictions, query]);

  const reloadJurisdictions = async () => {
    setJurisdictionsLoading(true);
    setJurisdictionsError('');
    try { setJurisdictions(await fetchSupportedJurisdictions()); }
    catch (error) { setJurisdictionsError(error.message || 'Verified service areas could not be loaded.'); }
    finally { setJurisdictionsLoading(false); }
  };

  const chooseArea = (area) => {
    setSelectedArea(area);
    setQuery(area.display_name);
    setMenuOpen(false);
    setActiveIndex(-1);
    setErrors((current) => ({ ...current, jurisdiction: '' }));
  };

  const handleAreaKeyDown = (event) => {
    if (event.key === 'Escape') { setMenuOpen(false); return; }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMenuOpen(true);
      setActiveIndex((index) => Math.min(index < 0 ? 0 : index + 1, Math.max(visibleAreas.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => index <= 0 ? Math.max(visibleAreas.length - 1, 0) : index - 1);
    } else if (event.key === 'Enter' && menuOpen && visibleAreas.length) {
      event.preventDefault();
      chooseArea(visibleAreas[activeIndex] || visibleAreas[0]);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!fullName.trim()) nextErrors.fullName = 'Enter your full name.';
    if (organization.trim().length < 2) nextErrors.organization = 'Enter your organization or department.';
    if (designation.trim().length < 2) nextErrors.designation = 'Enter your designation.';
    if (!selectedArea?.id) nextErrors.jurisdiction = 'Choose a verified service area from the suggestions.';
    setErrors(nextErrors);
    setErrorMessage('');
    if (Object.keys(nextErrors).length) return;
    if (!configured || !user) { setErrorMessage('Sign in with your community account before submitting an application.'); return; }
    if (profile?.role !== 'user') { setErrorMessage('Only a trusted community profile can submit an authority application.'); return; }

    setSubmitting(true);
    try {
      const existing = await fetchMyAuthorityApplication();
      if (existing) throw new Error('An application already exists for this account. Its decision is shown on your profile.');
      const submitted = await submitAuthorityApplication({
        full_name: fullName.trim(),
        organization: organization.trim(),
        designation: designation.trim(),
        requested_jurisdiction_id: selectedArea.id,
      });
      onSubmitted(submitted);
    } catch (error) {
      setErrorMessage(error.message || 'The application could not be submitted. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <section aria-labelledby="authority-application-form-heading" className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900 dark:bg-navy-800 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 id="authority-application-form-heading" className="text-lg font-bold text-slate-900 dark:text-slate-100">Request Authority Access</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Your request stays pending until the ResiliMap project owner reviews it. It does not change your community role.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close application form" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:hover:bg-navy-700"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>

      {!configured && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-950">Supabase is not configured. Applications cannot be submitted.</p>}
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="applicant-full-name" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</label>
          <input id="applicant-full-name" autoComplete="name" maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} className={fieldClass(!!errors.fullName)} aria-invalid={!!errors.fullName} />
          {errors.fullName && <p className="mt-1 text-xs text-rose-700">{errors.fullName}</p>}
        </div>
        <div>
          <label htmlFor="applicant-organization" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Organization or department</label>
          <input id="applicant-organization" maxLength={160} value={organization} onChange={(event) => setOrganization(event.target.value)} className={fieldClass(!!errors.organization)} placeholder="Organization or department" aria-invalid={!!errors.organization} />
          {errors.organization && <p className="mt-1 text-xs text-rose-700">{errors.organization}</p>}
        </div>
        <div>
          <label htmlFor="applicant-designation" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Designation</label>
          <input id="applicant-designation" maxLength={120} value={designation} onChange={(event) => setDesignation(event.target.value)} className={fieldClass(!!errors.designation)} placeholder="Your role or position" aria-invalid={!!errors.designation} />
          {errors.designation && <p className="mt-1 text-xs text-rose-700">{errors.designation}</p>}
        </div>
        <div className="relative">
          <label htmlFor="applicant-jurisdiction" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Requested service area</label>
          <input
            id="applicant-jurisdiction" role="combobox" aria-autocomplete="list" aria-expanded={menuOpen}
            aria-controls="supported-jurisdictions" aria-activedescendant={menuOpen && visibleAreas[activeIndex] ? `jurisdiction-option-${activeIndex}` : undefined}
            value={query} onFocus={() => setMenuOpen(true)} onBlur={() => setMenuOpen(false)} onKeyDown={handleAreaKeyDown}
            onChange={(event) => { setQuery(event.target.value); setSelectedArea(null); setMenuOpen(true); setActiveIndex(-1); setErrors((current) => ({ ...current, jurisdiction: '' })); }}
            className={fieldClass(!!errors.jurisdiction)} placeholder={jurisdictionsLoading ? 'Loading verified service areas…' : 'Search verified service areas'}
            autoComplete="off" aria-invalid={!!errors.jurisdiction} disabled={!configured || jurisdictionsLoading}
          />
          {menuOpen && !jurisdictionsLoading && visibleAreas.length > 0 && <div id="supported-jurisdictions" role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-stone-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-navy-900">{visibleAreas.map((area, index) => <div id={`jurisdiction-option-${index}`} key={area.id} role="option" aria-selected={selectedArea?.id === area.id} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseArea(area)} className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm ${activeIndex === index ? 'bg-emerald-50 text-emerald-950' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-navy-800'}`}><span className="block font-semibold">{area.display_name}</span><span className="block text-xs text-slate-500">{area.city}, {area.state}</span></div>)}</div>}
          {menuOpen && !jurisdictionsLoading && query && !visibleAreas.length && !jurisdictionsError && <p className="absolute z-20 mt-1 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-slate-600 shadow-lg dark:border-slate-700 dark:bg-navy-900">No verified service area matches that search.</p>}
          {jurisdictionsLoading && <p role="status" className="mt-1 text-xs text-slate-500">Loading verified service areas…</p>}
          {jurisdictionsError && <p role="alert" className="mt-1 text-xs text-rose-700">{jurisdictionsError} <button type="button" onClick={reloadJurisdictions} className="font-bold underline">Retry</button></p>}
          {!jurisdictionsLoading && !jurisdictionsError && !jurisdictions.length && <p className="mt-1 text-xs text-amber-800">No verified service areas are configured. Ask the project owner to add approved locality records before applying.</p>}
          {selectedArea && <p className="mt-1 text-xs text-emerald-800">Selected: {selectedArea.display_name}{selectedArea.latitude != null && selectedArea.longitude != null ? ` · ${selectedArea.latitude}, ${selectedArea.longitude}` : ' · coordinates not configured'}</p>}
          {errors.jurisdiction && <p className="mt-1 text-xs text-rose-700">{errors.jurisdiction}</p>}
        </div>
        {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-900">{errorMessage}</p>}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" disabled={submitting || jurisdictionsLoading || !!jurisdictionsError} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60"><Building2 className="h-4 w-4" aria-hidden="true" />{submitting ? 'Submitting…' : 'Submit application'}</button>
          <button type="button" onClick={onCancel} disabled={submitting} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-navy-700">Cancel</button>
        </div>
      </form>
    </section>
  );
}

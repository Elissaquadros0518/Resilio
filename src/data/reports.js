import { INITIAL_REPORTS } from './mockData';
import { isSupabaseConfigured, supabase, supabaseProjectHost } from '../lib/supabase';

const PUBLIC_REPORT_COLUMNS = 'id, title, category, description, severity, status, location_name, latitude, longitude, created_at, updated_at, reviewed_at, resolved_at';
const ALLOWED_SEVERITIES = new Set(['LOW', 'MODERATE', 'MEDIUM', 'HIGH', 'CRITICAL']);
const ALLOWED_STATUSES = new Set(['Under verification', 'Verified', 'Authority notified', 'Resolved', 'Rejected']);
const PUBLIC_REPORT_STATUSES = new Set(['Verified', 'Resolved']);
const ALLOWED_CATEGORIES = new Set([
  'Flooding / Waterlogging', 'Extreme Heat', 'Water Shortage', 'Infrastructure Damage',
  'Road Problem', 'Fallen Tree', 'Power Issue', 'Other', 'Drainage Problem',
]);
const STATUS_NAMES = new Map([...ALLOWED_STATUSES].map((status) => [status.toLowerCase(), status]));
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export class ReportValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ReportValidationError';
    this.field = field;
  }
}

const cleanText = (value) => typeof value === 'string' ? value.trim() : '';

export function normalizeCategory(value) {
  const category = cleanText(value);
  if (!ALLOWED_CATEGORIES.has(category)) {
    throw new ReportValidationError('Choose a report category.', 'category');
  }
  return category;
}

export function normalizeSeverity(value) {
  const severity = cleanText(value).toUpperCase();
  if (!ALLOWED_SEVERITIES.has(severity)) {
    throw new ReportValidationError('Choose a valid severity level.', 'severity');
  }
  return severity;
}

export function normalizeStatus(value) {
  const normalized = cleanText(value).replace(/[_-]+/g, ' ').toLowerCase();
  const status = STATUS_NAMES.get(normalized);
  if (!status) throw new Error('A report returned an unsupported status. Refresh the report list.');
  return status;
}

function normalizeCoordinates(latitude, longitude) {
  const hasLatitude = latitude !== null && latitude !== undefined && latitude !== '';
  const hasLongitude = longitude !== null && longitude !== undefined && longitude !== '';
  if (hasLatitude !== hasLongitude) {
    throw new ReportValidationError('Location coordinates must include both latitude and longitude.', 'location');
  }
  if (!hasLatitude) return { latitude: null, longitude: null };

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new ReportValidationError('The selected coordinates are not valid. Try using GPS again.', 'location');
  }
  return { latitude: lat, longitude: lng };
}

export function validateReportInput(input = {}) {
  const category = normalizeCategory(input.category);
  const location = cleanText(input.location ?? input.location_name);
  const description = cleanText(input.description);
  if (!location) throw new ReportValidationError('Enter the location of the issue.', 'location');
  if (location.length > 240) throw new ReportValidationError('Location must be 240 characters or fewer.', 'location');
  if (!description) throw new ReportValidationError('Describe what you observed.', 'description');
  if (description.length > 5000) throw new ReportValidationError('Description must be 5,000 characters or fewer.', 'description');

  const severity = normalizeSeverity(input.severity);
  const coords = normalizeCoordinates(input.latitude ?? input.lat, input.longitude ?? input.lng);
  const evidence = typeof File !== 'undefined' && input.evidence instanceof File ? input.evidence : null;
  if (input.evidence && !evidence) throw new ReportValidationError('Choose an image or video file from this device.', 'evidence');
  if (evidence && !['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(evidence.type)) {
    throw new ReportValidationError('Evidence must be JPEG, PNG, WebP, or MP4.', 'evidence');
  }
  if (evidence && evidence.size > MAX_EVIDENCE_BYTES) {
    throw new ReportValidationError('Evidence must be 10 MB or smaller.', 'evidence');
  }

  return { category, location_name: location, description, severity, ...coords, evidence };
}

function relativeTime(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Recently reported';
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  if (Math.abs(seconds) < 45) return 'Just now';
  const units = [
    ['day', 86400], ['hour', 3600], ['minute', 60],
  ];
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(seconds, 'second');
}

export function mapReportRow(row) {
  if (!row) throw new Error('A report returned an unsupported record. Refresh the report list.');
  const severity = normalizeSeverity(row.severity);
  const status = normalizeStatus(row.status);
  return {
    id: String(row.id),
    title: cleanText(row.title) || cleanText(row.category),
    category: cleanText(row.category),
    location: cleanText(row.location_name),
    lat: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    lng: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    time: relativeTime(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    severity,
    status,
    description: cleanText(row.description),
    evidence: null,
    // Authority notified is a legacy in-progress state, not an acceptance.
    verified: ['Verified', 'Resolved'].includes(status),
    user: 'Community member',
    source: 'supabase',
  };
}

export function getDemoReports() {
  return INITIAL_REPORTS.map((report) => ({ ...report, source: 'demo' }));
}

export async function fetchPublicReports() {
  if (!isSupabaseConfigured || !supabase) {
    return { reports: getDemoReports(), source: 'demo', warning: 'Supabase is not configured.' };
  }
  const { data, error } = await supabase.from('reports')
    .select(PUBLIC_REPORT_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  // RLS is the authorization boundary. Filter owner-visible private rows out
  // of community-facing lists as defense in depth.
  const publicRows = (data || []).filter((row) => PUBLIC_REPORT_STATUSES.has(row.status));
  return { reports: publicRows.map(mapReportRow), source: 'supabase', warning: null };
}

/**
 * Load the aggregate community metrics and a small public-only recent feed.
 * The aggregate RPC returns counts and display names only; the feed uses the
 * existing report RLS policy and selects no descriptions or coordinates.
 */
export async function fetchCommunityOverview() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Community data is unavailable.');
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Sign in to view live community data.');

  const [summaryResult, reportsResult] = await Promise.all([
    supabase.rpc('get_community_summary'),
    supabase.from('reports')
      .select('id, title, category, location_name, status, created_at')
      .in('status', ['Verified', 'Resolved'])
      .order('created_at', { ascending: false })
      .limit(8),
  ]);
  if (summaryResult.error) throw summaryResult.error;
  if (reportsResult.error) throw reportsResult.error;

  return {
    summary: summaryResult.data,
    recentReports: (reportsResult.data || []).map((row) => ({
      id: String(row.id),
      title: cleanText(row.title) || cleanText(row.category) || 'Community report',
      category: cleanText(row.category),
      location: cleanText(row.location_name),
      status: normalizeStatus(row.status),
      createdAt: row.created_at,
    })),
  };
}

/** Load full details only after the user opens an RLS-visible public report. */
export async function fetchCommunityReportDetails(reportId) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('reports')
    .select(PUBLIC_REPORT_COLUMNS)
    .eq('id', reportId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This report is no longer available to your account.');
  return mapReportRow(data);
}

export async function fetchMyReports() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured. Your report history is unavailable.');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Sign in to view your report history.');

  const { data, error } = await supabase.rpc('get_my_reports');
  if (error) throw error;
  return (data || []).map(mapReportRow);
}

/**
 * Soft-delete an eligible own report through a database-owned authorization
 * check. The RPC determines ownership from auth.uid() and retains audit rows.
 */
export async function withdrawMyReport(reportId) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured. Reports cannot be deleted right now.');
  if (!reportId) throw new Error('Choose a report to delete.');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Your session has expired. Sign in again to delete this report.');

  const { data, error } = await supabase.rpc('withdraw_my_report', { p_report_id: reportId });
  if (error) {
    if (error.code === 'PGRST202' || /withdraw_my_report.*schema cache/i.test(error.message || '')) {
      throw new Error('Report deletion is not enabled in the database yet. Apply supabase/migrations/202610150003_reporter_withdrawal.sql and try again.');
    }
    throw error;
  }
  if (data !== true) throw new Error('This report could not be deleted. Only your own report that has not entered review can be deleted.');
  return true;
}

function safeEvidenceName(file) {
  const extensionName = cleanText(file.name).toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .slice(0, 80) || 'evidence';
  const uniquePart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${uniquePart}-${extensionName}`;
}

export async function uploadReportEvidence(reportId, file, uploadedObjectPath = null, onProgress = null) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  if (!reportId || !(file instanceof File)) throw new Error('Select an evidence file to upload.');
  const objectPath = uploadedObjectPath || `${reportId}/${safeEvidenceName(file)}`;
  if (!uploadedObjectPath) {
    onProgress?.('uploading');
    const { error: uploadError } = await supabase.storage
      .from('riskscape-report-evidence')
      .upload(objectPath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
  }

  const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
  onProgress?.('saving-metadata');
  const { error: metadataError } = await supabase.from('report_media').insert({
    report_id: reportId,
    object_path: objectPath,
    media_type: mediaType,
  });
  if (metadataError) {
    const error = new Error(metadataError.message || 'Evidence metadata could not be saved.');
    error.cause = metadataError;
    error.objectPath = objectPath;
    error.evidenceUploaded = true;
    throw error;
  }
  onProgress?.('complete');
  return { objectPath, mediaType };
}

export async function createReport(input, { onEvidenceProgress } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Reports cannot be submitted until the project URL and publishable key are set.');
  }
  const report = validateReportInput(input);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Your session has expired. Sign in again to submit this report.');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token || !session.user?.id) {
    throw new Error('Your session has expired. Sign in again to submit this report.');
  }
  if (session.user.id !== user.id) {
    throw new Error('Your sign-in changed while the report was being prepared. Refresh the page and sign in again.');
  }

  // Development diagnostics deliberately omit the access token and all other
  // session credentials. This snapshot is taken immediately before the INSERT.
  if (import.meta.env.DEV) {
    console.info('[Riskscape] report insert auth snapshot', {
      projectHost: supabaseProjectHost,
      sessionExists: Boolean(session?.access_token),
      userId: session?.user?.id || null,
    });
  }

  // Ownership, initial status, and jurisdiction are assigned by BEFORE INSERT
  // triggers. The browser sends only form fields and cannot choose protected
  // report state.
  const insertPayload = {
    category: report.category,
    description: report.description,
    severity: report.severity,
    location_name: report.location_name,
    latitude: report.latitude,
    longitude: report.longitude,
  };
  const { data, error } = await supabase.from('reports').insert(insertPayload)
    .select(PUBLIC_REPORT_COLUMNS).single()
    // Pin the validated session so a cross-tab auth change cannot pair this
    // report request with a different user's token.
    .setHeader('Authorization', `Bearer ${session.access_token}`);
  if (error) {
    // Supabase error metadata is useful for RLS diagnosis. Never log headers,
    // keys, or tokens; keep this diagnostic available only in development.
    if (import.meta.env.DEV) {
      console.error('[Riskscape] report insert failed', {
        projectHost: supabaseProjectHost,
        userId: session.user.id,
        httpStatus: error.status || null,
        code: error.code || null,
        message: error.message || null,
        details: error.details || null,
        hint: error.hint || null,
        insertFields: Object.keys(insertPayload),
        category: insertPayload.category,
        severity: insertPayload.severity,
        hasLocation: Boolean(insertPayload.location_name),
        hasCoordinates: insertPayload.latitude !== null && insertPayload.longitude !== null,
      });
    }
    // Preserve Supabase's actual message and metadata for the report-creation
    // error shown by the form. Evidence uploads have their own error channel.
    const insertError = new Error(error.message || 'Supabase rejected the insert.');
    insertError.code = error.code;
    insertError.status = error.status;
    insertError.details = error.details;
    insertError.hint = error.hint;
    insertError.stage = 'report-insert';
    throw insertError;
  }

  const savedReport = mapReportRow(data);
  if (!report.evidence) return { report: savedReport, evidenceError: null };

  try {
    await uploadReportEvidence(savedReport.id, report.evidence, null, onEvidenceProgress);
    return { report: savedReport, evidenceError: null };
  } catch (error) {
    // The report itself is committed already. Return that success separately
    // so the UI does not invite a second report submission on evidence failure.
    return { report: savedReport, evidenceError: error, evidenceRetryPath: error.evidenceUploaded ? error.objectPath : null };
  }
}

/**
 * Return short-lived links only for media rows visible through report_media RLS.
 * The private bucket policy independently checks the same owner/reviewer access.
 */
export async function fetchReportEvidenceLinks(reportId) {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  if (!reportId) return [];
  // A successful RLS-scoped report lookup distinguishes a legitimate empty
  // evidence list from a private or otherwise inaccessible report. Never use
  // the status passed in from the browser as evidence authorization.
  const { data: accessibleReport, error: reportError } = await supabase.from('reports')
    .select('id')
    .eq('id', reportId)
    .maybeSingle();
  if (reportError) throw reportError;
  if (!accessibleReport) throw new Error('You are not authorized to view this report or its evidence.');

  const { data, error } = await supabase.from('report_media')
    .select('id, object_path, media_type, uploaded_at')
    .eq('report_id', reportId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  const links = await Promise.all((data || []).map(async (media) => {
    const { data: signed, error: signedError } = await supabase.storage
      .from('riskscape-report-evidence')
      .createSignedUrl(media.object_path, 5 * 60);
    if (signedError) throw signedError;
    return { ...media, signedUrl: signed.signedUrl };
  }));
  return links;
}

export async function fetchAuthorityAccess() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('get_my_authority_access');
  if (error) throw error;
  return data?.[0] || null;
}

export async function fetchSupportedJurisdictions() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('jurisdictions')
    .select('id, display_name, city, state, latitude, longitude').order('display_name');
  if (error) throw error;
  return data || [];
}

export async function fetchMyAuthorityApplication() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('authority_applications')
    .select('id, status, review_note, reviewed_at, created_at')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitAuthorityApplication(input) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Create or sign in to a community account first.');
  const fields = {
    full_name: cleanText(input.full_name), organization: cleanText(input.organization),
    designation: cleanText(input.designation), requested_jurisdiction_id: cleanText(input.requested_jurisdiction_id),
  };
  const limits = { full_name: 100, organization: 160, designation: 120, requested_jurisdiction_id: 100 };
  for (const [key, max] of Object.entries(limits)) {
    if (fields[key].length < 2 || fields[key].length > max) throw new Error(`Check the ${key.replaceAll('_', ' ')} field.`);
  }
  const { data, error } = await supabase.from('authority_applications')
    .insert(fields)
    .select('id, status, review_note, reviewed_at, created_at')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('An application already exists for this account.');
    throw error;
  }
  return data;
}

export async function fetchAuthorityReports() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.rpc('get_authority_reports', { p_offset: offset, p_limit: 1000 });
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows.map(mapReportRow);
}

export async function fetchAuthorityReportDetails(reportId) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const mediaResult = await supabase.from('report_media')
    .select('id, object_path, media_type, uploaded_at')
    .eq('report_id', reportId)
    .order('uploaded_at', { ascending: false });
  const evidence = await Promise.all((mediaResult.data || []).map(async (item) => {
    const { data, error } = await supabase.storage.from('riskscape-report-evidence').createSignedUrl(item.object_path, 300);
    return { ...item, signedUrl: data?.signedUrl || null, urlError: error?.message || null };
  }));
  return {
    evidence,
    evidenceError: mediaResult.error || null,
  };
}

export async function reviewReport(reportId, nextStatus, note = '') {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!['Verified', 'Rejected'].includes(nextStatus)) {
    throw new Error('Choose Accept or Reject for a report decision.');
  }
  const { data, error } = await supabase.rpc('review_report_status', {
    p_report_id: reportId, p_new_status: nextStatus, p_note: note.trim() || null,
  });
  if (error) throw error;
  if (!data?.length) throw new Error('The report status was not changed. Refresh and retry.');
  return mapReportRow(data[0]);
}


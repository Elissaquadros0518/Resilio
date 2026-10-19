import React, { useEffect, useRef, useState } from 'react';
import { CloudRain, Sun, Droplet, Hammer, AlertTriangle, Wind, Zap, HelpCircle, Locate, Camera, Image, Video, CheckCircle2, Send } from 'lucide-react';
import { ReportValidationError, uploadReportEvidence } from '../data/reports';

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const VIDYAVIHAR = [19.076, 72.896];

function ReportLocationMap({ coordinates, onSelect, interactive = true }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const mapClickHandlerRef = useRef(null);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || !globalThis.L) return undefined;
    const map = globalThis.L.map(containerRef.current).setView(VIDYAVIHAR, 14);
    mapRef.current = map;
    globalThis.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      maxZoom: 19,
    }).addTo(map);
    mapClickHandlerRef.current = (event) => onSelectRef.current({ lat: event.latlng.lat, lng: event.latlng.lng }, 'map');
    const resize = window.setTimeout(() => map.invalidateSize(), 100);
    return () => {
      window.clearTimeout(resize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (interactive && mapClickHandlerRef.current) map.on('click', mapClickHandlerRef.current);
    else if (mapClickHandlerRef.current) map.off('click', mapClickHandlerRef.current);
    ['dragging', 'scrollWheelZoom', 'doubleClickZoom', 'boxZoom', 'keyboard', 'touchZoom'].forEach((name) => {
      const handler = map[name];
      if (handler?.enable && handler?.disable) interactive ? handler.enable() : handler.disable();
    });
    if (markerRef.current?.dragging) interactive ? markerRef.current.dragging.enable() : markerRef.current.dragging.disable();
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !globalThis.L) return;
    if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
      if (markerRef.current) map.removeLayer(markerRef.current);
      markerRef.current = null;
      return;
    }
    const point = [coordinates.lat, coordinates.lng];
    if (!markerRef.current) {
      markerRef.current = globalThis.L.marker(point, { draggable: true }).addTo(map);
      markerRef.current.on('dragend', (event) => {
        const position = event.target.getLatLng();
        onSelectRef.current({ lat: position.lat, lng: position.lng }, 'map');
      });
    } else {
      markerRef.current.setLatLng(point);
    }
    map.setView(point, Math.max(map.getZoom(), 15));
  }, [coordinates]);

  return (
    <div className="h-56 w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div ref={containerRef} className="h-full w-full" aria-label="Select report location on map" />
    </div>
  );
}

export default function ReportIssuePage({ onAddReport, onViewReport }) {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MODERATE');
  const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
  const [gpsMessage, setGpsMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedReport, setSavedReport] = useState(null);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceRetryPath, setEvidenceRetryPath] = useState(null);
  const [retryingEvidence, setRetryingEvidence] = useState(false);
  const [evidenceUploadState, setEvidenceUploadState] = useState('idle');
  const [locating, setLocating] = useState(false);
  const photoInput = useRef(null);
  const videoInput = useRef(null);
  const submitLock = useRef(false);

  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(file.type)) {
      setErrors((current) => ({ ...current, evidence: 'Choose a JPEG, PNG, WebP, or MP4 file.' }));
      setEvidence(null);
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      setErrors((current) => ({ ...current, evidence: 'Evidence must be 10 MB or smaller.' }));
      setEvidence(null);
      return;
    }
    setEvidence(file);
    setErrors((current) => ({ ...current, evidence: '' }));
    setEvidenceError('');
    setEvidenceUploadState('idle');
  };

  const selectCoordinates = (point) => {
    setCoordinates(point);
    setGpsMessage('Location point selected. You can drag the pin to adjust it.');
    setErrors((current) => ({ ...current, location: '' }));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage('GPS is not available in this browser. Enter a location name instead.');
      return;
    }
    setLocating(true);
    setGpsMessage('Your browser will ask whether Riskscape may access your location. Coordinates are used only if the browser returns them.');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        selectCoordinates({ lat: coords.latitude, lng: coords.longitude });
        setGpsMessage('Your browser provided a location. Check the pin and drag it if needed.');
        setErrors((current) => ({ ...current, location: '' }));
      },
      (error) => {
        setLocating(false);
        const messages = {
          1: 'Location permission was denied. You can enter an address or choose a point on the map.',
          2: 'Your browser could not determine a location. You can enter an address or choose a point on the map.',
          3: 'Location request timed out. You can enter an address or choose a point on the map.',
        };
        setGpsMessage(messages[error.code] || 'Location is unavailable. You can enter an address or choose a point on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSubmitFinal = async (e) => {
    e.preventDefault();
    if (submitLock.current || submitting || savedReport) return;
    submitLock.current = true;
    setErrors({});
    setSubmitError('');
    setSubmitting(true);
    try {
      const result = await onAddReport({
        category, location, lat: coordinates.lat, lng: coordinates.lng,
        severity, description, evidence,
      }, { onEvidenceProgress: setEvidenceUploadState });
      setSavedReport(result.report);
      setEvidenceError(result.evidenceError ? `The report was saved, but evidence upload failed: ${result.evidenceError.message || 'Storage is unavailable.'}` : '');
      setEvidenceRetryPath(result.evidenceRetryPath || null);
      if (evidence && !result.evidenceError) {
        setEvidenceUploadState('complete');
        setEvidence(null);
      } else if (evidence && result.evidenceError) {
        setEvidenceUploadState('failed');
      }
    } catch (error) {
      // Evidence upload is intentionally after the report INSERT. If that
      // INSERT fails, no Storage request was made, so keep evidence state idle.
      if (error instanceof ReportValidationError) setErrors({ [error.field]: error.message });
      else setSubmitError(error.message || 'We could not save your report. Check your connection and try again.');
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  const retryEvidenceUpload = async () => {
    if (!savedReport || !evidence || retryingEvidence) return;
    setRetryingEvidence(true);
    setEvidenceError('');
    try {
      await uploadReportEvidence(savedReport.id, evidence, evidenceRetryPath, setEvidenceUploadState);
      setEvidenceError('');
      setEvidenceRetryPath(null);
      setEvidence(null);
      setEvidenceUploadState('complete');
    } catch (error) {
      setEvidenceUploadState('failed');
      setEvidenceError(`Evidence upload still failed: ${error.message || 'Storage is unavailable.'}`);
    } finally {
      setRetryingEvidence(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">Report an Issue</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Help make your neighbourhood safer by reporting what you observe. Powered by Riskscape.</p>
      </div>

      {savedReport && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="flex-1">
              <p className="font-bold">Report saved to Riskscape</p>
              <p className="mt-1">Reference: {savedReport.id}</p>
              {evidenceError && <p className="mt-2 text-amber-900">{evidenceError}</p>}
              {evidenceError && evidence && <button type="button" onClick={retryEvidenceUpload} disabled={retryingEvidence} className="mt-2 rounded-lg border border-emerald-800 px-3 py-2 text-xs font-bold text-emerald-900 disabled:opacity-60">{retryingEvidence ? 'Retrying…' : 'Retry evidence upload'}</button>}
              <button type="button" onClick={() => onViewReport?.(savedReport)} className="ml-2 mt-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">View on map</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmitFinal} noValidate className="bg-white dark:bg-navy-800 p-5 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-card space-y-7">
        
        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 1: What did you observe?</label>
          <div role="group" aria-label="Choose a report category" className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {[
              { id: 'Flooding / Waterlogging', label: 'Flooding / Water', icon: CloudRain, color: 'text-skyBlue' },
              { id: 'Extreme Heat', label: 'Extreme Heat', icon: Sun, color: 'text-warmOrange' },
              { id: 'Water Shortage', label: 'Water Shortage', icon: Droplet, color: 'text-blue-500' },
              { id: 'Infrastructure Damage', label: 'Infrastructure', icon: Hammer, color: 'text-purple-500' },
              { id: 'Road Problem', label: 'Road Problem', icon: AlertTriangle, color: 'text-amber-500' },
              { id: 'Fallen Tree', label: 'Fallen Tree', icon: Wind, color: 'text-safeGreen' },
              { id: 'Power Issue', label: 'Power Issue', icon: Zap, color: 'text-criticalRed' },
              { id: 'Other', label: 'Other Issue', icon: HelpCircle, color: 'text-slate-400' }
            ].map(item => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={category === item.id}
                  onClick={() => { setCategory(item.id); setErrors((current) => ({ ...current, category: '' })); }}
                  className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-3 ${
                    category === item.id
                      ? 'border-tealAccent bg-tealAccent/10 text-tealAccent font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-navy-700/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <IconComp className={`w-6 h-6 ${item.color}`} />
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
          {errors.category && <p className="text-sm font-medium text-rose-700" role="alert">{errors.category}</p>}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 2: Where is it located?</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="report-location"
              type="text"
              value={location}
              onChange={(e) => { setLocation(e.target.value); setErrors((current) => ({ ...current, location: '' })); }}
              maxLength={240}
              required
              aria-invalid={Boolean(errors.location)}
              aria-describedby={errors.location ? 'report-location-error' : undefined}
              placeholder="Enter street, landmark or area (Vidyavihar, Mumbai)"
              className="min-w-0 flex-1 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={Boolean(savedReport) || locating}
              className="justify-center bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center space-x-2 transition"
            >
              <Locate className="w-4 h-4 text-tealAccent" />
              <span>{locating ? 'Finding location…' : 'Use my current location'}</span>
            </button>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">Your browser will request permission only after you choose the location button. We use coordinates only when your browser provides them; you can also select or adjust a point on the map.</p>
          <ReportLocationMap coordinates={coordinates} onSelect={selectCoordinates} interactive={!savedReport} />
          {coordinates.lat !== null && coordinates.lng !== null && (
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300" role="status">
              Selected point: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              <button type="button" disabled={Boolean(savedReport)} className="ml-2 font-bold text-tealAccent underline disabled:opacity-50" onClick={() => { setCoordinates({ lat: null, lng: null }); setGpsMessage('Point removed. The location name will still be included.'); }}>Clear point</button>
            </p>
          )}
          {errors.location && <p id="report-location-error" className="text-sm font-medium text-rose-700" role="alert">{errors.location}</p>}
          {gpsMessage && <p className="text-xs text-slate-500" role="status">{gpsMessage}</p>}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 3: Add evidence (optional)</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              type="button"
              disabled={Boolean(savedReport)}
              onClick={() => { if (photoInput.current) { photoInput.current.accept = 'image/jpeg,image/png,image/webp'; photoInput.current.click(); } }}
              className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-tealAccent text-center transition flex flex-col items-center justify-center space-y-2 group"
            >
              <Camera className="w-6 h-6 text-slate-400 group-hover:text-tealAccent" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Take / choose photo</span>
            </button>
            <button
              type="button"
              disabled={Boolean(savedReport)}
              onClick={() => photoInput.current?.click()}
              className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-tealAccent text-center transition flex flex-col items-center justify-center space-y-2 group"
            >
              <Image className="w-6 h-6 text-slate-400 group-hover:text-tealAccent" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Upload photo</span>
            </button>
            <button
              type="button"
              disabled={Boolean(savedReport)}
              onClick={() => videoInput.current?.click()}
              className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 hover:border-tealAccent text-center transition flex flex-col items-center justify-center space-y-2 group"
            >
              <Video className="w-6 h-6 text-slate-400 group-hover:text-tealAccent" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Upload video</span>
            </button>
          </div>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={chooseFile} />
          <input ref={videoInput} type="file" accept="video/mp4" className="sr-only" onChange={chooseFile} />
          {evidence && <p className="text-xs text-slate-600 dark:text-slate-300" role="status">Selected: {evidence.name} ({(evidence.size / 1024 / 1024).toFixed(1)} MB). Evidence is private and shared only with you and authorized reviewers.</p>}
          {evidence && !savedReport && <button type="button" onClick={() => { setEvidence(null); setEvidenceError(''); setErrors((current) => ({ ...current, evidence: '' })); setEvidenceUploadState('idle'); }} className="text-xs font-bold text-rose-700 underline">Remove selected file</button>}
          {evidenceUploadState !== 'idle' && (
            <div role="status" className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <p>{evidenceUploadState === 'uploading' ? 'Uploading evidence to private storage…' : evidenceUploadState === 'saving-metadata' ? 'Securing evidence details…' : evidenceUploadState === 'complete' ? 'Evidence saved privately.' : evidenceUploadState === 'failed' ? 'Evidence upload failed. Use retry above to try again.' : 'Preparing evidence upload…'}</p>
              {!['complete', 'failed'].includes(evidenceUploadState) && <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full w-2/5 animate-pulse rounded-full bg-teal-700" /></div>}
            </div>
          )}
          {errors.evidence && <p className="text-sm font-medium text-rose-700" role="alert">{errors.evidence}</p>}
          <p className="text-xs text-slate-500 dark:text-slate-400">JPEG, PNG, WebP, or MP4 · maximum 10 MB. No AI analysis is run here.</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 4: Describe the problem</label>
          <textarea
            rows="3"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors((current) => ({ ...current, description: '' })); }}
            maxLength={5000}
            required
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? 'report-description-error' : undefined}
            placeholder="Tell us what happened in detail..."
            className="w-full bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm font-medium text-slate-900 dark:text-slate-100"
          ></textarea>
          {errors.description && <p id="report-description-error" className="text-sm font-medium text-rose-700" role="alert">{errors.description}</p>}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-bold text-slate-900 dark:text-slate-100">Step 5: How severe is it?</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['Low', 'Moderate', 'High', 'Critical'].map(sev => (
              <button
                key={sev}
                type="button"
                aria-pressed={severity === sev.toUpperCase()}
                onClick={() => setSeverity(sev.toUpperCase())}
                className={`py-3.5 rounded-2xl text-xs font-bold border transition ${
                    severity === sev.toUpperCase()
                    ? sev === 'Critical' ? 'bg-criticalRed text-white border-criticalRed shadow-lg shadow-criticalRed/25' :
                      sev === 'High' ? 'bg-warmOrange text-white border-warmOrange shadow-lg shadow-warmOrange/25' :
                      'bg-tealAccent text-white border-tealAccent shadow-lg shadow-tealAccent/25'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || Boolean(savedReport)}
          className="w-full bg-emerald-800 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-900 transition flex items-center justify-center space-x-2.5 text-base disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="w-5 h-5" />
          <span>{submitting ? 'Saving report…' : savedReport ? 'Report saved' : 'Submit Report to Community'}</span>
        </button>
        {submitError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">{submitError} <button type="submit" className="ml-2 font-bold underline" disabled={submitting}>Retry</button></div>}
      </form>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Cloud, CloudRain, Droplets, MapPin, RefreshCw, Thermometer, Wind } from 'lucide-react';
import { describeWeatherCode, fetchWeather } from '../data/weather';

const REPRESENTATIVE_AREA = {
  id: 'vidyavihar',
  label: 'Vidyavihar, Mumbai (representative area)',
  latitude: 19.076,
  longitude: 72.897,
};

function locationKey(location) {
  return `${Number(location.latitude).toFixed(2)},${Number(location.longitude).toFixed(2)}`;
}

function formatNumber(value, digits = 0) {
  return Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value) : null;
}

function formatLocalTime(value, timeZone) {
  if (!value) return null;
  const parts = value.split(/[-T:]/).map(Number);
  if (parts.length < 5 || parts.some((part) => !Number.isFinite(part))) return value;
  const timestamp = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]));
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(timestamp);
  } catch {
    return value.replace('T', ' ');
  }
}

function formatForecastDay(value) {
  const date = new Date(`${value}T12:00:00Z`);
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function Metric({ icon: Icon, label, value, unit }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-navy-900/70">
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
      <div className="min-w-0">
        <div className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">{label}</div>
        <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
          {value === null ? '—' : `${formatNumber(value, label === 'Rain / precip.' ? 1 : 0)}${unit ? ` ${unit}` : ''}`}
        </div>
      </div>
    </div>
  );
}

export default function WeatherSnapshot({ reports = [], reportSource = 'demo' }) {
  const locations = useMemo(() => {
    const seen = new Set([locationKey(REPRESENTATIVE_AREA)]);
    const reportLocations = reportSource === 'supabase'
      ? reports.filter((report) => report.lat !== null && report.lat !== undefined && report.lng !== null && report.lng !== undefined && Number.isFinite(Number(report.lat)) && Number.isFinite(Number(report.lng)))
      : [];
    return [REPRESENTATIVE_AREA, ...reportLocations.reduce((list, report) => {
      const location = { id: `report-${report.id}`, label: `${report.location || report.title} (report location)`, latitude: Number(report.lat), longitude: Number(report.lng) };
      const key = locationKey(location);
      if (!seen.has(key)) {
        seen.add(key);
        list.push(location);
      }
      return list;
    }, [])].slice(0, 7);
  }, [reports, reportSource]);

  const [selectedId, setSelectedId] = useState(REPRESENTATIVE_AREA.id);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = locations.find((item) => item.id === selectedId) || REPRESENTATIVE_AREA;
  const key = locationKey(location);
  const matchingResult = result?.key === key ? result.data : null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchWeather(location.latitude, location.longitude)
      .then((data) => { if (active) setResult({ key, data }); })
      .catch((requestError) => { if (active) setError(requestError.message || 'Weather data could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key, location.latitude, location.longitude]);

  const retry = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchWeather(location.latitude, location.longitude, { force: true });
      setResult({ key, data });
    } catch (requestError) {
      setError(requestError.message || 'Weather data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const description = matchingResult ? describeWeatherCode(matchingResult.current.code) : null;
  const lastUpdated = matchingResult ? formatLocalTime(matchingResult.current.time, matchingResult.location.timezone) : null;
  const retrievedAt = matchingResult?.fetchedAt ? new Date(matchingResult.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;

  return (
    <section aria-labelledby="weather-title" className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-card dark:border-slate-700 dark:bg-navy-800">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-sky-800 dark:text-sky-300">
            <Cloud aria-hidden="true" className="h-4 w-4" /> Weather observations & forecast
          </div>
          <h3 id="weather-title" className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100">Area weather</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Modelled current conditions and forecast. Weather does not confirm an incident or predict a disaster.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="weather-location" className="sr-only">Weather location</label>
          <select id="weather-location" value={location.id} onChange={(event) => setSelectedId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:border-slate-600 dark:bg-navy-900 dark:text-slate-100 sm:max-w-xs">
            {locations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <button type="button" onClick={retry} disabled={loading} aria-label="Refresh weather" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-navy-700">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-7">
        {loading && !matchingResult && <p role="status" className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading weather for {location.label}…</p>}
        {error && (
          <div role="alert" className="mb-4 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}{matchingResult ? ' Showing the last successful response for this location; it may be stale.' : ''}</span>
            <button type="button" onClick={retry} disabled={loading} className="shrink-0 font-bold underline disabled:opacity-50">Retry</button>
          </div>
        )}
        {matchingResult && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="col-span-2 flex items-center gap-4 rounded-2xl bg-sky-50 px-4 py-3 dark:bg-sky-950/25 sm:col-span-1 sm:flex-col sm:items-start sm:justify-center">
                <Thermometer aria-hidden="true" className="h-7 w-7 shrink-0 text-sky-800 dark:text-sky-300" />
                <div>
                  <div className="text-3xl font-extrabold leading-none text-slate-900 dark:text-white">{formatNumber(matchingResult.current.temperature, 1)}{matchingResult.units.temperature}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{description || 'Current estimate'}</div>
                  {matchingResult.current.apparentTemperature !== null && <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Feels like {formatNumber(matchingResult.current.apparentTemperature, 1)}{matchingResult.units.apparentTemperature}</div>}
                </div>
              </div>
              <Metric icon={Droplets} label="Humidity" value={matchingResult.current.humidity} unit={matchingResult.units.humidity} />
              <Metric icon={CloudRain} label="Rain / precip." value={matchingResult.current.precipitation} unit={matchingResult.units.precipitation} />
              <Metric icon={Wind} label="Wind" value={matchingResult.current.wind} unit={matchingResult.units.wind} />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">5-day forecast</h4>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{location.label}</span>
              </div>
              {matchingResult.daily.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {matchingResult.daily.map((day) => (
                    <div key={day.date} className="rounded-xl border border-slate-100 px-3 py-3 dark:border-slate-700">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{formatForecastDay(day.date)}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">{describeWeatherCode(day.code) || 'Forecast'}</div>
                      <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{day.high === null ? '—' : `${formatNumber(day.high)}°`} <span className="text-slate-400">/ {day.low === null ? '—' : `${formatNumber(day.low)}°`}</span></div>
                      {day.precipitationProbability !== null && <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Rain chance {formatNumber(day.precipitationProbability)}%</div>}
                      {day.precipitation !== null && <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatNumber(day.precipitation, 1)} mm forecast</div>}
                    </div>
                  ))}
                </div>
              ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-navy-900 dark:text-slate-400">Forecast details are not available from the provider right now.</p>}
            </div>

            <div className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>Weather model time: {lastUpdated || 'not provided'}{matchingResult.fromCache ? ' · cached response' : ''}</span>
              <span>{matchingResult.fromCache ? `Last retrieved ${retrievedAt}` : `Retrieved ${retrievedAt}`}</span>
            </div>
          </>
        )}
      </div>
      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-700 dark:bg-navy-900/50 dark:text-slate-400 sm:px-7">
        Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="font-semibold text-emerald-800 underline dark:text-emerald-300">Open-Meteo</a> (CC BY 4.0). Weather estimates are separate from community-submitted reports and are not proof of local impacts.
      </div>
    </section>
  );
}

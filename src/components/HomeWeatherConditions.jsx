import React, { useEffect, useState } from 'react';
import { Activity, Cloud, CloudRain, Droplets, RefreshCw, Thermometer, Wind } from 'lucide-react';
import { describeWeatherCode, fetchWeather } from '../data/weather';

const latitude = 19.076;
const longitude = 72.897;

function formatWeatherTime(value, timeZone) {
  if (!value) return null;
  const [date, time] = value.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone })
      .format(new Date(Date.UTC(year, month - 1, day, hour, minute)));
  } catch {
    return value.replace('T', ' ');
  }
}

function ConditionCard({ label, value, unit, icon: Icon, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700/80 dark:bg-navy-800 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
        <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-800 dark:bg-navy-700 dark:text-emerald-300">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{value}{unit ? ` ${unit}` : ''}</div>
      <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{sub}</div>
    </div>
  );
}

export default function HomeWeatherConditions() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadWeather = async (force = false) => {
    setLoading(true);
    setError('');
    try {
      setWeather(await fetchWeather(latitude, longitude, { force }));
    } catch (requestError) {
      setError(requestError.message || 'Weather data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWeather(); }, []);

  const current = weather?.current;
  const cards = current ? [
    { label: 'Temperature', value: current.temperature, unit: weather.units.temperature, sub: current.apparentTemperature === null ? 'Current model estimate' : `Feels like ${current.apparentTemperature}${weather.units.apparentTemperature}`, icon: Thermometer },
    { label: 'Humidity', value: current.humidity, unit: current.humidity === null ? '' : weather.units.humidity, sub: 'Relative humidity', icon: Droplets },
    { label: 'Precipitation', value: current.precipitation, unit: current.precipitation === null ? '' : weather.units.precipitation, sub: 'Current model period', icon: CloudRain },
    { label: 'Wind', value: current.wind, unit: current.wind === null ? '' : weather.units.wind, sub: 'Near-surface estimate', icon: Wind },
    { label: 'Conditions', value: describeWeatherCode(current.code) || '—', unit: '', sub: current.cloudCover === null ? 'Weather model estimate' : `Cloud cover ${current.cloudCover}%`, icon: Cloud },
  ] : [];

  return (
    <section aria-labelledby="home-weather-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="home-weather-title" className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          <Activity aria-hidden="true" className="h-5 w-5 text-tealAccent" />
          Current Local Conditions
        </h3>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Vidyavihar representative area</span>
          <button type="button" onClick={() => loadWeather(true)} disabled={loading} aria-label="Refresh local weather" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:opacity-50 dark:border-slate-700 dark:bg-navy-800 dark:hover:bg-navy-700">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && !weather && <p role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-navy-800 dark:text-slate-400">Loading weather estimates…</p>}
      {error && <div role="alert" className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 sm:flex-row sm:items-center sm:justify-between"><span>{error}{weather ? ' Showing the last successful response, which may be stale.' : ''}</span><button type="button" onClick={() => loadWeather(true)} disabled={loading} className="shrink-0 font-bold underline disabled:opacity-50">Retry</button></div>}
      {cards.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 sm:gap-4">{cards.map((card) => <ConditionCard key={card.label} {...card} />)}</div>}
      {weather && <div className="flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <span>Weather model time: {formatWeatherTime(weather.current.time, weather.location.timezone)}{weather.fromCache ? ' · cached' : ''}</span>
        <span>Modelled weather context does not establish local impacts. Data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="font-semibold text-emerald-800 underline dark:text-emerald-300">Open-Meteo</a> (CC BY 4.0).</span>
      </div>}
    </section>
  );
}

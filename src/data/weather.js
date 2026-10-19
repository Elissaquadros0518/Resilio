const DEFAULT_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;
const responseCache = new Map();

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'rain',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
];

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'precipitation_sum',
  'wind_speed_10m_max',
];

export class WeatherRequestError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'WeatherRequestError';
    this.status = status;
  }
}

function validateCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new WeatherRequestError('Choose a valid location before loading weather.');
  }
  return { latitude: lat, longitude: lon };
}

function cacheKey(latitude, longitude) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function validateWeatherPayload(payload) {
  if (!payload || !payload.current || !payload.current_units || !payload.timezone) {
    throw new WeatherRequestError('The weather provider returned incomplete data. Please try again later.');
  }
  if (!Number.isFinite(payload.current.temperature_2m) || !payload.current.time) {
    throw new WeatherRequestError('The weather provider did not return a current temperature and timestamp. Please try again.');
  }

  const daily = payload.daily && Array.isArray(payload.daily.time)
    ? payload.daily.time.map((date, index) => ({
      date,
      code: numberOrNull(payload.daily.weather_code?.[index]),
      high: numberOrNull(payload.daily.temperature_2m_max?.[index]),
      low: numberOrNull(payload.daily.temperature_2m_min?.[index]),
      precipitationProbability: numberOrNull(payload.daily.precipitation_probability_max?.[index]),
      precipitation: numberOrNull(payload.daily.precipitation_sum?.[index]),
      wind: numberOrNull(payload.daily.wind_speed_10m_max?.[index]),
    }))
    : [];

  return {
    location: {
      latitude: numberOrNull(payload.latitude),
      longitude: numberOrNull(payload.longitude),
      timezone: payload.timezone,
    },
    units: {
      temperature: payload.current_units.temperature_2m || '°C',
      apparentTemperature: payload.current_units.apparent_temperature || payload.current_units.temperature_2m || '°C',
      humidity: payload.current_units.relative_humidity_2m || '%',
      precipitation: payload.current_units.precipitation || 'mm',
      wind: payload.current_units.wind_speed_10m || 'km/h',
    },
    current: {
      time: payload.current.time,
      temperature: payload.current.temperature_2m,
      apparentTemperature: numberOrNull(payload.current.apparent_temperature),
      humidity: numberOrNull(payload.current.relative_humidity_2m),
      precipitation: numberOrNull(payload.current.precipitation),
      rain: numberOrNull(payload.current.rain),
      code: numberOrNull(payload.current.weather_code),
      cloudCover: numberOrNull(payload.current.cloud_cover),
      wind: numberOrNull(payload.current.wind_speed_10m),
    },
    daily,
  };
}

export async function fetchWeather(latitude, longitude, { force = false } = {}) {
  const coords = validateCoordinates(latitude, longitude);
  const key = cacheKey(coords.latitude, coords.longitude);
  const cached = responseCache.get(key);
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { ...cached, fromCache: true };
  }

  const endpoint = import.meta.env.VITE_WEATHER_API_BASE_URL || DEFAULT_ENDPOINT;
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new WeatherRequestError('Weather provider URL is not configured correctly.');
  }
  url.searchParams.set('latitude', String(coords.latitude));
  url.searchParams.set('longitude', String(coords.longitude));
  url.searchParams.set('current', CURRENT_FIELDS.join(','));
  url.searchParams.set('daily', DAILY_FIELDS.join(','));
  url.searchParams.set('forecast_days', '5');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('precipitation_unit', 'mm');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      if (response.status === 429) {
        throw new WeatherRequestError('The weather provider is rate-limiting requests. Wait a few minutes and retry.', 429);
      }
      if (response.status >= 500) {
        throw new WeatherRequestError('The weather provider is temporarily unavailable. Please retry shortly.', response.status);
      }
      throw new WeatherRequestError(`Weather data could not be loaded (HTTP ${response.status}).`, response.status);
    }
    const payload = validateWeatherPayload(await response.json());
    const result = { ...payload, fetchedAt: Date.now(), fromCache: false };
    responseCache.set(key, result);
    return result;
  } catch (error) {
    if (error instanceof WeatherRequestError) throw error;
    if (error.name === 'AbortError') {
      throw new WeatherRequestError('The weather request timed out. Check your connection and retry.');
    }
    throw new WeatherRequestError('Weather data could not be reached. Check your connection and retry.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export function describeWeatherCode(code) {
  if (!Number.isFinite(code)) return null;
  if (code === 0) return 'Clear sky';
  if ([1, 2, 3].includes(code)) return ({ 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast' })[code];
  if ([45, 48].includes(code)) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Weather conditions available';
}

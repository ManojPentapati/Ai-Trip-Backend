import React, { useState, useEffect } from 'react';
import './WeatherWidget.css';
import { getCachedWeather, setCachedWeather } from '../utils/weatherCache.js';

const WeatherWidget = ({ destination, country }) => {
  const [weather, setWeather]   = useState(null);
  const [loading, setLoading]   = useState(!destination);
  const [error, setError]       = useState(null);

  const location = `${destination || ''}${country && country !== destination ? `, ${country}` : ''}`;

  useEffect(() => {
    if (!destination) return;

    const cached = getCachedWeather(destination);
    if (cached) {
      setWeather(cached);
      setLoading(false);
      return;
    }

    const url = `https://wttr.in/${encodeURIComponent(destination)}?format=j1`;
    fetch(url)
      .then(r => { if (!r.ok) throw new Error('Weather unavailable'); return r.json(); })
      .then(data => {
        setCachedWeather(destination, data);
        setWeather(data);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [destination]);

  if (loading) return (
    <div className="ww-loading">
      <div className="ww-spinner" />
      <p>Fetching weather for {destination}…</p>
    </div>
  );

  if (error || !weather) return (
    <div className="ww-error">
      <span>🌦️</span>
      <p>Weather data unavailable for <strong>{destination}</strong>.<br/>Check your connection or try again.</p>
    </div>
  );

  const current = weather.current_condition?.[0];
  const astronomy = weather.weather?.[0]?.astronomy?.[0];
  const forecast = weather.weather || [];

  const weatherCode = parseInt(current?.weatherCode || 0);
  const getIcon = (code) => {
    if (code === 113) return '☀️';
    if ([116, 119].includes(code)) return '⛅';
    if ([122, 143].includes(code)) return '🌤️';
    if ([176, 185, 263, 266].includes(code)) return '🌦️';
    if ([200, 386, 389].includes(code)) return '⛈️';
    if ([179, 182, 227, 230].includes(code)) return '🌨️';
    if ([248, 260].includes(code)) return '🌫️';
    if (code >= 296) return '🌧️';
    return '⛅';
  };

  const tempC = current?.temp_C || '—';
  const feelsLike = current?.FeelsLikeC || '—';
  const humidity = current?.humidity || '—';
  const windKph = current?.windspeedKmph || '—';
  const desc = current?.weatherDesc?.[0]?.value || '';
  const uvIndex = current?.uvIndex || '—';

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="ww-container">
      {/* Current weather card */}
      <div className="ww-current">
        <div className="ww-current-left">
          <div className="ww-icon">{getIcon(weatherCode)}</div>
          <div>
            <div className="ww-temp">{tempC}°C</div>
            <div className="ww-desc">{desc}</div>
            <div className="ww-location">📍 {location}</div>
          </div>
        </div>
        <div className="ww-current-right">
          <div className="ww-stat"><span>🌡️</span><div><small>Feels Like</small><strong>{feelsLike}°C</strong></div></div>
          <div className="ww-stat"><span>💧</span><div><small>Humidity</small><strong>{humidity}%</strong></div></div>
          <div className="ww-stat"><span>💨</span><div><small>Wind</small><strong>{windKph} km/h</strong></div></div>
          <div className="ww-stat"><span>☀️</span><div><small>UV Index</small><strong>{uvIndex}</strong></div></div>
        </div>
      </div>

      {/* Sunrise/sunset */}
      {astronomy && (
        <div className="ww-astro">
          <span>🌅 Sunrise: {astronomy.sunrise}</span>
          <span>🌇 Sunset: {astronomy.sunset}</span>
          <span>🌕 Moon: {astronomy.moon_phase}</span>
        </div>
      )}

      {/* 3–day forecast */}
      <div className="ww-forecast-title">3-Day Forecast</div>
      <div className="ww-forecast">
        {forecast.slice(0, 3).map((day, i) => {
          const date = new Date(day.date);
          const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[date.getDay()];
          const code = parseInt(day.hourly?.[4]?.weatherCode || 113);
          return (
            <div className="ww-day" key={i}>
              <div className="ww-day-name">{dayName}</div>
              <div className="ww-day-icon">{getIcon(code)}</div>
              <div className="ww-day-desc">{day.hourly?.[4]?.weatherDesc?.[0]?.value || ''}</div>
              <div className="ww-day-temps">
                <span className="ww-max">{day.maxtempC}°</span>
                <span className="ww-min">{day.mintempC}°</span>
              </div>
              <div className="ww-day-rain">💧 {day.hourly?.[4]?.chanceofrain || 0}%</div>
            </div>
          );
        })}
      </div>

      <p className="ww-note">⚡ Live data via wttr.in · Best for current conditions</p>
    </div>
  );
};

export default WeatherWidget;

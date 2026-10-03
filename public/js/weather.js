import { APP_CONFIG } from "../config.js";
import { readCache, writeCache } from "./storage.js";

const WEATHER_CACHE_KEY = "homepage-cf-weather-v1";

function weatherCodeText(code) {
  const map = new Map([
    [0, "晴"], [1, "大致晴朗"], [2, "多云"], [3, "阴"],
    [45, "雾"], [48, "雾凇"], [51, "小毛毛雨"], [53, "毛毛雨"], [55, "强毛毛雨"],
    [61, "小雨"], [63, "中雨"], [65, "大雨"], [71, "小雪"], [73, "中雪"], [75, "大雪"],
    [80, "阵雨"], [81, "强阵雨"], [82, "暴雨"], [95, "雷暴"], [96, "雷暴伴冰雹"], [99, "强雷暴"],
  ]);
  return map.get(code) || "天气";
}

async function updateWeather() {
  const weather = APP_CONFIG.weather;
  const maxAgeMs = weather.cacheMinutes * 60_000;
  let payload = readCache(WEATHER_CACHE_KEY, maxAgeMs);

  if (!payload) {
    const params = new URLSearchParams({
      latitude: String(weather.latitude),
      longitude: String(weather.longitude),
      current: "temperature_2m,weather_code,apparent_temperature",
      timezone: weather.timezone,
    });

    if (weather.units === "imperial") {
      params.set("temperature_unit", "fahrenheit");
      params.set("wind_speed_unit", "mph");
      params.set("precipitation_unit", "inch");
    }

    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      payload = await response.json();
      writeCache(WEATHER_CACHE_KEY, payload);
    } catch {
      document.getElementById("weather-value").textContent = "--";
      document.getElementById("weather-extra").textContent = weather.label;
      return;
    }
  }

  const current = payload.current || {};
  const temp = Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)}°C` : "--";
  document.getElementById("weather-value").textContent = `${temp} · ${weatherCodeText(current.weather_code)}`;
  document.getElementById("weather-extra").textContent =
    `${weather.label} · 体感 ${Number.isFinite(current.apparent_temperature) ? `${Math.round(current.apparent_temperature)}°C` : "--"}`;
}

export { updateWeather };

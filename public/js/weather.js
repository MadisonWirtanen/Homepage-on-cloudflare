import { APP_CONFIG } from "../config.js";
import { readCacheEntry, writeCache } from "./storage.js";

const WEATHER_CACHE_KEY = "homepage-cf-weather-v2";

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
  const cached = readCacheEntry(WEATHER_CACHE_KEY, maxAgeMs);

  const render = (payload, { stale = false } = {}) => {
    const current = payload?.current || {};
    const temp = Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)}°C` : "--";
    document.getElementById("weather-value").textContent = `${temp} · ${weatherCodeText(current.weather_code)}`;

    const apparent = Number.isFinite(current.apparent_temperature)
      ? `${Math.round(current.apparent_temperature)}°C`
      : "--";
    const locationLabel = payload?.location?.label || weather.label;
    document.getElementById("weather-extra").textContent =
      `${locationLabel} · 体感 ${apparent}${stale ? " · 缓存" : ""}`;
  };

  if (cached) {
    render(cached.value, { stale: cached.isStale });
    if (!cached.isStale) return;
  }

  try {
    const response = await fetch("/api/weather", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    writeCache(WEATHER_CACHE_KEY, payload);
    render(payload);
  } catch {
    if (!cached?.value) {
      document.getElementById("weather-value").textContent = "--";
      document.getElementById("weather-extra").textContent = weather.label;
    }
  }
}
export { updateWeather };

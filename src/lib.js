export function summarizeUptimeRobot(data) {
  const monitors = Array.isArray(data?.monitors) ? data.monitors : [];
  let up = 0;
  let down = 0;
  let paused = 0;
  let unknown = 0;

  for (const monitor of monitors) {
    if (monitor.status === 2) up += 1;
    else if (monitor.status === 8 || monitor.status === 9) down += 1;
    else if (monitor.status === 0) paused += 1;
    else unknown += 1;
  }

  return { up, down, paused, unknown, total: monitors.length };
}

export function isCrossSiteRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return true;
  return request.headers.get("Sec-Fetch-Site") === "cross-site";
}


export const HANGZHOU_WEATHER_LOCATION = Object.freeze({
  label: "杭州",
  city: "Hangzhou",
  region: "Zhejiang",
  country: "CN",
  latitude: 30.2936,
  longitude: 120.1614,
  timezone: "Asia/Shanghai",
  source: "fallback",
});

function cleanLocationText(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 80);
}

export function resolveWeatherLocation(cf = {}) {
  const latitude = Number(cf?.latitude);
  const longitude = Number(cf?.longitude);
  const validCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!validCoordinates) {
    return { ...HANGZHOU_WEATHER_LOCATION };
  }

  const city = cleanLocationText(cf?.city);
  const region = cleanLocationText(cf?.region);
  const country = cleanLocationText(cf?.country);
  const timezone = cleanLocationText(cf?.timezone) || "auto";
  const label = /^hangzhou$/i.test(city)
    ? "杭州"
    : city || region || country || "当前位置";

  return {
    label,
    city,
    region,
    country,
    latitude,
    longitude,
    timezone,
    source: "ip",
  };
}

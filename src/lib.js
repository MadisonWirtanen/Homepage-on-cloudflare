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

export function tailscaleOnline(lastSeen, thresholdMs = 5 * 60 * 1000) {
  const time = new Date(lastSeen).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= thresholdMs;
}

export function isCrossSiteRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return true;
  return request.headers.get("Sec-Fetch-Site") === "cross-site";
}

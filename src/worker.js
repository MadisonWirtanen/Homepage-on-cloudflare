import { HEALTH_CHECKS } from "../public/config.js";
import { isCrossSiteRequest, summarizeUptimeRobot } from "./lib.js";

let statusMemoryCache = { expiresAt: 0, payload: null };

function numberEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function sanitizedError(error) {
  if (!error) return "unknown error";
  if (error.name === "AbortError") return "timeout";
  const message = String(error.message || error);
  return message.replace(/https?:\/\/\S+/g, "remote endpoint").slice(0, 160);
}

function configured(...values) {
  return values.every((value) => typeof value === "string" && value.trim().length > 0);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function fetchCloudflareTunnelStatus(env, timeoutMs) {
  if (!configured(env.CLOUDFLARE_API_TOKEN, env.CLOUDFLARE_ACCOUNT_ID, env.CLOUDFLARE_TUNNEL_ID)) {
    return { configured: false, ok: false, status: "unconfigured" };
  }
  try {
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(env.CLOUDFLARE_ACCOUNT_ID)}/cfd_tunnel/${encodeURIComponent(env.CLOUDFLARE_TUNNEL_ID)}`;
    const response = await fetchWithTimeout(endpoint, {
      headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, Accept: "application/json" },
    }, timeoutMs);
    if (!response.ok) throw new Error(`Cloudflare API HTTP ${response.status}`);
    const data = await response.json();
    if (!data?.success || !data?.result) throw new Error("Cloudflare API returned an unsuccessful response");
    return {
      configured: true, ok: true,
      status: data.result.status || "unknown",
      connections: Array.isArray(data.result.connections) ? data.result.connections.length : null,
    };
  } catch (error) {
    return { configured: true, ok: false, status: "error", error: sanitizedError(error) };
  }
}

async function fetchUptimeRobotStatus(env, timeoutMs) {
  if (!configured(env.UPTIMEROBOT_API_KEY)) return { configured: false, ok: false, status: "unconfigured" };
  try {
    const body = new URLSearchParams({ api_key: env.UPTIMEROBOT_API_KEY, format: "json", logs: "0" });
    const response = await fetchWithTimeout("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    }, timeoutMs);
    if (!response.ok) throw new Error(`UptimeRobot HTTP ${response.status}`);
    const data = await response.json();
    if (data?.stat !== "ok") throw new Error("UptimeRobot returned an unsuccessful response");
    const summary = summarizeUptimeRobot(data);
    return { configured: true, ok: true, status: summary.down > 0 ? "degraded" : "up", ...summary };
  } catch (error) {
    return { configured: true, ok: false, status: "error", error: sanitizedError(error) };
  }
}

async function checkSite(check, timeoutMs) {
  const started = Date.now();
  try {
    const response = await fetchWithTimeout(check.url, {
      method: "HEAD", redirect: "follow",
      headers: {
        "User-Agent": "Homepage-on-Cloudflare/1.0 status-check",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
    }, timeoutMs);
    return { id: check.id, online: response.status < 500, status: response.status, latency: Date.now() - started };
  } catch (error) {
    return { id: check.id, online: false, status: null, latency: Date.now() - started, error: sanitizedError(error) };
  }
}

async function fetchSiteStatuses(env, timeoutMs) {
  if (String(env.DIRECT_SITE_CHECKS || "true").toLowerCase() === "false") return {};
  const results = [];
  for (let index = 0; index < HEALTH_CHECKS.length; index += 3) {
    const batch = HEALTH_CHECKS.slice(index, index + 3);
    const batchResults = await Promise.all(batch.map((check) => checkSite(check, timeoutMs)));
    results.push(...batchResults);
  }
  return Object.fromEntries(results.map((result) => [result.id, result]));
}

async function buildStatusPayload(env) {
  const timeoutMs = numberEnv(env.STATUS_TIMEOUT_MS, 4000);
  const [cloudflareTunnel, uptimeRobot, sites] = await Promise.all([
    fetchCloudflareTunnelStatus(env, timeoutMs),
    fetchUptimeRobotStatus(env, timeoutMs),
    fetchSiteStatuses(env, timeoutMs),
  ]);
  return { checkedAt: new Date().toISOString(), providers: { cloudflareTunnel, uptimeRobot }, sites };
}

async function statusHandler(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ error: "method not allowed" }, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  if (isCrossSiteRequest(request)) return jsonResponse({ error: "cross-site request blocked" }, { status: 403 });

  const memoryTtlMs = numberEnv(env.WORKER_MEMORY_TTL_SECONDS, 60) * 1000;
  if (statusMemoryCache.payload && statusMemoryCache.expiresAt > Date.now()) {
    return jsonResponse(request.method === "HEAD" ? null : statusMemoryCache.payload, {
      headers: { "Cache-Control": "no-store", "X-Status-Cache": "memory-hit" },
    });
  }

  const payload = await buildStatusPayload(env);
  statusMemoryCache = { payload, expiresAt: Date.now() + memoryTtlMs };
  return jsonResponse(request.method === "HEAD" ? null : payload, {
    headers: { "Cache-Control": "no-store", "X-Status-Cache": "memory-miss" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/status") return statusHandler(request, env);
    if (url.pathname === "/api/health") {
      return jsonResponse({ ok: true, runtime: "cloudflare-workers" }, { headers: { "Cache-Control": "no-store" } });
    }
    if (url.pathname.startsWith("/api/")) return jsonResponse({ error: "not found" }, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};

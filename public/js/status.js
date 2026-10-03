import { APP_CONFIG } from "../config.js";
import { applyStatus } from "./ui.js";
import { readCacheEntry, writeCache } from "./storage.js";

const STATUS_CACHE_KEY = "homepage-cf-status-v3";

async function refreshStatus({ force = false } = {}) {
  const button = document.getElementById("refresh-status");
  const maxAgeMs = APP_CONFIG.statusCacheMinutes * 60_000;

  const cached = readCacheEntry(STATUS_CACHE_KEY, maxAgeMs);

  if (!force && cached) {
    applyStatus(cached.value, { stale: cached.isStale });
    if (!cached.isStale) return;
  }

  if (button) button.disabled = true;

  try {
    const response = await fetch("/api/status", {
      headers: { Accept: "application/json" },
      cache: force ? "reload" : "default",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    writeCache(STATUS_CACHE_KEY, payload);
    applyStatus(payload);
  } catch (error) {
    if (cached?.value) {
      applyStatus(cached.value, { stale: true, refreshFailed: true });
    } else {
      const updated = document.getElementById("status-updated");
      if (updated) updated.textContent = `状态获取失败：${error.message}`;
    }
  } finally {
    if (button) button.disabled = false;
  }
}

export { refreshStatus };

import { APP_CONFIG, GROUPS, STATUS_CARDS } from "./config.js";

const STATUS_CACHE_KEY = "homepage-cf-status-v1";
const WEATHER_CACHE_KEY = "homepage-cf-weather-v1";

function safeText(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function providerTone(provider) {
  if (!provider?.configured) return "idle";
  if (!provider?.ok) return "bad";
  const status = provider.status;
  if (["healthy", "up", "online"].includes(status)) return "good";
  if (["degraded", "partial", "warning"].includes(status)) return "warn";
  if (["down", "offline", "error"].includes(status)) return "bad";
  return "good";
}

function cardIcon(item) {
  if (item.icon) {
    const img = document.createElement("img");
    img.className = "card-icon";
    img.src = item.icon;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      const abbr = document.createElement("div");
      abbr.className = "card-abbr";
      abbr.textContent = item.abbr || item.name?.slice(0, 1) || "?";
      img.replaceWith(abbr);
    });
    return img;
  }
  const abbr = document.createElement("div");
  abbr.className = "card-abbr";
  abbr.textContent = item.abbr || item.name?.slice(0, 1) || "?";
  return abbr;
}

function createServiceCard(item) {
  const card = document.createElement(item.href ? "a" : "article");
  card.className = "card";
  card.dataset.itemId = item.id;
  if (item.href) {
    card.href = item.href;
    card.target = item.target || "_blank";
    if (card.target === "_blank") card.rel = "noopener noreferrer";
  }

  const main = document.createElement("div");
  main.className = "card-main";
  main.appendChild(cardIcon(item));

  const copy = document.createElement("div");
  copy.className = "card-copy";
  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = item.name;
  copy.appendChild(title);

  if (item.description) {
    const description = document.createElement("p");
    description.className = "card-description";
    description.textContent = item.description;
    copy.appendChild(description);
  }

  main.appendChild(copy);
  card.appendChild(main);

  if (item.healthCheck) {
    const health = document.createElement("span");
    health.className = "site-health";
    health.dataset.healthId = item.id;
    health.innerHTML = '<span class="status-dot"></span><span class="health-text">待检查</span>';
    card.appendChild(health);
  }

  return card;
}

function createSectionHeading(group, headingId) {
  const heading = document.createElement("div");
  heading.className = "section-heading";
  const titleWrap = document.createElement("div");
  titleWrap.className = "section-title-wrap";
  if (group.icon) {
    const icon = document.createElement("img");
    icon.className = "section-icon";
    icon.src = group.icon;
    icon.alt = "";
    icon.loading = "lazy";
    icon.referrerPolicy = "no-referrer";
    titleWrap.appendChild(icon);
  }
  const title = document.createElement("h2");
  title.id = headingId;
  title.textContent = group.title;
  titleWrap.appendChild(title);
  heading.appendChild(titleWrap);
  return heading;
}

function createGroupSection(group, { columnMode = false } = {}) {
  const section = document.createElement("section");
  section.className = columnMode ? "section group-column" : `section group-row${group.compact ? " compact" : ""}`;
  section.setAttribute("aria-labelledby", `${group.id}-heading`);
  section.appendChild(createSectionHeading(group, `${group.id}-heading`));
  const grid = document.createElement("div");
  grid.className = columnMode ? "card-list" : "card-grid";
  if (!columnMode) grid.style.setProperty("--columns", String(group.columns || 3));
  group.items.forEach((item) => grid.appendChild(createServiceCard(item)));
  section.appendChild(grid);
  return section;
}

function renderGroups() {
  const primary = document.getElementById("service-columns");
  const rows = document.getElementById("groups-root");
  primary.querySelectorAll("[data-generated-primary]").forEach((node) => node.remove());
  rows.replaceChildren();
  for (const group of GROUPS) {
    if (group.id === "public" || group.id === "contact") {
      const section = createGroupSection(group, { columnMode: true });
      section.dataset.generatedPrimary = "true";
      primary.appendChild(section);
    } else {
      rows.appendChild(createGroupSection(group));
    }
  }
}

function renderStatusCards() {
  const grid = document.getElementById("status-grid");
  grid.replaceChildren();
  for (const item of STATUS_CARDS) {
    const card = document.createElement("article");
    card.className = "card status-card";
    card.dataset.providerId = item.id;
    const main = document.createElement("div");
    main.className = "card-main";
    main.appendChild(cardIcon(item));
    const copy = document.createElement("div");
    copy.className = "card-copy";
    const titleRow = document.createElement("div");
    titleRow.className = "card-title-row";
    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = item.name;
    const dot = document.createElement("span");
    dot.className = "status-dot";
    titleRow.append(title, dot);
    const description = document.createElement("p");
    description.className = "card-description";
    description.textContent = item.description;
    copy.append(titleRow, description);
    main.appendChild(copy);
    card.appendChild(main);
    const metrics = document.createElement("div");
    metrics.className = "status-metrics";
    card.appendChild(metrics);
    grid.appendChild(card);
  }
}

function setMetrics(card, metrics) {
  const container = card.querySelector(".status-metrics");
  container.replaceChildren();
  for (const metric of metrics) {
    const block = document.createElement("div");
    block.className = "metric";
    const label = document.createElement("span");
    label.className = "metric-label";
    label.textContent = metric.label;
    const value = document.createElement("span");
    value.className = "metric-value";
    value.textContent = safeText(metric.value);
    block.append(label, value);
    container.appendChild(block);
  }
}

function updateProviderCard(id, provider) {
  const card = document.querySelector(`[data-provider-id="${id}"]`);
  if (!card) return;
  const dot = card.querySelector(".status-dot");
  dot.className = `status-dot ${providerTone(provider)}`;

  if (!provider?.configured) {
    setMetrics(card, [
      { label: "状态", value: "未配置" },
      { label: "说明", value: "请在 Cloudflare 设置变量" },
    ]);
    return;
  }

  if (!provider.ok) {
    setMetrics(card, [
      { label: "状态", value: "获取失败" },
      { label: "信息", value: provider.error || "稍后重试" },
    ]);
    return;
  }

  if (id === "cloudflareTunnel") {
    const statusMap = { healthy: "Healthy", degraded: "Degraded", down: "Down", inactive: "Inactive" };
    setMetrics(card, [
      { label: "Tunnel", value: statusMap[provider.status] || provider.status },
      { label: "连接", value: provider.connections ?? "--" },
    ]);
  } else if (id === "uptimeRobot") {
    setMetrics(card, [
      { label: "正常", value: provider.up },
      { label: "异常", value: provider.down },
    ]);
  }
}

function updateSiteHealth(sites = {}) {
  document.querySelectorAll("[data-health-id]").forEach((badge) => {
    const item = sites[badge.dataset.healthId];
    const dot = badge.querySelector(".status-dot");
    const text = badge.querySelector(".health-text");
    if (!item) {
      dot.className = "status-dot";
      text.textContent = "未检查";
      return;
    }
    dot.className = `status-dot ${item.online ? "good" : "bad"}`;
    text.textContent = item.online ? `${Math.round(item.latency || 0)} ms` : "离线";
    badge.title = item.status ? `HTTP ${item.status}` : safeText(item.error, "检测失败");
  });
}

function applyStatus(payload) {
  updateProviderCard("cloudflareTunnel", payload?.providers?.cloudflareTunnel);
  updateProviderCard("uptimeRobot", payload?.providers?.uptimeRobot);
  updateSiteHealth(payload?.sites);

  const updated = document.getElementById("status-updated");
  updated.textContent = payload?.checkedAt ? `检查于 ${new Date(payload.checkedAt).toLocaleTimeString("zh-CN", { hour12: false })}` : "状态已更新";
}

function readCache(key, maxAgeMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > maxAgeMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Storage can be unavailable in strict privacy modes. The page still works without it.
  }
}

async function refreshStatus({ force = false } = {}) {
  const button = document.getElementById("refresh-status");
  const maxAgeMs = APP_CONFIG.statusCacheMinutes * 60_000;

  if (!force) {
    const cached = readCache(STATUS_CACHE_KEY, maxAgeMs);
    if (cached) {
      applyStatus(cached);
      return;
    }
  }

  button.disabled = true;
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
    document.getElementById("status-updated").textContent = `状态获取失败：${error.message}`;
  } finally {
    button.disabled = false;
  }
}

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
  document.getElementById("weather-extra").textContent = `${weather.label} · 体感 ${Number.isFinite(current.apparent_temperature) ? `${Math.round(current.apparent_temperature)}°C` : "--"}`;
}

function startClock() {
  const dateEl = document.getElementById("date-value");
  const weekdayEl = document.getElementById("weekday-value");
  const timeEl = document.getElementById("time-value");
  const tick = () => {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
    weekdayEl.textContent = now.toLocaleDateString("zh-CN", { weekday: "long" });
    timeEl.textContent = now.toLocaleTimeString("zh-CN", { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

function setupSearch() {
  const select = document.getElementById("search-provider");
  for (const provider of APP_CONFIG.searchProviders) {
    const option = document.createElement("option");
    option.value = provider.id;
    option.textContent = provider.label;
    select.appendChild(option);
  }

  document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = document.getElementById("search-input").value.trim();
    if (!query) return;
    const provider = APP_CONFIG.searchProviders.find((item) => item.id === select.value) || APP_CONFIG.searchProviders[0];
    window.open(`${provider.url}${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
  });
}

function applyTheme() {
  document.title = APP_CONFIG.title;
  document.documentElement.lang = APP_CONFIG.language;
  const bg = document.querySelector(".background");
  bg.style.backgroundImage = `url("${APP_CONFIG.background.image}")`;
  bg.style.filter = `saturate(${APP_CONFIG.background.saturate}%) brightness(${APP_CONFIG.background.brightness}%)`;
  bg.style.opacity = String(APP_CONFIG.background.opacity / 100);
}

function init() {
  applyTheme();
  renderStatusCards();
  renderGroups();
  setupSearch();
  startClock();
  updateWeather();
  refreshStatus();
  document.getElementById("refresh-status").addEventListener("click", () => refreshStatus({ force: true }));
}

init();

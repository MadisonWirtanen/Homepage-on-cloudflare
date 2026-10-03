import { APP_CONFIG, GROUPS, STATUS_CARDS } from "./config.js";

const STATUS_CACHE_KEY = "homepage-cf-status-v2";
const WEATHER_CACHE_KEY = "homepage-cf-weather-v1";

function safeText(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function providerTone(provider) {
  if (!provider?.configured) return "idle";
  if (!provider?.ok) return "bad";
  if (["healthy", "up", "online"].includes(provider.status)) return "good";
  if (["degraded", "partial", "warning"].includes(provider.status)) return "warn";
  if (["down", "offline", "error"].includes(provider.status)) return "bad";
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
  return card;
}

function createSectionHeading({ title, icon, id, actions = null }) {
  const heading = document.createElement("div");
  heading.className = "section-heading";

  const titleWrap = document.createElement("div");
  titleWrap.className = "section-title-wrap";

  if (icon) {
    const img = document.createElement("img");
    img.className = "section-icon";
    img.src = icon;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    titleWrap.appendChild(img);
  }

  const h2 = document.createElement("h2");
  h2.id = id;
  h2.textContent = title;
  titleWrap.appendChild(h2);
  heading.appendChild(titleWrap);

  if (actions) heading.appendChild(actions);
  return heading;
}

function createGroupSection(group, { primary = false } = {}) {
  const section = document.createElement("section");
  section.className = `section ${primary ? "primary-section" : "group-row"} ${group.id}-section${group.compact ? " compact" : ""}`;
  const headingId = `${group.id}-heading`;
  section.setAttribute("aria-labelledby", headingId);
  section.appendChild(createSectionHeading({
    title: group.title,
    icon: group.icon,
    id: headingId,
  }));

  const grid = document.createElement("div");
  grid.className = primary ? "primary-grid" : "card-grid";
  if (!primary) grid.style.setProperty("--columns", String(group.columns || 3));
  group.items.forEach((item) => grid.appendChild(createServiceCard(item)));
  section.appendChild(grid);
  return section;
}

function createStatusSection() {
  const actions = document.createElement("div");
  actions.className = "status-actions";

  const updated = document.createElement("span");
  updated.id = "status-updated";
  updated.className = "muted";
  updated.textContent = "尚未检查";

  const refresh = document.createElement("button");
  refresh.id = "refresh-status";
  refresh.className = "ghost-button";
  refresh.type = "button";
  refresh.textContent = "刷新";

  actions.append(updated, refresh);

  const section = document.createElement("section");
  section.className = "section primary-section status-section";
  section.setAttribute("aria-labelledby", "status-heading");
  section.appendChild(createSectionHeading({
    title: "Status",
    icon: "/icons/uptime-kuma.svg",
    id: "status-heading",
    actions,
  }));

  const grid = document.createElement("div");
  grid.id = "status-grid";
  grid.className = "primary-grid";
  section.appendChild(grid);
  return section;
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

function renderPrimaryLayout() {
  const root = document.getElementById("primary-root");
  const publicGroup = GROUPS.find((group) => group.id === "public");
  const contactGroup = GROUPS.find((group) => group.id === "contact");

  if (publicGroup) {
    root.appendChild(createGroupSection(publicGroup, { primary: true }));
  }

  const split = document.createElement("div");
  split.className = "primary-split";
  split.appendChild(createStatusSection());

  if (contactGroup) {
    split.appendChild(createGroupSection(contactGroup, { primary: true }));
  }

  root.appendChild(split);
}

function renderGroups() {
  const rows = document.getElementById("groups-root");

  for (const group of GROUPS) {
    if (group.id === "public" || group.id === "contact") continue;
    rows.appendChild(createGroupSection(group));
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

function applyStatus(payload) {
  updateProviderCard("cloudflareTunnel", payload?.providers?.cloudflareTunnel);
  updateProviderCard("uptimeRobot", payload?.providers?.uptimeRobot);

  const updated = document.getElementById("status-updated");
  if (updated) {
    updated.textContent = payload?.checkedAt
      ? `检查于 ${new Date(payload.checkedAt).toLocaleTimeString("zh-CN", { hour12: false })}`
      : "状态已更新";
  }
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
    // The page works without local storage.
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
    const updated = document.getElementById("status-updated");
    if (updated) updated.textContent = `状态获取失败：${error.message}`;
  } finally {
    if (button) button.disabled = false;
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
  document.getElementById("weather-extra").textContent =
    `${weather.label} · 体感 ${Number.isFinite(current.apparent_temperature) ? `${Math.round(current.apparent_temperature)}°C` : "--"}`;
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
  const providersRoot = document.getElementById("search-providers");
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  let selectedId = APP_CONFIG.searchProviders[0]?.id;

  function selectProvider(id) {
    selectedId = id;
    providersRoot.querySelectorAll(".search-provider").forEach((button) => {
      const active = button.dataset.providerId === selectedId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  for (const provider of APP_CONFIG.searchProviders) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-provider";
    button.dataset.providerId = provider.id;
    button.textContent = provider.label;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      selectProvider(provider.id);
      input.focus();
    });
    providersRoot.appendChild(button);
  }

  selectProvider(selectedId);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }

    const provider =
      APP_CONFIG.searchProviders.find((item) => item.id === selectedId) ||
      APP_CONFIG.searchProviders[0];

    window.open(`${provider.url}${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
  });
}


function setupLiquidGlass() {
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const elements = document.querySelectorAll(
    ".search-shell, .widget-block, .card, .ghost-button"
  );

  elements.forEach((element) => {
    element.classList.add("liquid-glass");

    if (!finePointer) return;

    element.addEventListener("pointermove", (event) => {
      const rect = element.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      element.style.setProperty("--glass-x", `${x.toFixed(1)}%`);
      element.style.setProperty("--glass-y", `${y.toFixed(1)}%`);
    });

    element.addEventListener("pointerleave", () => {
      element.style.setProperty("--glass-x", "50%");
      element.style.setProperty("--glass-y", "18%");
    });
  });
}

function applyTheme() {
  document.title = APP_CONFIG.title;
  document.documentElement.lang = APP_CONFIG.language;
  document.getElementById("page-title").textContent = APP_CONFIG.title;
  document.getElementById("brand-logo").src = APP_CONFIG.logo;

  const bg = document.querySelector(".background");
  bg.style.backgroundImage = `url("${APP_CONFIG.background.image}")`;
  bg.style.filter =
    `saturate(${APP_CONFIG.background.saturate}%) brightness(${APP_CONFIG.background.brightness}%)`;
  bg.style.opacity = String(APP_CONFIG.background.opacity / 100);
}

function init() {
  applyTheme();
  renderPrimaryLayout();
  renderStatusCards();
  renderGroups();
  setupSearch();
  setupLiquidGlass();
  startClock();
  updateWeather();
  refreshStatus();

  document.getElementById("refresh-status").addEventListener("click", () => {
    refreshStatus({ force: true });
  });
}

init();

import { APP_CONFIG, GROUPS, STATUS_CARDS } from "./config.js";

const STATUS_CACHE_KEY = "homepage-cf-status-v3";
const WEATHER_CACHE_KEY = "homepage-cf-weather-v1";
const GLASS_TRANSPARENCY_KEY = "homepage-glass-transparency-v1";
const DEFAULT_GLASS_TRANSPARENCY = 64;
const THEME_KEY = "homepage-theme-v1";

function safeText(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function providerTone(provider) {
  if (!provider?.configured) return "idle";
  if (!provider?.ok) return "bad";
  if (["healthy", "up", "online"].includes(provider.status)) return "good";
  return "bad";
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

    const toggle = document.createElement("button");
    toggle.className = "status-summary";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");

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
    dot.setAttribute("aria-label", "状态未知");

    const chevron = document.createElement("span");
    chevron.className = "status-chevron";
    chevron.setAttribute("aria-hidden", "true");

    titleRow.append(title, dot);
    copy.appendChild(titleRow);
    main.appendChild(copy);
    toggle.append(main, chevron);

    const details = document.createElement("div");
    details.className = "status-details";
    details.setAttribute("aria-hidden", "true");

    const detailsInner = document.createElement("div");
    detailsInner.className = "status-details-inner";

    const description = document.createElement("p");
    description.className = "status-description";
    description.textContent = item.description;

    const metrics = document.createElement("div");
    metrics.className = "status-metrics";

    detailsInner.append(description, metrics);
    details.appendChild(detailsInner);

    toggle.addEventListener("click", () => {
      const expanded = card.classList.toggle("is-expanded");
      toggle.setAttribute("aria-expanded", String(expanded));
      details.setAttribute("aria-hidden", String(!expanded));
    });

    card.append(toggle, details);
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
  const tone = providerTone(provider);
  dot.className = `status-dot ${tone}`;
  dot.setAttribute(
    "aria-label",
    tone === "good" ? "运行正常" : tone === "bad" ? "运行异常" : "未配置"
  );

  if (!provider?.configured) {
    setMetrics(card, [
      { label: "状态", value: "未配置" },
      { label: "说明", value: "请在 Cloudflare 设置凭据" },
    ]);
    return;
  }

  if (!provider.ok) {
    setMetrics(card, [
      { label: "状态", value: provider.status === "not_found" ? "未找到" : "异常" },
      { label: "信息", value: provider.error || "连接器不可用" },
    ]);
    return;
  }

  if (id === "cloudflareLinux" || id === "cloudflareColoCrossing") {
    const statusMap = { healthy: "Healthy", degraded: "Degraded", down: "Down", inactive: "Inactive" };
    setMetrics(card, [
      { label: "Tunnel", value: statusMap[provider.status] || provider.status },
      { label: "连接", value: provider.connections ?? "--" },
    ]);
  } else if (id === "uptimeRobot") {
    setMetrics(card, [
      { label: "正常", value: provider.up },
      { label: "异常", value: provider.down },
      { label: "暂停", value: provider.paused },
      { label: "总计", value: provider.total },
    ]);
  }
}

function applyStatus(payload) {
  updateProviderCard("cloudflareLinux", payload?.providers?.cloudflareLinux);
  updateProviderCard("cloudflareColoCrossing", payload?.providers?.cloudflareColoCrossing);
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


function roundedRectSdf(x, y, width, height, radius) {
  const cx = width / 2;
  const cy = height / 2;
  const qx = Math.abs(x - cx) - (cx - radius);
  const qy = Math.abs(y - cy) - (cy - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius;
}

function smoothStep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function createDisplacementMap(width, height, radius, rim) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return "";

  const image = context.createImageData(width, height);
  const data = image.data;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sdf = roundedRectSdf(x, y, width, height, radius);
      const gx =
        roundedRectSdf(x + 1, y, width, height, radius) -
        roundedRectSdf(x - 1, y, width, height, radius);
      const gy =
        roundedRectSdf(x, y + 1, width, height, radius) -
        roundedRectSdf(x, y - 1, width, height, radius);

      const length = Math.hypot(gx, gy) || 1;
      const nx = gx / length;
      const ny = gy / length;
      const edgeDistance = Math.max(-sdf, 0);
      const factor = 1 - smoothStep(0, rim, edgeDistance);
      const offset = (y * width + x) * 4;

      data[offset] = Math.max(0, Math.min(255, 128 + nx * factor * 127));
      data[offset + 1] = Math.max(0, Math.min(255, 128 + ny * factor * 127));
      data[offset + 2] = 128;
      data[offset + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL("image/png");
}

function setupRefractionMaps() {
  const maps = [
    { id: "lg-map-pill", width: 760, height: 52, radius: 18, rim: 20 },
    { id: "lg-map-card", width: 250, height: 64, radius: 14, rim: 18 },
    { id: "lg-map-control", width: 130, height: 52, radius: 14, rim: 18 },
  ];

  for (const map of maps) {
    const image = document.getElementById(map.id);
    if (!image) continue;
    const dataUrl = createDisplacementMap(map.width, map.height, map.radius, map.rim);
    if (!dataUrl) continue;
    image.setAttribute("href", dataUrl);
    image.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataUrl);
  }
}

function setupLiquidGlass() {
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const groups = [
    { selector: ".search-shell", mode: "lg-pill" },
    { selector: ".widget-block", mode: "lg-control" },
    { selector: ".card", mode: "lg-card" },
    { selector: ".side-control-button", mode: "lg-control" },
  ];

  for (const group of groups) {
    document.querySelectorAll(group.selector).forEach((element) => {
      element.classList.add("liquid-glass", group.mode);
      element.style.setProperty("--mx", "50%");
      element.style.setProperty("--my", "18%");
      element.style.setProperty("--lg-light-angle", "315deg");

      if (!finePointer) return;

      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        const angle = Math.atan2(y - 50, x - 50) * (180 / Math.PI) + 90;

        element.style.setProperty("--mx", `${x.toFixed(1)}%`);
        element.style.setProperty("--my", `${y.toFixed(1)}%`);
        element.style.setProperty("--lg-light-angle", `${angle.toFixed(1)}deg`);
      });

      element.addEventListener("pointerleave", () => {
        element.style.setProperty("--mx", "50%");
        element.style.setProperty("--my", "18%");
        element.style.setProperty("--lg-light-angle", "315deg");
      });
    });
  }
}

function clampGlassTransparency(value) {
  return Math.max(35, Math.min(82, Number(value) || DEFAULT_GLASS_TRANSPARENCY));
}

function applyGlassTransparency(value, { persist = false } = {}) {
  const transparency = clampGlassTransparency(value);
  const opacity = 1 - transparency / 100;

  const panelAlpha = 0.20 + opacity * 0.46;
  const darkAlpha = 0.045 + opacity * 0.30;
  const tintAlpha = 0.025 + opacity * 0.16;

  const root = document.documentElement;
  root.style.setProperty("--panel-alpha", panelAlpha.toFixed(3));
  root.style.setProperty("--glass-dark-alpha", darkAlpha.toFixed(3));
  root.style.setProperty("--glass-tint-alpha", tintAlpha.toFixed(3));

  const slider = document.getElementById("glass-transparency");
  const toggleValue = document.getElementById("glass-tuner-value");
  const panelValue = document.getElementById("glass-tuner-panel-value");

  if (slider) slider.value = String(transparency);
  if (toggleValue) toggleValue.textContent = `${transparency}%`;
  if (panelValue) panelValue.textContent = `${transparency}%`;

  if (persist) {
    try {
      localStorage.setItem(GLASS_TRANSPARENCY_KEY, String(transparency));
    } catch {
      // The visual control still works when storage is unavailable.
    }
  }
}

function setupGlassTuner() {
  const tuner = document.getElementById("glass-control");
  const toggle = document.getElementById("glass-tuner-toggle");
  const panel = document.getElementById("glass-tuner-panel");
  const slider = document.getElementById("glass-transparency");
  const reset = document.getElementById("glass-tuner-reset");

  if (!tuner || !toggle || !panel || !slider || !reset) return;

  let initial = DEFAULT_GLASS_TRANSPARENCY;
  try {
    const saved = Number(localStorage.getItem(GLASS_TRANSPARENCY_KEY));
    if (Number.isFinite(saved)) initial = clampGlassTransparency(saved);
  } catch {
    // Use the default.
  }

  applyGlassTransparency(initial);

  toggle.addEventListener("click", () => {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    toggle.setAttribute("aria-expanded", String(!isOpen));
    toggle.classList.toggle("is-open", !isOpen);
  });

  slider.addEventListener("input", () => {
    applyGlassTransparency(slider.value, { persist: true });
  });

  reset.addEventListener("click", () => {
    applyGlassTransparency(DEFAULT_GLASS_TRANSPARENCY, { persist: true });
  });

  document.addEventListener("pointerdown", (event) => {
    if (panel.hidden || tuner.contains(event.target)) return;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("is-open");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || panel.hidden) return;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  });
}


function applyThemeMode(theme, { persist = false } = {}) {
  const nextTheme = theme === "light" ? "light" : "dark";
  const root = document.documentElement;
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;

  const toggle = document.getElementById("theme-toggle");
  const label = document.getElementById("theme-toggle-label");
  const isDark = nextTheme === "dark";

  if (toggle) toggle.setAttribute("aria-label", isDark ? "切换浅色主题" : "切换深色主题");
  if (label) label.textContent = isDark ? "浅色主题" : "深色主题";

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // Theme still applies for the current page.
    }
  }
}

function setupThemeToggle() {
  let theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  applyThemeMode(theme);

  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyThemeMode(theme, { persist: true });
  });
}

function applyTheme() {
  document.title = APP_CONFIG.title;
  document.documentElement.lang = APP_CONFIG.language;
  document.getElementById("page-title").textContent = APP_CONFIG.title;
  document.getElementById("brand-logo").src = APP_CONFIG.logo;

  const bg = document.querySelector(".background");
  bg.style.backgroundImage = `url("${APP_CONFIG.background.image}")`;
  bg.style.opacity = String(APP_CONFIG.background.opacity / 100);
}

function init() {
  applyTheme();
  renderPrimaryLayout();
  renderStatusCards();
  renderGroups();
  setupSearch();
  setupRefractionMaps();
  setupThemeToggle();
  setupGlassTuner();
  setupLiquidGlass();
  startClock();
  updateWeather();
  refreshStatus();

  document.getElementById("refresh-status").addEventListener("click", () => {
    refreshStatus({ force: true });
  });
}

init();

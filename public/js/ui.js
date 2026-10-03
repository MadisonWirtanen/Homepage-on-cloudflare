import { GROUPS, STATUS_CARDS } from "../config.js";

function safeText(value, fallback = "--") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function providerTone(provider) {
  if (!provider?.configured) return "idle";
  if (provider.status === "degraded") return "warn";
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

export { renderPrimaryLayout, renderStatusCards, renderGroups, applyStatus };

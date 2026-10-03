import { APP_CONFIG } from "../config.js";

const THEME_KEY = "homepage-theme-v2";

function applyThemeMode(theme, { persist = false } = {}) {
  const nextTheme = theme === "light" ? "light" : "dark";
  const root = document.documentElement;
  root.dataset.theme = nextTheme;
  root.style.colorScheme = nextTheme;

  const background = APP_CONFIG.background[nextTheme] || APP_CONFIG.background.dark;
  if (background) {
    root.style.setProperty("--background-saturate", `${background.saturate}%`);
    root.style.setProperty("--background-brightness", `${background.brightness}%`);
  }

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
  if (APP_CONFIG.language) document.documentElement.lang = APP_CONFIG.language;
  document.getElementById("page-title").textContent = APP_CONFIG.title;
  document.getElementById("brand-logo").src = APP_CONFIG.logo;

  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon && APP_CONFIG.favicon) favicon.href = APP_CONFIG.favicon;

  const bg = document.querySelector(".background");
  bg.style.backgroundImage = `url("${APP_CONFIG.background.image}")`;
  bg.style.opacity = String(APP_CONFIG.background.opacity / 100);
}

export { applyTheme, setupThemeToggle };

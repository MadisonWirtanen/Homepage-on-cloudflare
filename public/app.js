import { renderPrimaryLayout, renderStatusCards, renderGroups } from "./js/ui.js";
import { refreshStatus } from "./js/status.js";
import { updateWeather } from "./js/weather.js";
import { startClock } from "./js/clock.js";
import { setupSearch } from "./js/search.js";
import { setupLiquidGlass, setupGlassTuner } from "./js/liquid-glass.js";
import { applyTheme, setupThemeToggle } from "./js/theme.js";

function init() {
  applyTheme();
  renderPrimaryLayout();
  renderStatusCards();
  renderGroups();
  setupSearch();
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

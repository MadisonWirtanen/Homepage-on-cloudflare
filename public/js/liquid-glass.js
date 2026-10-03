const GLASS_TRANSPARENCY_KEY = "homepage-glass-transparency-v2";
const DEFAULT_GLASS_TRANSPARENCY = 72;

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
  return Math.max(35, Math.min(100, Number(value) || DEFAULT_GLASS_TRANSPARENCY));
}

function applyGlassTransparency(value, { persist = false } = {}) {
  const transparency = clampGlassTransparency(value);
  const opacity = 1 - transparency / 100;

  const panelAlpha = 0.06 + opacity * 0.68;
  const darkAlpha = 0.018 + opacity * 0.35;
  const tintAlpha = 0.015 + opacity * 0.16;

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

export { setupLiquidGlass, setupGlassTuner };

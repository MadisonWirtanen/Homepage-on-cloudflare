import { APP_CONFIG } from "../config.js";

function setupSearch() {
  const providersRoot = document.getElementById("search-providers");
  const selection = document.getElementById("search-selection");
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const providers = APP_CONFIG.searchProviders;

  let selectedIndex = 0;
  let dragging = false;
  let pointerId = null;
  let dragOffset = 0;
  let moved = false;
  let startClientX = 0;

  function buttons() {
    return [...providersRoot.querySelectorAll(".search-provider")];
  }

  function setActive(index) {
    selectedIndex = Math.max(0, Math.min(providers.length - 1, index));
    buttons().forEach((button, i) => {
      const active = i === selectedIndex;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function thumbGeometry(index) {
    const items = buttons();
    const button = items[index];
    if (!button) return null;
    return {
      x: button.offsetLeft,
      width: button.offsetWidth,
    };
  }

  function moveThumb(x, width, { immediate = false } = {}) {
    if (!selection) return;
    selection.classList.toggle("no-transition", immediate);
    selection.style.width = `${width}px`;
    selection.style.transform = `translate3d(${x}px, 0, 0)`;
    if (immediate) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => selection.classList.remove("no-transition"));
      });
    }
  }

  function settle(index, { immediate = false, fromDirection = 0 } = {}) {
    const geometry = thumbGeometry(index);
    if (!geometry) return;

    setActive(index);

    if (!immediate) {
      providersRoot.classList.add("is-flowing");
      selection?.style.setProperty("--flow-direction", String(fromDirection || 1));
      window.setTimeout(() => providersRoot.classList.remove("is-flowing"), 430);
    }

    moveThumb(geometry.x, geometry.width, { immediate });
  }

  function nearestIndex(centerX) {
    const items = buttons();
    let nearest = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    items.forEach((button, index) => {
      const center = button.offsetLeft + button.offsetWidth / 2;
      const distance = Math.abs(centerX - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = index;
      }
    });

    return nearest;
  }

  function beginDrag(event, index) {
    const geometry = thumbGeometry(index);
    if (!geometry || !selection) return;

    dragging = true;
    pointerId = event.pointerId;
    startClientX = event.clientX;
    moved = false;

    const rootRect = providersRoot.getBoundingClientRect();
    const pointerX = event.clientX - rootRect.left;
    dragOffset = Math.max(0, Math.min(geometry.width, pointerX - geometry.x));

    providersRoot.classList.add("dragging");
    providersRoot.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function drag(event) {
    if (!dragging || event.pointerId !== pointerId || !selection) return;

    if (Math.abs(event.clientX - startClientX) > 3) moved = true;

    const items = buttons();
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    const rootRect = providersRoot.getBoundingClientRect();
    const width = first.offsetWidth;

    const minX = first.offsetLeft;
    const maxX = last.offsetLeft;
    const rawX = event.clientX - rootRect.left - dragOffset;
    const x = Math.max(minX, Math.min(maxX, rawX));

    moveThumb(x, width, { immediate: true });

    const preview = nearestIndex(x + width / 2);
    if (preview !== selectedIndex) setActive(preview);

    const progress = maxX > minX ? (x - minX) / (maxX - minX) : 0;
    selection.style.setProperty("--drag-progress", progress.toFixed(3));
  }

  function endDrag(event) {
    if (!dragging || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;

    dragging = false;
    providersRoot.classList.remove("dragging");

    const geometry = thumbGeometry(selectedIndex);
    const currentX = Number.parseFloat(
      selection?.style.transform.match(/translate3d\(([-\d.]+)px/)?.[1] || geometry?.x || 0
    );
    const direction = geometry ? Math.sign(geometry.x - currentX) : 0;

    requestAnimationFrame(() => settle(selectedIndex, { fromDirection: direction }));

    try {
      providersRoot.releasePointerCapture?.(pointerId);
    } catch {
      // Pointer capture may already be released.
    }

    pointerId = null;
  }

  providers.forEach((provider, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-provider";
    button.dataset.providerId = provider.id;
    button.textContent = provider.label;
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("pointerdown", (event) => {
      if (index === selectedIndex) beginDrag(event, index);
    });

    button.addEventListener("click", () => {
      if (moved) {
        moved = false;
        return;
      }
      const direction = Math.sign(index - selectedIndex);
      settle(index, { fromDirection: direction });
      input.focus();
    });

    providersRoot.appendChild(button);
  });

  providersRoot.addEventListener("pointermove", drag);
  providersRoot.addEventListener("pointerup", endDrag);
  providersRoot.addEventListener("pointercancel", endDrag);

  requestAnimationFrame(() => settle(0, { immediate: true }));

  window.addEventListener("resize", () => {
    settle(selectedIndex, { immediate: true });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }

    const provider = providers[selectedIndex] || providers[0];
    window.open(
      `${provider.url}${encodeURIComponent(query)}`,
      "_blank",
      "noopener,noreferrer"
    );
  });
}

export { setupSearch };

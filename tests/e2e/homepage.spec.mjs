import { test, expect } from "@playwright/test";

const statusPayload = {
  checkedAt: "2026-10-03T00:00:00.000Z",
  providers: {
    cloudflareLinux: {
      configured: true,
      ok: true,
      status: "healthy",
      name: "Linux",
      connections: 4,
    },
    cloudflareColoCrossing: {
      configured: true,
      ok: true,
      status: "healthy",
      name: "ColoCrossing",
      connections: 4,
    },
    uptimeRobot: {
      configured: true,
      ok: true,
      status: "up",
      up: 7,
      down: 0,
      paused: 0,
      unknown: 0,
      total: 7,
    },
  },
};

async function mockExternalData(page) {
  await page.route("**/api/status*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(statusPayload),
    });
  });

  await page.route("https://api.open-meteo.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        current: {
          temperature_2m: 23.4,
          apparent_temperature: 24.1,
          weather_code: 1,
        },
      }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockExternalData(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("知无涯者");
});

test("search thumb is visible, aligned and clickable", async ({ page }) => {
  const thumb = page.locator("#search-selection");
  const baidu = page.getByRole("button", { name: "百度", exact: true });
  const bing = page.getByRole("button", { name: "Bing", exact: true });

  await expect(thumb).toBeVisible();
  await expect(baidu).toHaveAttribute("aria-pressed", "true");

  const firstThumb = await thumb.boundingBox();
  const firstButton = await baidu.boundingBox();
  expect(firstThumb).not.toBeNull();
  expect(firstButton).not.toBeNull();
  expect(firstThumb.width).toBeGreaterThan(40);
  expect(Math.abs(firstThumb.x - firstButton.x)).toBeLessThan(4);

  await bing.click();
  await expect(bing).toHaveAttribute("aria-pressed", "true");

  await expect.poll(async () => {
    const nextThumb = await thumb.boundingBox();
    const nextButton = await bing.boundingBox();
    if (!nextThumb || !nextButton) return Number.POSITIVE_INFINITY;
    return Math.abs(nextThumb.x - nextButton.x);
  }, { timeout: 5_000 }).toBeLessThan(4);

  const nextThumb = await thumb.boundingBox();
  const nextButton = await bing.boundingBox();
  expect(nextThumb).not.toBeNull();
  expect(nextButton).not.toBeNull();
  expect(Math.abs(nextThumb.width - nextButton.width)).toBeLessThan(4);
});

test("search provider controls match the search action button size", async ({ page }) => {
  const providers = page.locator(".search-provider");
  const submit = page.locator(".search-submit");
  const thumb = page.locator("#search-selection");

  await expect(providers).toHaveCount(3);
  await expect(submit).toBeVisible();
  await expect(thumb).toBeVisible();

  const submitBox = await submit.boundingBox();
  expect(submitBox).not.toBeNull();

  for (let index = 0; index < 3; index += 1) {
    const box = await providers.nth(index).boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box.width - submitBox.width)).toBeLessThan(1);
    expect(Math.abs(box.height - submitBox.height)).toBeLessThan(1);
  }

  const thumbBox = await thumb.boundingBox();
  expect(thumbBox).not.toBeNull();
  expect(Math.abs(thumbBox.width - submitBox.width)).toBeLessThan(1);
  expect(Math.abs(thumbBox.height - submitBox.height)).toBeLessThan(1);
});

test("search thumb can be dragged and snaps to Google", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Mouse drag is covered by desktop; mobile still covers tap behavior.");

  const baidu = page.getByRole("button", { name: "百度", exact: true });
  const google = page.getByRole("button", { name: "Google", exact: true });
  const a = await baidu.boundingBox();
  const g = await google.boundingBox();
  expect(a).not.toBeNull();
  expect(g).not.toBeNull();

  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2, { steps: 10 });
  await page.mouse.up();

  await expect(google).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(450);

  const thumb = await page.locator("#search-selection").boundingBox();
  const target = await google.boundingBox();
  expect(Math.abs(thumb.x - target.x)).toBeLessThan(4);
});

test("theme defaults to dark and persists light mode", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const stored = await page.evaluate(() => localStorage.getItem("homepage-theme-v2"));
  expect(stored).toBe("light");

  const brightness = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--background-brightness")
  );
  expect(brightness.trim()).toBe("112%");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("liquid glass defaults to 72%, supports 100%, and persists", async ({ page }) => {
  await page.locator("#glass-tuner-toggle").click();
  const slider = page.locator("#glass-transparency");
  await expect(slider).toHaveValue("72");
  await expect(slider).toHaveAttribute("max", "100");

  await slider.evaluate((element) => {
    element.value = "90";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await expect(page.locator("#glass-tuner-value")).toHaveText("90%");
  const stored = await page.evaluate(() =>
    localStorage.getItem("homepage-glass-transparency-v2")
  );
  expect(stored).toBe("90");
});

test("status cards are compact and expand on demand", async ({ page }) => {
  const card = page.locator('[data-provider-id="cloudflareLinux"]');
  const toggle = card.locator(".status-summary");

  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(card.locator(".status-dot")).toHaveClass(/good/);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(card.locator(".status-metrics")).toContainText("Healthy");
  await expect(card.locator(".status-metrics")).toContainText("4");
});

test("expanded desktop status cards share a uniform height", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "The equal-height treatment applies to side-by-side desktop cards.");

  const cards = page.locator(".status-card");
  const summaries = page.locator(".status-summary");
  await expect(cards).toHaveCount(3);

  for (let index = 0; index < 3; index += 1) {
    const summary = summaries.nth(index);
    if (await summary.getAttribute("aria-expanded") === "false") {
      await summary.click();
    }
  }

  await expect.poll(async () => {
    const heights = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height)
    );
    return Math.max(...heights) - Math.min(...heights);
  }).toBeLessThan(2);
});

test("top widgets stay equal width and centered", async ({ page }) => {
  const widgets = page.locator(".top-widgets .widget-block");
  await expect(widgets).toHaveCount(3);

  const metrics = await widgets.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { width: rect.width, textAlign: style.textAlign };
    })
  );

  const widths = metrics.map((item) => item.width);
  expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(2);
  for (const item of metrics) expect(item.textAlign).toBe("center");
});

test("mobile brand is centered and loads the self-hosted title font", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only layout assertion.");

  const result = await page.locator(".brand").evaluate((brand) => {
    const title = brand.querySelector("h1");
    const logo = brand.querySelector(".brand-logo");
    const brandRect = brand.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const logoRect = logo.getBoundingClientRect();
    const titleStyle = getComputedStyle(title);
    const brandStyle = getComputedStyle(brand);

    const groupLeft = Math.min(logoRect.left, titleRect.left);
    const groupRight = Math.max(logoRect.right, titleRect.right);
    const groupCenter = (groupLeft + groupRight) / 2;

    return {
      viewportCenter: window.innerWidth / 2,
      groupCenter,
      brandWidth: brandRect.width,
      justifyContent: brandStyle.justifyContent,
      textAlign: titleStyle.textAlign,
      fontFamily: titleStyle.fontFamily,
    };
  });

  expect(Math.abs(result.groupCenter - result.viewportCenter)).toBeLessThan(3);
  expect(result.brandWidth).toBeGreaterThan(250);
  expect(result.justifyContent).toBe("center");
  expect(result.textAlign).toBe("center");
  expect(result.fontFamily).toContain("Homepage Title Serif");

  const customFontLoaded = await page.evaluate(async () => {
    await document.fonts.load('700 32px "Homepage Title Serif"', "知无涯者");
    return document.fonts.check('700 32px "Homepage Title Serif"', "知无涯者");
  });
  expect(customFontLoaded).toBeTruthy();
});

test("layout does not create horizontal overflow", async ({ page }) => {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});

test("unknown routes return the static 404 page", async ({ request }) => {
  const response = await request.get("/definitely-not-a-real-page");
  expect(response.status()).toBe(404);
  expect(await response.text()).toContain("页面不存在");
});


test("self-hosted title font asset is tiny and available", async ({ request }) => {
  const response = await request.get("/fonts/homepage-title-serif.woff2");
  expect(response.status()).toBe(200);
  const body = await response.body();
  expect(body.length).toBeGreaterThan(1000);
  expect(body.length).toBeLessThan(10000);
});

test("document language stays zh-CN after JavaScript initialization", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
});

test("generated build manifest identifies the current Git commit", async ({ request }) => {
  const response = await request.get("/build.json");
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.commit).toMatch(/^[0-9a-f]{40}$/);
});

test("degraded provider uses warning tone instead of failure tone", async ({ page }) => {
  await page.unroute("**/api/status*");
  const degraded = JSON.parse(JSON.stringify(statusPayload));
  degraded.providers.uptimeRobot = {
    ...degraded.providers.uptimeRobot,
    status: "degraded",
    up: 6,
    down: 1,
  };

  await page.route("**/api/status*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(degraded),
    });
  });
  await page.evaluate(() => localStorage.removeItem("homepage-cf-status-v3"));
  await page.reload({ waitUntil: "domcontentloaded" });

  const dot = page.locator('[data-provider-id="uptimeRobot"] .status-dot');
  await expect(dot).toHaveClass(/warn/);
  await expect(dot).not.toHaveClass(/bad/);
  await expect(dot).toHaveAttribute("aria-label", "部分异常");
});

test("search action button keeps the same Prussian glass treatment as the selector", async ({ page }) => {
  const styles = await page.evaluate(() => {
    const thumb = getComputedStyle(document.querySelector("#search-selection"));
    const submit = getComputedStyle(document.querySelector(".search-submit"));
    return {
      thumbBackground: thumb.backgroundImage,
      submitBackground: submit.backgroundImage,
      thumbBorder: thumb.borderColor,
      submitBorder: submit.borderColor,
    };
  });

  expect(styles.submitBackground).toBe(styles.thumbBackground);
  expect(styles.submitBorder).toBe(styles.thumbBorder);
});

test("desktop primary grids follow configured 5/3/3 columns", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop-only column assertion.");

  const result = await page.evaluate(() => {
    const read = (selector) => {
      const grid = document.querySelector(selector);
      return {
        columnsVar: grid.style.getPropertyValue("--columns").trim(),
        template: getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
      };
    };
    return {
      public: read(".public-section .primary-grid"),
      status: read(".status-section .primary-grid"),
      contact: read(".contact-section .primary-grid"),
    };
  });

  expect(result.public).toEqual({ columnsVar: "5", template: 5 });
  expect(result.status).toEqual({ columnsVar: "3", template: 3 });
  expect(result.contact).toEqual({ columnsVar: "3", template: 3 });
});

test("mobile navigation cards use lightweight glass while status keeps full glass", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only performance assertion.");

  const result = await page.evaluate(() => {
    const nav = document.querySelector(".public-section .card");
    const status = document.querySelector(".status-card");
    const navStyle = getComputedStyle(nav, "::before");
    const statusStyle = getComputedStyle(status, "::before");
    return {
      navBackdrop: navStyle.getPropertyValue("backdrop-filter") || navStyle.getPropertyValue("-webkit-backdrop-filter"),
      statusBackdrop: statusStyle.getPropertyValue("backdrop-filter") || statusStyle.getPropertyValue("-webkit-backdrop-filter"),
    };
  });

  expect(result.navBackdrop.trim()).toBe("none");
  expect(result.statusBackdrop.trim()).not.toBe("none");
});

test("stale status remains visible when refresh fails", async ({ page }) => {
  await page.unroute("**/api/status*");
  await page.route("**/api/status*", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });

  await page.evaluate((payload) => {
    localStorage.setItem("homepage-cf-status-v3", JSON.stringify({
      savedAt: Date.now() - 30 * 60_000,
      value: payload,
    }));
  }, statusPayload);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-provider-id="cloudflareLinux"] .status-dot')).toHaveClass(/good/);
  await expect(page.locator("#status-updated")).toContainText("刷新失败，保留缓存");
});

test("stale weather remains visible when Open-Meteo is unavailable", async ({ page }) => {
  await page.unroute("https://api.open-meteo.com/**");
  await page.route("https://api.open-meteo.com/**", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
  });

  await page.evaluate(() => {
    localStorage.setItem("homepage-cf-weather-v1", JSON.stringify({
      savedAt: Date.now() - 30 * 60_000,
      value: {
        current: {
          temperature_2m: 23.4,
          apparent_temperature: 24.1,
          weather_code: 1,
        },
      },
    }));
  });
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.locator("#weather-value")).toContainText("23°C");
  await expect(page.locator("#weather-extra")).toContainText("缓存");
});

test("self-hosted brand image is available and used by logo and favicon", async ({ page, request }) => {
  const response = await request.get("/branding/logo.webp");
  expect(response.status()).toBe(200);
  expect((await response.body()).length).toBeGreaterThan(1500);
  await expect(page.locator("#brand-logo")).toHaveAttribute("src", "/branding/logo.webp");
  const favicon = await request.get("/branding/favicon.png");
  expect(favicon.status()).toBe(200);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/branding/favicon.png");
});

test("brand logo source is present in first-paint HTML before modules run", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('id="brand-logo" class="brand-logo" src="/branding/logo.webp"');
  expect(html).toContain('rel="preload" as="image" href="/branding/logo.webp"');
});



async function stabilizeVisualFixture(page) {
  await page.addStyleTag({
    content: `
      .background {
        background-image:
          radial-gradient(circle at 18% 12%, rgba(71, 87, 77, .42), transparent 34%),
          linear-gradient(135deg, #111715 0%, #222a27 52%, #0b1010 100%) !important;
        filter: none !important;
        transform: none !important;
      }

      body::before {
        background:
          linear-gradient(180deg, rgba(3, 7, 12, .22), rgba(3, 7, 12, .58)) !important;
      }

      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    const background = document.querySelector(".background");
    background?.removeAttribute("style");

    const updated = document.getElementById("status-updated");
    if (updated) updated.textContent = "检查于 08:00:00";
  });

  await page.evaluate(() => document.fonts.ready);
}

test("stable visual baselines cover the four critical glass components", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Keep visual baselines small and deterministic.");
  test.skip(process.platform !== "linux", "Golden images are normalized on the Linux CI renderer.");

  await stabilizeVisualFixture(page);

  await expect(page.locator("#brand-logo")).toBeVisible();
  await expect(page.locator(".brand")).toHaveScreenshot("brand-header.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.015,
  });

  await expect(page.locator(".search-shell")).toHaveScreenshot("search-shell.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.015,
  });

  const linuxDot = page.locator('[data-provider-id="cloudflareLinux"] .status-dot');
  await expect(linuxDot).toHaveClass(/good/);

  const summaries = page.locator(".status-summary");
  for (let index = 0; index < await summaries.count(); index += 1) {
    const summary = summaries.nth(index);
    if (await summary.getAttribute("aria-expanded") === "false") {
      await summary.click();
    }
  }

  await expect(page.locator('[data-provider-id="cloudflareLinux"] .status-summary'))
    .toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".status-section")).toHaveScreenshot("status-expanded.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.015,
  });

  const glassToggle = page.locator("#glass-tuner-toggle");
  await glassToggle.hover();
  await expect.poll(async () => (await glassToggle.boundingBox())?.width ?? 0).toBeGreaterThan(120);

  await expect(page.locator("#side-controls")).toHaveScreenshot("side-controls.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.015,
  });
});

import test from "node:test";
import assert from "node:assert/strict";

import { isCrossSiteRequest, resolveWeatherLocation, summarizeUptimeRobot } from "../src/lib.js";

test("summarizeUptimeRobot counts monitor states", () => {
  const result = summarizeUptimeRobot({
    monitors: [
      { status: 2 },
      { status: 2 },
      { status: 9 },
      { status: 8 },
      { status: 0 },
      { status: 1 },
    ],
  });
  assert.deepEqual(result, { up: 2, down: 2, paused: 1, unknown: 1, total: 6 });
});

test("isCrossSiteRequest blocks foreign Origin and Sec-Fetch-Site", () => {
  const same = new Request("https://home.example.com/api/status", {
    headers: { Origin: "https://home.example.com", "Sec-Fetch-Site": "same-origin" },
  });
  const foreign = new Request("https://home.example.com/api/status", {
    headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" },
  });
  assert.equal(isCrossSiteRequest(same), false);
  assert.equal(isCrossSiteRequest(foreign), true);
});


test("resolveWeatherLocation uses Cloudflare IP metadata when coordinates are valid", () => {
  const location = resolveWeatherLocation({
    city: "Los Angeles",
    region: "California",
    country: "US",
    latitude: "34.0522",
    longitude: "-118.2437",
    timezone: "America/Los_Angeles",
  });

  assert.equal(location.label, "Los Angeles");
  assert.equal(location.source, "ip");
  assert.equal(location.latitude, 34.0522);
  assert.equal(location.longitude, -118.2437);
  assert.equal(location.timezone, "America/Los_Angeles");
});

test("resolveWeatherLocation falls back to Hangzhou without usable IP coordinates", () => {
  const location = resolveWeatherLocation({
    city: "Unknown",
    latitude: "",
    longitude: "",
  });

  assert.equal(location.label, "杭州");
  assert.equal(location.source, "fallback");
  assert.equal(location.latitude, 30.2936);
  assert.equal(location.longitude, 120.1614);
  assert.equal(location.timezone, "Asia/Shanghai");
});

test("resolveWeatherLocation keeps Hangzhou label localized", () => {
  const location = resolveWeatherLocation({
    city: "Hangzhou",
    region: "Zhejiang",
    country: "CN",
    latitude: "30.2741",
    longitude: "120.1551",
    timezone: "Asia/Shanghai",
  });

  assert.equal(location.label, "杭州");
  assert.equal(location.source, "ip");
});

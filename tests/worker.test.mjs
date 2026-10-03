import test from "node:test";
import assert from "node:assert/strict";

import { isCrossSiteRequest, summarizeUptimeRobot } from "../src/lib.js";

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

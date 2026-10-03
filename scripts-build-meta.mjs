import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

function resolveCommit() {
  const candidates = [
    process.env.WORKERS_CI_COMMIT_SHA,
    process.env.GITHUB_SHA,
    process.env.CF_PAGES_COMMIT_SHA,
    process.env.CF_COMMIT_SHA,
  ];

  for (const value of candidates) {
    if (/^[0-9a-f]{40}$/i.test(value || "")) return value.toLowerCase();
  }

  const value = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (!/^[0-9a-f]{40}$/i.test(value)) {
    throw new Error("Unable to resolve a 40-character Git commit SHA.");
  }
  return value.toLowerCase();
}

const commit = resolveCommit();
const output = new URL("./public/build.json", import.meta.url);
await writeFile(output, JSON.stringify({ commit }, null, 2) + "\n", "utf8");
console.log(`Generated public/build.json for ${commit}`);

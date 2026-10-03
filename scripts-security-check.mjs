import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = new URL("./", import.meta.url).pathname;
const ignored = new Set(["node_modules", ".git", ".wrangler"]);
const allowedPlaceholderFile = ".dev.vars.example";
const suspicious = [
  { name: "UptimeRobot API key", pattern: /ur\d+-[A-Za-z0-9_-]{12,}/g },
  { name: "PEM private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir)) {
    if (ignored.has(entry)) continue;
    const full = join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) await walk(full);
    else files.push(full);
  }
}

await walk(root);
let failed = false;
for (const file of files) {
  const rel = relative(root, file);
  if (rel === allowedPlaceholderFile) continue;
  let content;
  try { content = await readFile(file, "utf8"); }
  catch { continue; }
  for (const rule of suspicious) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(content)) {
      console.error(`Potential secret detected: ${rule.name} in ${rel}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log("Security scan passed: no obvious credential patterns found.");

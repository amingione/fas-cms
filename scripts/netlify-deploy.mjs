#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const argv = process.argv.slice(2);
const envFile = process.env.NETLIFY_ENV_FILE || ".env";

if (argv.includes("-h") || argv.includes("--help")) {
  console.log(`Sync Netlify env vars, then deploy.\n\nUsage:\n  node ./scripts/netlify-deploy.mjs [netlify deploy args]\n\nOptions:\n  --dry-run         Print commands without executing\n  --skip-env-check  Skip unused-env TypeScript check\n  -h, --help        Show help`);
  process.exit(0);
}

const dryRun = argv.includes("--dry-run");
const skipEnvCheck = argv.includes("--skip-env-check");
const deployArgs = argv.filter((a) => a !== "--dry-run" && a !== "--skip-env-check");

function runOrExit(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: repoRoot });
  if (result.status !== 0) process.exit(result.status || 1);
}

// check-env-production-encrypted.mjs removed — dotenvx removed 2026-04-22

if (!skipEnvCheck) {
  const checkArgs = ["./scripts/check-env-unused.mjs", "--file", envFile];
  if (dryRun) console.log(["node", ...checkArgs].join(" "));
  else runOrExit("node", checkArgs);
}

const syncArgs = ["./scripts/sync-env-to-netlify.js", `--file=${envFile}`, "--remove"];
if (dryRun) syncArgs.push("--dry-run");
if (dryRun) console.log(["node", ...syncArgs].join(" "));
else runOrExit("node", syncArgs);

const netlifyArgs = ["-y", "netlify-cli", "deploy", ...deployArgs];
if (dryRun) console.log(["npx", ...netlifyArgs].join(" "));
else runOrExit("npx", netlifyArgs);

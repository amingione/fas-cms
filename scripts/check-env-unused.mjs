#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "dotenv";

function parseArgs(argv) {
  const options = {
    file: process.env.DOTENVX_ENV_FILE || ".env.production",
    allow: new Set(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--file") {
      options.file = argv[++i] || options.file;
    } else if (arg === "--allow") {
      const value = argv[++i] || "";
      value.split(",").map((k) => k.trim()).filter(Boolean).forEach((k) => options.allow.add(k));
    } else if (arg === "-h" || arg === "--help") {
      console.log(`Check env file keys are referenced in repo code.\n\nUsage:\n  node ./scripts/check-env-unused.mjs [options]\n\nOptions:\n  --file <path>      Env file to check (default: .env.production)\n  --allow <A,B,C>    Comma-separated keys to ignore\n  -h, --help         Show help`);
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

function parseReferencedKeys(repoRoot) {
  const rgArgs = [
    "-n",
    "--no-heading",
    "--glob",
    "!node_modules",
    "--glob",
    "!.git",
    "--glob",
    "!.next",
    "--glob",
    "!dist",
    "--glob",
    "!build",
    "--glob",
    "!coverage",
    "-e",
    "process\\.env\\.[A-Z0-9_]+",
    "-e",
    "import\\.meta\\.env\\.[A-Z0-9_]+",
    "-e",
    "readEnv\\(\\s*['\"][A-Z0-9_]+",
    "-e",
    "getEnv\\(\\s*['\"][A-Z0-9_]+",
    ".",
  ];

  const result = spawnSync("rg", rgArgs, { cwd: repoRoot, encoding: "utf8" });
  const output = result.stdout || "";
  const keys = new Set();

  for (const line of output.split("\n")) {
    if (!line) continue;
    for (const m of line.matchAll(/process\.env\.([A-Z0-9_]+)/g)) keys.add(m[1]);
    for (const m of line.matchAll(/import\.meta\.env\.([A-Z0-9_]+)/g)) keys.add(m[1]);
    for (const m of line.matchAll(/readEnv\(\s*['\"]([A-Z0-9_]+)/g)) keys.add(m[1]);
    for (const m of line.matchAll(/getEnv\(\s*['\"]([A-Z0-9_]+)/g)) keys.add(m[1]);
  }

  return keys;
}

function main() {
  const repoRoot = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  const envPath = path.resolve(repoRoot, options.file);

  if (!fs.existsSync(envPath)) {
    console.error(`Env file not found: ${envPath}`);
    process.exit(1);
  }

  const envRaw = fs.readFileSync(envPath, "utf8");
  const envMap = parse(envRaw);
  const envKeys = Object.keys(envMap).filter((k) => /^[A-Z_][A-Z0-9_]*$/.test(k));

  const referenced = parseReferencedKeys(repoRoot);
  const unused = envKeys.filter((k) => !referenced.has(k) && !options.allow.has(k)).sort();

  if (unused.length > 0) {
    console.error(`TS Error [env-unused]: ${unused.length} key(s) not needed in repo (${options.file}).`);
    for (const key of unused) {
      console.error(`- ${key}: not needed in repo`);
    }
    process.exit(1);
  }

  console.log(`Env check passed: ${options.file} has no unused keys.`);
}

main();

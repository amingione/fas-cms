import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

const SOURCE_EXTENSIONS = new Set(['.astro', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

// Governance rule:
// Category detail URLs must be emitted with a trailing slash when using
// trailingSlash='always' in Astro.
const MISSING_CATEGORY_TRAILING_SLASH_REGEX =
  /\/shop\/categories\/(?:\$\{[^}]+\}|[A-Za-z0-9-]+)(?!\/)(?=(["'`?#\s)\]}]|$))/g;

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(resolved)));
      continue;
    }
    if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(resolved);
    }
  }

  return files;
};

const findViolations = async () => {
  const files = await walk(SRC_DIR);
  const violations = [];

  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const lines = raw.split(/\r?\n/);

    lines.forEach((line, index) => {
      const matches = line.matchAll(MISSING_CATEGORY_TRAILING_SLASH_REGEX);
      for (const match of matches) {
        violations.push({
          file: path.relative(ROOT, file),
          line: index + 1,
          snippet: match[0]
        });
      }
    });
  }

  return violations;
};

const violations = await findViolations();

if (violations.length > 0) {
  console.error('Trailing-slash governance check failed for /shop/categories/* links.');
  console.error("Use '/shop/categories/<slug>/' (with trailing slash) in source files.");
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} -> ${violation.snippet}`);
  }
  process.exit(1);
}

console.log('Category trailing-slash governance check passed.');

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const NETLIFY_TOML_PATH = path.join(ROOT, 'netlify.toml');
const REDIRECTS_PATH = path.join(ROOT, 'public', '_redirects');
const REDIRECT_STATUSES = new Set(['301', '302', '307', '308']);

const violations = [];

const parseTomlRedirectBlocks = async () => {
  const raw = await readFile(NETLIFY_TOML_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);

  let current = null;

  const flush = () => {
    if (!current) return;
    if (
      typeof current.from === 'string' &&
      typeof current.to === 'string' &&
      current.from === current.to &&
      REDIRECT_STATUSES.has(String(current.status || ''))
    ) {
      violations.push({
        source: 'netlify.toml',
        line: current.startLine,
        detail: `from=${current.from} to=${current.to} status=${current.status}`
      });
    }
    current = null;
  };

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    const trimmed = line.trim();

    if (trimmed === '[[redirects]]') {
      flush();
      current = { startLine: lineNo, from: null, to: null, status: null };
      return;
    }

    if (!current) return;

    const keyValueMatch = trimmed.match(/^([a-zA-Z_]+)\s*=\s*(.+)$/);
    if (!keyValueMatch) return;

    const [, key, rawValue] = keyValueMatch;
    const value = rawValue.replace(/^"|"$/g, '');

    if (key === 'from') current.from = value;
    if (key === 'to') current.to = value;
    if (key === 'status') current.status = value;
  });

  flush();
};

const parseRedirectsFile = async () => {
  const raw = await readFile(REDIRECTS_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length < 3) return;

    const [from, to, statusRaw] = parts;
    const status = statusRaw.replace(/!$/, '');

    // Exact self-redirect (from === to)
    // Trailing-slash self-redirect: Netlify normalizes trailing slashes before
    // matching, so /shop/foo → /shop/foo/ loops identically to /shop/foo → /shop/foo.
    const isSelfRedirect = from === to || `${from}/` === to || from === `${to}/`;
    if (isSelfRedirect && REDIRECT_STATUSES.has(status)) {
      violations.push({
        source: 'public/_redirects',
        line: index + 1,
        detail: `from=${from} to=${to} status=${statusRaw}`
      });
    }
  });
};

await parseTomlRedirectBlocks();
await parseRedirectsFile();

if (violations.length > 0) {
  console.error('Netlify redirect governance failed: self-redirect loop(s) detected.');
  for (const violation of violations) {
    console.error(`- ${violation.source}:${violation.line} ${violation.detail}`);
  }
  process.exit(1);
}

console.log('Netlify self-redirect governance check passed.');

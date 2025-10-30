import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import fg from 'fast-glob';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import pLimit from 'p-limit';

export interface AuditLinksOptions {
  htmlGlobs?: string[];
  concurrency?: number;
}

export interface BrokenLink {
  file: string;
  url: string;
  status: number | 'ERR';
}

const DEFAULT_HTML_GLOBS = ['dist/**/*.html', 'public/**/*.html'];

const FALLBACK_SITE_URL = 'https://www.fasmotorsports.com';

const resolveSiteBaseUrl = () => {
  const candidate =
    process.env.PUBLIC_SITE_URL ||
    process.env.PUBLIC_BASE_URL ||
    process.env.SITE_URL ||
    FALLBACK_SITE_URL;
  try {
    const url = new URL(candidate);
    return url.origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
};

const SITE_BASE_URL = resolveSiteBaseUrl();

const normalizeAuditUrl = (href: string): string | null => {
  if (!href) return null;

  const trimmed = href.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;

  // Bail out on non-http schemes such as mailto:, tel:, data:, javascript:, etc.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;

  try {
    return new URL(trimmed, SITE_BASE_URL).toString();
  } catch {
    return null;
  }
};

export async function auditLinks(options: AuditLinksOptions = {}) {
  const root = process.cwd();
  const htmlGlobs = options.htmlGlobs ?? DEFAULT_HTML_GLOBS;
  const concurrency = options.concurrency ?? 8;
  const files = await fg(htmlGlobs, { cwd: root, absolute: true });
  const limit = pLimit(concurrency);
  const broken: BrokenLink[] = [];

  const shouldAudit = (url: string) => {
    if (!url) return false;
    if (url.startsWith('#')) return false;
    if (url.startsWith('mailto:') || url.startsWith('tel:')) return false;
    if (url.startsWith('javascript:')) return false;
    return true;
  };

  for (const file of files) {
    try {
      const html = await fs.readFile(file, 'utf8');
      const $ = cheerio.load(html);
      const links = $('a')
        .map((_, el) => el.attribs?.href ?? '')
        .get()
        .filter(shouldAudit);

      await Promise.all(
        links.map((url) =>
          limit(async () => {
            const target = normalizeAuditUrl(url);
            if (!target) return;
            try {
              const response = await fetch(target, { method: 'HEAD', redirect: 'follow' });
              if (!response.ok) {
                broken.push({
                  file: path.relative(root, file),
                  url: target,
                  status: response.status
                });
              }
            } catch {
              broken.push({
                file: path.relative(root, file),
                url: target,
                status: 'ERR'
              });
            }
          })
        )
      );
    } catch (error) {
      console.error('[auditLinks] Failed to process', file, error);
    }
  }

  if (broken.length) {
    console.table(broken);
  } else {
    console.info('[auditLinks] No broken links detected.');
  }

  return broken;
}

async function runFromCli() {
  await auditLinks();
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entrypoint === fileURLToPath(import.meta.url)) {
  runFromCli().catch((error) => {
    console.error('[auditLinks] Unhandled error', error);
    process.exitCode = 1;
  });
}

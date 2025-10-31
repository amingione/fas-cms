import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import fg from 'fast-glob';
import { load } from 'cheerio';
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
      const $ = load(html);
      const links = $('a')
        .map((_, el) => el.attribs?.href ?? '')
        .get()
        .filter(shouldAudit);

      await Promise.all(
        links.map((url) =>
          limit(async () => {
            try {
              const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
              if (!response.ok) {
                broken.push({
                  file: path.relative(root, file),
                  url,
                  status: response.status
                });
              }
            } catch {
              broken.push({
                file: path.relative(root, file),
                url,
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

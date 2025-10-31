import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import fg from 'fast-glob';
import { load } from 'cheerio';

export interface MetaCheckOptions {
  htmlGlobs?: string[];
}

export interface MetaCheckResult {
  file: string;
  missingMeta: string[];
  missingAlt: number;
}

const DEFAULT_HTML_GLOBS = ['dist/**/*.html', 'public/**/*.html'];
const REQUIRED_META = [
  { key: 'name', value: 'description' },
  { key: 'name', value: 'robots' },
  { key: 'property', value: 'og:title' },
  { key: 'property', value: 'og:description' },
  { key: 'name', value: 'twitter:card' }
];

export async function checkMeta(options: MetaCheckOptions = {}) {
  const root = process.cwd();
  const htmlGlobs = options.htmlGlobs ?? DEFAULT_HTML_GLOBS;
  const files = await fg(htmlGlobs, { cwd: root, absolute: true });

  const results: MetaCheckResult[] = [];

  for (const file of files) {
    try {
      const html = await fs.readFile(file, 'utf8');
      const $ = load(html);
      const missing: string[] = [];

      for (const requirement of REQUIRED_META) {
        const selector = `meta[${requirement.key}="${requirement.value}"]`;
        if ($(selector).length === 0) {
          missing.push(`${requirement.key}=${requirement.value}`);
        }
      }

      let missingAlt = 0;
      $('img').each((_, el) => {
        const alt = el.attribs?.alt ?? '';
        if (!alt || !alt.trim()) {
          missingAlt += 1;
        }
      });

      if (missing.length || missingAlt > 0) {
        results.push({
          file: path.relative(root, file),
          missingMeta: missing,
          missingAlt
        });
      }
    } catch (error) {
      console.error('[checkMeta] Failed to process', file, error);
    }
  }

  if (results.length === 0) {
    console.info('[checkMeta] All scanned documents contain required metadata and alt text.');
  } else {
    console.table(
      results.map((result) => ({
        file: result.file,
        missingMeta: result.missingMeta.join(', ') || '—',
        missingAlt: result.missingAlt
      }))
    );
  }

  return results;
}

async function runFromCli() {
  await checkMeta();
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entrypoint === fileURLToPath(import.meta.url)) {
  runFromCli().catch((error) => {
    console.error('[checkMeta] Unhandled error', error);
    process.exitCode = 1;
  });
}

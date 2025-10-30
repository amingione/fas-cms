import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import fg from 'fast-glob';
import sharp from 'sharp';
import cheerio from 'cheerio';

export interface OptimizeOptions {
  sourceGlobs?: string[];
  htmlGlobs?: string[];
  outputDir?: string;
  widths?: number[];
  quality?: number;
}

const DEFAULT_SOURCE_GLOBS = ['public/**/*.{jpg,jpeg,png}', 'src/assets/**/*.{jpg,jpeg,png}'];
const DEFAULT_HTML_GLOBS = ['dist/**/*.html', 'public/**/*.html'];

const DEFAULT_WIDTHS = [480, 768, 1024, 1440, 1920];

export async function optimizeImages(options: OptimizeOptions = {}) {
  const root = process.cwd();
  const sourceGlobs = options.sourceGlobs ?? DEFAULT_SOURCE_GLOBS;
  const htmlGlobs = options.htmlGlobs ?? DEFAULT_HTML_GLOBS;
  const outputDir = options.outputDir ?? path.join('public', 'optimized');
  const widths = options.widths ?? DEFAULT_WIDTHS;
  const quality = options.quality ?? 80;

  await fs.mkdir(outputDir, { recursive: true });

  const imageFiles = await fg(sourceGlobs, { cwd: root, absolute: true });
  const optimized: string[] = [];

  for (const file of imageFiles) {
    try {
      const relative = path.relative(root, file);
      const ext = path.extname(file).toLowerCase();
      const baseName = path.basename(file, ext);
      const dirName = path.join(outputDir, path.dirname(relative));
      await fs.mkdir(dirName, { recursive: true });

      const input = sharp(file);
      const metadata = await input.metadata();
      const originalBuffer = await input.toBuffer();
      const originalSize = originalBuffer.length;

      const targetWidths = widths.filter((width) =>
        metadata.width ? width <= metadata.width : true
      );

      await Promise.all(
        targetWidths.map(async (width) => {
          const outputPath = path.join(dirName, `${baseName}-${width}.webp`);
          const buffer = await sharp(file)
            .rotate()
            .resize(width, undefined, { withoutEnlargement: true })
            .webp({ quality })
            .toBuffer();

          if (buffer.length < originalSize) {
            await fs.writeFile(outputPath, buffer);
            optimized.push(path.relative(root, outputPath));
          }
        })
      );
    } catch (error) {
      console.error('[optimizeImages] Failed to optimize', file, error);
    }
  }

  const htmlFiles = await fg(htmlGlobs, { cwd: root, absolute: true });
  let lazyUpdated = 0;

  for (const file of htmlFiles) {
    try {
      const html = await fs.readFile(file, 'utf8');
      const $ = cheerio.load(html);
      let mutated = false;

      $('img').each((_, el) => {
        const attribs = el.attribs ?? {};
        if (!attribs.loading || attribs.loading === 'eager') {
          $(el).attr('loading', 'lazy');
          mutated = true;
        }
        if (!attribs.decoding) {
          $(el).attr('decoding', 'async');
          mutated = true;
        }
      });

      if (mutated) {
        await fs.writeFile(file, $.html());
        lazyUpdated += 1;
      }
    } catch (error) {
      console.error('[optimizeImages] Failed to update lazy-loading', file, error);
    }
  }

  console.info(
    `Optimized ${optimized.length} derivatives into ${outputDir} and updated ${lazyUpdated} HTML file(s).`
  );
  return { optimized, lazyUpdated };
}

async function runFromCli() {
  await optimizeImages();
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entrypoint === fileURLToPath(import.meta.url)) {
  runFromCli().catch((error) => {
    console.error('[optimizeImages] Unhandled error', error);
    process.exitCode = 1;
  });
}

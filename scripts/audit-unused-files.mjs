#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const PROD_SITEMAP_INDEX_URL = "https://fasmotorsports.com/sitemap_index.xml";
const PROD_BASE_URL = "https://fasmotorsports.com";
const REPO_ROOT = process.cwd();
const SOURCE_ROOT = path.join(REPO_ROOT, "src");
const DOCS_REPORT_DIR = path.join(REPO_ROOT, "docs", "reports");

const PAGE_EXTENSIONS = [".astro", ".tsx", ".ts", ".jsx", ".js"];
const SCAN_EXTENSIONS = [".astro", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs", ".json", ".md", ".mdx"];
const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
  ".bmp",
  ".tif",
  ".tiff",
]);

const INTERNAL_NON_INDEX_PREFIXES = [
  "/account",
  "/admin",
  "/appointments",
  "/customerdashboard",
  "/dashboard",
  "/order",
  "/orders",
  "/vendor",
  "/vendor-portal",
];

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function normalizeRoutePath(pathname) {
  if (!pathname) return "/";
  const withSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withSlash === "/") return "/";
  return withSlash.replace(/\/+$/, "");
}

function parseLocs(xmlText) {
  const locs = [];
  const regex = /<loc>([^<]+)<\/loc>/g;
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    locs.push(match[1].trim());
  }
  return locs;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.text();
}

async function fetchProductionDeployedPaths() {
  const indexXml = await fetchText(PROD_SITEMAP_INDEX_URL);
  const sitemapUrls = parseLocs(indexXml);
  const deployedPaths = new Set();

  for (const sitemapUrl of sitemapUrls) {
    const xml = await fetchText(sitemapUrl);
    const locs = parseLocs(xml);
    for (const loc of locs) {
      try {
        const pathname = new URL(loc).pathname;
        deployedPaths.add(normalizeRoutePath(pathname));
      } catch {
        continue;
      }
    }
  }

  return deployedPaths;
}

function walkFiles(rootDir, acceptedExtensions) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(absPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (acceptedExtensions === null || acceptedExtensions.includes(ext)) {
        results.push(absPath);
      }
    }
  }

  walk(rootDir);
  return results;
}

function lineNumberForFirstMatch(content, token, useRegex = false) {
  const lines = content.split(/\r?\n/);
  if (useRegex) {
    for (let i = 0; i < lines.length; i += 1) {
      if (token.test(lines[i])) return i + 1;
    }
    return null;
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes(token)) return i + 1;
  }
  return null;
}

function collectMatches(searchEntries, tokenChecks, excludeFileAbsPath, maxMatches = 3) {
  const matches = [];
  for (const entry of searchEntries) {
    if (entry.absPath === excludeFileAbsPath) continue;

    let matchedLine = null;
    for (const check of tokenChecks) {
      const line = lineNumberForFirstMatch(entry.content, check.token, check.regex);
      if (line != null) {
        matchedLine = line;
        break;
      }
    }

    if (matchedLine != null) {
      matches.push(`${entry.relPath}:${matchedLine}`);
      if (matches.length >= maxMatches) break;
    }
  }
  return matches;
}

function pageFileToRoute(pageAbsPath) {
  const rel = toPosix(path.relative(path.join(SOURCE_ROOT, "pages"), pageAbsPath));
  const ext = path.extname(rel);
  const withoutExt = rel.slice(0, -ext.length);

  if (withoutExt === "index") return "/";

  let route = withoutExt;

  if (route.endsWith("/index")) {
    route = route.slice(0, -"/index".length);
  }

  route = route ? `/${route}` : "/";
  route = route.replace(/\/+/g, "/");
  return normalizeRoutePath(route);
}

function isSitemapGeneratorPage(pageAbsPath) {
  const rel = toPosix(path.relative(path.join(SOURCE_ROOT, "pages"), pageAbsPath));
  return (
    rel === "sitemap.astro" ||
    /^sitemap.*\.xml\.(ts|tsx|js|jsx)$/.test(rel) ||
    rel === "sitemap.xml.ts" ||
    rel === "sitemap_index.xml.ts"
  );
}

function isInternalNonIndexRoute(route) {
  return INTERNAL_NON_INDEX_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

function isPotentiallyDynamicRoute(route) {
  return route.includes("[") || route.includes("]");
}

function buildReportPath() {
  const date = new Date().toISOString().slice(0, 10);
  const baseName = `unused-files-audit-${date}`;
  let candidate = path.join(DOCS_REPORT_DIR, `${baseName}.md`);
  let index = 1;
  while (fs.existsSync(candidate)) {
    const suffix = String(index).padStart(2, "0");
    candidate = path.join(DOCS_REPORT_DIR, `${baseName}-${suffix}.md`);
    index += 1;
  }
  return candidate;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildComponentTokenChecks(componentAbsPath) {
  const relFromComponents = toPosix(path.relative(path.join(SOURCE_ROOT, "components"), componentAbsPath));
  const ext = path.extname(relFromComponents);
  const relNoExt = relFromComponents.slice(0, -ext.length);
  const basename = path.basename(relNoExt);

  return [
    { token: `@/components/${relNoExt}`, regex: false },
    { token: `@components/${relNoExt}`, regex: false },
    { token: `/components/${relNoExt}`, regex: false },
    { token: `components/${relNoExt}`, regex: false },
    { token: new RegExp(`\\b${escapeRegExp(basename)}\\b`), regex: true },
  ];
}

function buildImageTokenChecks(imageAbsPath) {
  const relFromPublic = imageAbsPath.startsWith(path.join(REPO_ROOT, "public"))
    ? toPosix(path.relative(path.join(REPO_ROOT, "public"), imageAbsPath))
    : null;
  const relFromAssets = imageAbsPath.startsWith(path.join(SOURCE_ROOT, "assets"))
    ? toPosix(path.relative(path.join(SOURCE_ROOT, "assets"), imageAbsPath))
    : null;
  const basename = path.basename(imageAbsPath);
  const stem = path.basename(imageAbsPath, path.extname(imageAbsPath));

  const tokens = [];
  if (relFromPublic) {
    tokens.push({ token: `/${relFromPublic}`, regex: false });
    tokens.push({ token: relFromPublic, regex: false });
    tokens.push({ token: `/public/${relFromPublic}`, regex: false });
  }
  if (relFromAssets) {
    tokens.push({ token: `@/assets/${relFromAssets}`, regex: false });
    tokens.push({ token: `assets/${relFromAssets}`, regex: false });
    tokens.push({ token: `/src/assets/${relFromAssets}`, regex: false });
  }
  tokens.push({ token: basename, regex: false });
  tokens.push({ token: new RegExp(`\\b${escapeRegExp(stem)}\\b`), regex: true });

  return tokens;
}

function toMarkdownList(rows) {
  if (rows.length === 0) return "- None";
  return rows
    .map(
      (row) =>
        `- \`${row.file}\` | reason: ${row.reason} | evidence: ${row.evidence} | confidence: ${row.confidence}`
    )
    .join("\n");
}

async function main() {
  fs.mkdirSync(DOCS_REPORT_DIR, { recursive: true });

  const deployedPaths = await fetchProductionDeployedPaths();

  const pageFiles = walkFiles(path.join(SOURCE_ROOT, "pages"), PAGE_EXTENSIONS);
  const scanFiles = walkFiles(SOURCE_ROOT, SCAN_EXTENSIONS);

  const scanEntries = scanFiles.map((absPath) => ({
    absPath,
    relPath: toPosix(path.relative(REPO_ROOT, absPath)),
    content: fs.readFileSync(absPath, "utf8"),
  }));

  const candidateUnusedPages = [];
  const internalNonIndexPages = [];

  for (const pageAbsPath of pageFiles) {
    const relPath = toPosix(path.relative(REPO_ROOT, pageAbsPath));
    const route = pageFileToRoute(pageAbsPath);
    const isApi = route.startsWith("/api/");
    const isFrameworkInternal = path.basename(pageAbsPath).startsWith("_");
    const isSitemap = isSitemapGeneratorPage(pageAbsPath);

    if (isApi || isFrameworkInternal || isSitemap) continue;

    const fileRef = `${relPath}:1`;
    const dynamic = isPotentiallyDynamicRoute(route);
    const deployed = deployedPaths.has(route);

    if (isInternalNonIndexRoute(route)) {
      internalNonIndexPages.push({
        file: fileRef,
        reason: `internal/non-index route ${route}`,
        evidence: `${PROD_BASE_URL}/robots.txt disallow policy + route prefix`,
        confidence: dynamic ? "Medium" : "High",
      });
      continue;
    }

    if (!deployed) {
      candidateUnusedPages.push({
        file: fileRef,
        reason: `route ${route} absent from production sitemaps`,
        evidence: `${PROD_SITEMAP_INDEX_URL} + child sitemaps (no match)`,
        confidence: dynamic ? "Medium" : "High",
      });
    }
  }

  const componentFiles = walkFiles(path.join(SOURCE_ROOT, "components"), PAGE_EXTENSIONS);
  const candidateUnusedComponents = [];

  for (const componentAbsPath of componentFiles) {
    const relPath = toPosix(path.relative(REPO_ROOT, componentAbsPath));
    const checks = buildComponentTokenChecks(componentAbsPath);
    const matches = collectMatches(scanEntries, checks, componentAbsPath, 3);
    if (matches.length === 0) {
      candidateUnusedComponents.push({
        file: `${relPath}:1`,
        reason: "no static references found",
        evidence: "no import/path/name matches in src/**",
        confidence: "High",
      });
    }
  }

  const imageFiles = [];
  for (const baseDir of [path.join(SOURCE_ROOT, "assets"), path.join(REPO_ROOT, "public")]) {
    if (!fs.existsSync(baseDir)) continue;
    const files = walkFiles(baseDir, null);
    for (const absPath of files) {
      const ext = path.extname(absPath).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) imageFiles.push(absPath);
    }
  }

  const candidateUnusedImages = [];

  for (const imageAbsPath of imageFiles) {
    const relPath = toPosix(path.relative(REPO_ROOT, imageAbsPath));
    const checks = buildImageTokenChecks(imageAbsPath);
    const matches = collectMatches(scanEntries, checks, imageAbsPath, 2);
    if (matches.length === 0) {
      candidateUnusedImages.push({
        file: `${relPath}:1`,
        reason: "no static references found",
        evidence: "no image path/filename matches in src/**",
        confidence: "High",
      });
    }
  }

  candidateUnusedPages.sort((a, b) => a.file.localeCompare(b.file));
  internalNonIndexPages.sort((a, b) => a.file.localeCompare(b.file));
  candidateUnusedComponents.sort((a, b) => a.file.localeCompare(b.file));
  candidateUnusedImages.sort((a, b) => a.file.localeCompare(b.file));

  const reportPath = buildReportPath();
  const reportRelPath = toPosix(path.relative(REPO_ROOT, reportPath));
  const today = new Date().toISOString().slice(0, 10);

  const report = `# Unused Files Audit Report (${today})

## Rules
- Baseline deployed site: \`${PROD_BASE_URL}\`
- Production inventory source: \`${PROD_SITEMAP_INDEX_URL}\` and child sitemaps
- Unused logic: sitemap visibility + static source reference scan
- Classification: candidate-based (not absolute runtime proof)

## Counts
- Candidate unused pages: **${candidateUnusedPages.length}**
- Internal/intentional non-index pages: **${internalNonIndexPages.length}**
- Candidate unused components: **${candidateUnusedComponents.length}**
- Candidate unused images: **${candidateUnusedImages.length}**

## Candidate Unused Pages
${toMarkdownList(candidateUnusedPages)}

## Internal / Intentional Non-Index Pages
${toMarkdownList(internalNonIndexPages)}

## Candidate Unused Components
${toMarkdownList(candidateUnusedComponents)}

## Candidate Unused Images
${toMarkdownList(candidateUnusedImages)}
`;

  fs.writeFileSync(reportPath, report, "utf8");

  console.log(`Unused files audit report written: ${reportRelPath}`);
  console.log(
    JSON.stringify(
      {
        candidateUnusedPages: candidateUnusedPages.length,
        internalNonIndexPages: internalNonIndexPages.length,
        candidateUnusedComponents: candidateUnusedComponents.length,
        candidateUnusedImages: candidateUnusedImages.length,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Failed to generate unused files audit report.");
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});

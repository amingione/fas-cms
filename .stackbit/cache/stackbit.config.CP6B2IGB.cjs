"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// stackbit.config.ts
var stackbit_config_exports = {};
__export(stackbit_config_exports, {
  default: () => stackbit_config_default
});
module.exports = __toCommonJS(stackbit_config_exports);
var import_types = require("@stackbit/types");
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_cms_git = require("@stackbit/cms-git");
var import_cms_sanity = require("@stackbit/cms-sanity");
var import_util = __toESM(require("util"));
if (import_util.default?._extend && import_util.default._extend !== Object.assign) {
  import_util.default._extend = Object.assign;
}
var prevEmitWarning = process.emitWarning;
process.emitWarning = function patchedEmitWarning(warning, ...args) {
  const code = typeof warning === "object" && warning ? warning.code : void 0;
  const message = typeof warning === "string" ? warning : warning?.message;
  if (code === "DEP0060" || message?.includes("util._extend")) {
    return;
  }
  return prevEmitWarning.call(process, warning, ...args);
};
var SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || process.env.PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID || "";
var SANITY_DATASET = process.env.SANITY_DATASET || process.env.PUBLIC_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET || "production";
var SANITY_TOKEN = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || process.env.VITE_SANITY_API_TOKEN || "";
var SANITY_STUDIO_URL = process.env.SANITY_STUDIO_URL || process.env.SANITY_STUDIO_NETLIFY_BASE || "";
var ENABLE_SANITY = String(process.env.ENABLE_SANITY || "").toLowerCase() === "true" || String(process.env.ENABLE_SANITY || "") === "1";
var stackbit_config_default = (0, import_types.defineStackbitConfig)({
  stackbitVersion: "~0.6.0",
  ssgName: "custom",
  nodeVersion: "18",
  // Let the Visual Editor set PORT; bind to 0.0.0.0 so the editor container can reach it
  // Call astro directly to avoid shell argument forwarding issues with yarn scripts
  devCommand: "astro dev --host 0.0.0.0 --port $PORT",
  // Astro integration (NVE watches for these)
  experimental: {
    ssg: {
      name: "Astro",
      logPatterns: { up: ["is ready", "astro"] },
      directRoutes: { "socket.io": "socket.io" },
      passthrough: ["/vite-hmr/**"]
    }
  },
  // ...
  contentSources: [
    new import_cms_git.GitContentSource({
      rootPath: "/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-cms-fresh",
      contentDirs: ["content"],
      models: [
        // ========= Reusable Blocks =========
        {
          name: "HeroBlock",
          type: "data",
          filePath: "content/blocks/hero/{slug}.json",
          fields: [
            { name: "eyebrow", type: "string" },
            { name: "headline", type: "string", required: true },
            { name: "subtext", type: "string" },
            { name: "imageSrc", type: "image" },
            {
              name: "cta",
              type: "object",
              fields: [
                { name: "text", type: "string" },
                { name: "href", type: "string" },
                { name: "variant", type: "string" }
              ]
            }
          ]
        },
        {
          name: "RichTextBlock",
          type: "data",
          filePath: "content/blocks/rich/{slug}.json",
          fields: [
            { name: "title", type: "string" },
            { name: "body", type: "markdown" }
          ]
        },
        // ========= Pages =========
        {
          name: "Page",
          type: "page",
          labelField: "title",
          fieldGroups: [{ name: "design", label: "Design" }],
          urlPath: "/{slug}",
          filePath: "content/pages/{slug}.json",
          fields: [
            {
              name: "slug",
              type: "string",
              required: true,
              description: 'URL slug ("index" becomes "/")'
            },
            { name: "title", type: "string", required: true },
            {
              name: "sections",
              type: "list",
              items: {
                fieldGroups: [{ name: "design", label: "Design" }],
                type: "object",
                fields: [
                  // For inline content
                  {
                    name: "blockType",
                    type: "enum",
                    options: [
                      "homeHero",
                      "RichText",
                      "HeadingBanner1",
                      "HeadingBanner",
                      "Products",
                      "TruckPackagesHero",
                      "Highlights",
                      "TaskCard",
                      "ProductFeatureBanner",
                      "ThreeDGallery",
                      "LuxuryFeatures"
                    ],
                    required: true
                  },
                  { name: "headline", type: "string" },
                  { name: "subtext", type: "string" },
                  { name: "imageSrc", type: "image" },
                  {
                    name: "cta",
                    type: "object",
                    fields: [
                      { name: "text", type: "string" },
                      { name: "href", type: "string" },
                      { name: "variant", type: "string" }
                    ]
                  },
                  // Secondary CTA support for complex blocks
                  {
                    name: "ctaSecondary",
                    type: "object",
                    fields: [
                      { name: "text", type: "string" },
                      { name: "href", type: "string" },
                      { name: "variant", type: "string" }
                    ]
                  },
                  // Additional headings and badge/kicker lines for hero-style blocks
                  { name: "badge", type: "string" },
                  { name: "titleTop", type: "string" },
                  { name: "titleMid", type: "string" },
                  { name: "titleBottom", type: "string" },
                  { name: "kicker", type: "string" },
                  // Or reference a reusable block by path
                  {
                    name: "ref",
                    type: "string",
                    description: "Optional path to a block JSON file under content/blocks"
                  }
                ]
              }
            }
          ]
        }
      ]
    }),
    new import_cms_git.GitContentSource({
      rootPath: "/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-cms-fresh",
      contentDirs: ["content/pages"],
      models: [
        {
          name: "PowerPackagesPage",
          label: "Power Packages Page",
          type: "page",
          filePath: "content/pages/powerPackages.json",
          fields: [
            { name: "slug", type: "string", required: true, description: "Slug for the page" },
            { name: "title", type: "string", required: true },
            {
              name: "hero",
              type: "object",
              fields: [
                { name: "heading", type: "string" },
                { name: "description", type: "text" },
                {
                  name: "badges",
                  type: "list",
                  items: { type: "string" }
                },
                {
                  name: "ctas",
                  type: "list",
                  items: {
                    type: "object",
                    fields: [
                      { name: "label", type: "string", required: true },
                      { name: "href", type: "string" },
                      { name: "variant", type: "string" }
                    ]
                  }
                }
              ]
            },
            {
              name: "highlightPills",
              type: "list",
              items: { type: "string" }
            },
            { name: "platformHeading", type: "string" },
            {
              name: "platforms",
              type: "list",
              items: {
                type: "object",
                fields: [
                  { name: "href", type: "string" },
                  { name: "image", type: "image" },
                  { name: "alt", type: "string" },
                  { name: "labelTop", type: "string" },
                  { name: "labelBottom", type: "string" }
                ]
              }
            },
            {
              name: "tiers",
              type: "list",
              items: {
                type: "object",
                fields: [
                  { name: "image", type: "image" },
                  { name: "alt", type: "string" },
                  { name: "labelTop", type: "string" },
                  { name: "labelBottom", type: "string" }
                ]
              }
            },
            {
              name: "ctaButtons",
              type: "list",
              items: {
                type: "object",
                fields: [
                  { name: "label", type: "string", required: true },
                  { name: "href", type: "string" },
                  { name: "variant", type: "string" }
                ]
              }
            }
          ]
        }
      ]
    }),
    // Conditionally include Sanity only when explicitly enabled and configured
    ...ENABLE_SANITY && SANITY_PROJECT_ID && SANITY_DATASET ? [
      new import_cms_sanity.SanityContentSource({
        rootPath: "/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-cms-fresh",
        // Point to the project root where sanity.config.ts lives
        studioPath: "/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-cms-fresh",
        projectId: SANITY_PROJECT_ID,
        token: SANITY_TOKEN,
        dataset: SANITY_DATASET,
        studioUrl: SANITY_STUDIO_URL
      })
    ] : []
  ],
  siteMap: ({ documents, models }) => {
    const slugRouteOverrides = {
      index: "/",
      services: "/services/Services",
      "services/igla": "/services/igla",
      welding: "/services/welding",
      customFab: "/services/customFab",
      porting: "/services/porting",
      coreExchange: "/services/coreExchange",
      truckPackages: "/packages/truckPackages",
      powerPackages: "/packages/powerPackages",
      BilletBearingPlateSpecs: "/specs/BilletBearingPlate",
      PredatorPulleySpecsSheet: "/specs/PredatorPulley",
      HellcatPulleyHubSpecSheet: "/specs/PulleyHub",
      BilletSnoutSpecs: "/specs/BilletSnout",
      BilletThrottleBody108Specs: "/specs/BilletThrottleBody108",
      BilletLidSpecsSheet: "/specs/BilletLid",
      shop: "/shop",
      schedule: "/schedule",
      contact: "/contact",
      about: "/about",
      faq: "/faq",
      privacypolicy: "/privacypolicy"
    };
    const pageModelNames = new Set(models.filter((m) => m.type === "page").map((m) => m.name));
    const entries = documents.filter((d) => pageModelNames.has(d.modelName)).map((d) => {
      const doc = d;
      const rawSlug = (doc.fields && doc.fields.slug) ?? doc.slug;
      const slug = typeof rawSlug === "string" ? rawSlug : rawSlug?.current ?? void 0;
      let computedUrl = doc.urlPath ?? (slug ? slug === "index" ? "/" : `/${slug}` : "/");
      if (slug && slugRouteOverrides[slug]) {
        computedUrl = slugRouteOverrides[slug];
      }
      if (d.srcType === "sanity" && d.modelName === "product" && slug) {
        computedUrl = `/shop/${slug}`;
      }
      const entry = {
        stableId: d.id,
        urlPath: computedUrl,
        document: d,
        isHomePage: computedUrl === "/"
      };
      return entry;
    });
    try {
      const root = import_path.default.join("/Users/ambermin/LocalStorm/Workspace/DevProjects/GitHub/fas-cms-fresh", "src", "pages");
      const urls = [];
      const walk = (dir) => {
        const list = import_fs.default.readdirSync(dir, { withFileTypes: true });
        for (const ent of list) {
          const full = import_path.default.join(dir, ent.name);
          const rel = import_path.default.relative(root, full);
          if (ent.isDirectory()) {
            if (rel.startsWith("api"))
              continue;
            walk(full);
          } else if (ent.isFile() && (ent.name.endsWith(".astro") || ent.name.endsWith(".md") || ent.name.endsWith(".mdx"))) {
            if (rel.includes("["))
              continue;
            const noExt = rel.replace(/\\.(astro|md|mdx)$/, "");
            let url = "/" + noExt.replace(/\\\\/g, "/");
            url = url.replace(/\\/g, "/");
            url = url.replace(/index$/i, "");
            if (url.endsWith("/"))
              url = url.slice(0, -1);
            if (url === "")
              url = "/";
            urls.push(url);
          }
        }
      };
      if (import_fs.default.existsSync(root))
        walk(root);
      const astroEntries = Array.from(new Set(urls)).map((url) => ({
        stableId: `astro:${url}`,
        urlPath: url,
        isHomePage: url === "/",
        document: {
          srcType: "astro",
          srcProjectId: "",
          modelName: "astroPage",
          id: `astro:${url}`
        }
      }));
      const seen = new Set(entries.map((e) => e.urlPath));
      for (const ae of astroEntries) {
        if (!seen.has(ae.urlPath))
          entries.push(ae);
      }
    } catch (e) {
      console.warn("siteMap: failed to scan Astro pages:", e);
    }
    const manualUrls = [
      "/",
      "/services/AllServices",
      "/services/porting",
      "/services/customFab",
      "/services/coreExchange",
      "/services/welding",
      "/services/igla",
      "/packages/truckPackages",
      "/packages/powerPackages",
      "/specs/BilletBearingPlate",
      "/specs/PredatorPulley",
      "/specs/PulleyHub",
      "/specs/BilletSnout",
      "/specs/BilletThrottleBody108",
      "/specs/BilletLid",
      "/shop",
      "/shop/{slug}",
      "/faq",
      "/faq2",
      "/schedule",
      "/contact",
      "/about",
      "/privacypolicy",
      "/termsandconditions",
      "/returnRefundPolicy",
      "/warranty",
      "/dashboard"
    ];
    for (const url of manualUrls) {
      if (!entries.some((e) => e.urlPath === url)) {
        entries.push({
          stableId: `static:${url}`,
          urlPath: url,
          isHomePage: url === "/",
          document: {
            srcType: "static",
            srcProjectId: "",
            modelName: "staticPage",
            id: `static:${url}`
          }
        });
      }
    }
    entries.sort((a, b) => {
      if (a.isHomePage && !b.isHomePage)
        return -1;
      if (b.isHomePage && !a.isHomePage)
        return 1;
      return a.urlPath.localeCompare(b.urlPath);
    });
    return entries;
  }
});
//# sourceMappingURL=stackbit.config.CP6B2IGB.cjs.map

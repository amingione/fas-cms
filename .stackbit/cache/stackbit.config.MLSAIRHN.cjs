"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// stackbit.config.ts
var stackbit_config_exports = {};
__export(stackbit_config_exports, {
  default: () => stackbit_config_default
});
module.exports = __toCommonJS(stackbit_config_exports);
var import_types = require("@stackbit/types");
var import_cms_sanity = require("@stackbit/cms-sanity");
var import_cms_git = require("@stackbit/cms-git");
var enableSanity = process.env.ENABLE_SANITY === "true";
var stackbit_config_default = (0, import_types.defineStackbitConfig)({
  stackbitVersion: "~0.6.0",
  ssgName: "custom",
  nodeVersion: "18",
  // Let NVE boot your Astro dev server on the port it chooses
  devCommand: "yarn astro dev --port 3000 --host 127.0.0.1",
  // Astro integration (NVE watches for these)
  experimental: {
    ssg: {
      name: "Astro",
      logPatterns: { up: ["is ready", "astro"] },
      directRoutes: { "socket.io": "socket.io" },
      passthrough: ["/vite-hmr/**"]
    }
  },
  // Content sources for visual editing
  contentSources: [
    // Git-based content (Markdown/MDX/JSON/YAML) from this repo
    new import_cms_git.GitContentSource({
      rootPath: "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms",
      contentDirs: ["content"],
      models: [
        // ========= Global Theme =========
        {
          name: "Theme",
          type: "data",
          filePath: "content/theme.json",
          fields: [
            { name: "brandName", type: "string", required: true },
            {
              name: "colors",
              type: "object",
              fields: [
                { name: "primary", type: "string", required: true },
                { name: "secondary", type: "string" },
                { name: "accent", type: "string" },
                { name: "background", type: "string" },
                { name: "foreground", type: "string" }
              ]
            },
            {
              name: "buttons",
              type: "list",
              items: {
                type: "object",
                fields: [
                  { name: "variant", type: "string", required: true },
                  { name: "className", type: "string" }
                ]
              }
            }
          ]
        },
        // ========= Reusable Blocks =========
        {
          name: "HeroBlock",
          type: "data",
          filePath: "content/blocks/hero/{slug}.json",
          fields: [
            { name: "eyebrow", type: "string" },
            { name: "headline", type: "string", required: true },
            { name: "subtext", type: "string" },
            { name: "imageSrc", type: "string" },
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
          urlPath: "/{slug}",
          filePath: "content/pages/{slug}.json",
          fields: [
            { name: "title", type: "string", required: true },
            {
              name: "sections",
              type: "list",
              items: {
                type: "object",
                fields: [
                  { name: "blockType", type: "string", required: true },
                  // For inline content
                  { name: "headline", type: "string" },
                  { name: "subtext", type: "string" },
                  { name: "imageSrc", type: "string" },
                  {
                    name: "cta",
                    type: "object",
                    fields: [
                      { name: "text", type: "string" },
                      { name: "href", type: "string" },
                      { name: "variant", type: "string" }
                    ]
                  },
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
    // Optionally enable Sanity (toggle via ENABLE_SANITY=true)
    ...enableSanity ? [
      new import_cms_sanity.SanityContentSource({
        rootPath: "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms",
        projectId: process.env.SANITY_PROJECT_ID,
        dataset: process.env.SANITY_DATASET || "production",
        token: process.env.SANITY_ACCESS_TOKEN,
        // READ token
        studioUrl: process.env.SANITY_STUDIO_URL || "https://fassanity.fasmotorsports.com",
        studioInstallCommand: "echo 'skipping install'"
      })
    ] : []
  ],
  siteMap: ({ documents, models }) => {
    const pageModels = models.filter((m) => m.type === "page");
    const entries = [];
    for (const doc of documents) {
      const isPageModel = pageModels.some((m) => m.name === doc.modelName);
      if (!isPageModel) continue;
      const slug = doc.slug || doc.fields?.slug || doc.id;
      const isHome = slug === "index";
      const urlPath = isHome ? "/" : `/${slug}`;
      entries.push({
        stableId: doc.id,
        urlPath,
        document: doc,
        isHomePage: isHome
      });
    }
    return entries;
  },
  ...enableSanity ? {
    modelExtensions: [
      { name: "product", type: "page", urlPath: "/shop/{slug}" },
      { name: "category", type: "page", urlPath: "/shop?category={slug}" }
    ]
  } : {}
});
//# sourceMappingURL=stackbit.config.MLSAIRHN.cjs.map

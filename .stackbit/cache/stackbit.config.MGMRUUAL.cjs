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
  // ...
  contentSources: [
    new import_cms_git.GitContentSource({
      rootPath: "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms",
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
                  { name: "blockType", type: "string", required: true },
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
        rootPath: "/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-sanity",
        projectId: process.env.SANITY_PROJECT_ID,
        dataset: process.env.SANITY_DATASET || "production",
        token: process.env.SANITY_ACCESS_TOKEN
      })
    ] : []
  ],
  siteMap: ({ documents, models }) => {
    const pageModels = models.filter((m) => m.type === "page");
    return documents.filter((d) => pageModels.some((m) => m.name === d.modelName)).map((document) => {
      const urlModel = (() => {
        switch (document.modelName) {
          case "Page":
            return "otherPage";
          case "Blog":
            return "otherBlog";
          default:
            return null;
        }
      })();
      return {
        stableId: document.id,
        urlPath: `/${urlModel}/${document.id}`,
        document,
        isHomePage: false
      };
    }).filter(Boolean);
  },
  ...enableSanity ? {
    modelExtensions: [
      { name: "product", type: "page", urlPath: "/shop/{slug}" },
      { name: "category", type: "page", urlPath: "/shop?category={slug}" }
    ]
  } : {}
});
//# sourceMappingURL=stackbit.config.MGMRUUAL.cjs.map

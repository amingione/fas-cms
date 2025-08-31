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
var stackbit_config_default = (0, import_types.defineStackbitConfig)({
  stackbitVersion: "~0.6.0",
  ssgName: "custom",
  nodeVersion: "18",
  // Let NVE boot your Astro dev server and choose the port
  // Bind to 0.0.0.0 so the editor container can reach it
  devCommand: "yarn astro dev --host 0.0.0.0",
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
    })
  ],
  siteMap: ({ documents, models }) => {
    const pageModelNames = new Set(models.filter((m) => m.type === "page").map((m) => m.name));
    const entries = documents.filter((d) => pageModelNames.has(d.modelName)).map((d) => {
      const doc = d;
      const slug = doc.fields?.slug ?? doc.slug;
      const computedUrl = doc.urlPath ?? (slug ? slug === "index" ? "/" : `/${slug}` : "/");
      const entry = {
        stableId: d.id,
        urlPath: computedUrl,
        document: d,
        isHomePage: computedUrl === "/"
      };
      return entry;
    });
    try {
      const root = import_path.default.join("/Users/ambermin/Documents/Workspace/DevProjects/GitHub/fas-cms", "src", "pages");
      const urls = [];
      const walk = (dir) => {
        const list = import_fs.default.readdirSync(dir, { withFileTypes: true });
        for (const ent of list) {
          const full = import_path.default.join(dir, ent.name);
          const rel = import_path.default.relative(root, full);
          if (ent.isDirectory()) {
            if (rel.startsWith("api")) continue;
            walk(full);
          } else if (ent.isFile() && (ent.name.endsWith(".astro") || ent.name.endsWith(".md") || ent.name.endsWith(".mdx"))) {
            if (rel.includes("[")) continue;
            const noExt = rel.replace(/\\.(astro|md|mdx)$/, "");
            let url = "/" + noExt.replace(/\\\\/g, "/");
            url = url.replace(/\\/g, "/");
            url = url.replace(/index$/i, "");
            if (url.endsWith("/")) url = url.slice(0, -1);
            if (url === "") url = "/";
            urls.push(url);
          }
        }
      };
      if (import_fs.default.existsSync(root)) walk(root);
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
        if (!seen.has(ae.urlPath)) entries.push(ae);
      }
    } catch (e) {
      console.warn("siteMap: failed to scan Astro pages:", e);
    }
    return entries;
  }
});
//# sourceMappingURL=stackbit.config.PAWYBCZX.cjs.map

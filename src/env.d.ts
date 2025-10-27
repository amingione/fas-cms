/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ABACUS_ROUTE_LLM_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

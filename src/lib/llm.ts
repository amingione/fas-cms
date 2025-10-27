import OpenAI from 'openai';

const ROUTE_LLM_BASE_URL = 'https://routellm.abacus.ai/v1';
export const ROUTE_LLM_MODEL = 'route-llm';

let cachedClient: OpenAI | null = null;

function resolveApiKey(): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env?.ABACUS_ROUTE_LLM_API_KEY) {
    return import.meta.env.ABACUS_ROUTE_LLM_API_KEY;
  }
  return typeof process !== 'undefined' ? process.env.ABACUS_ROUTE_LLM_API_KEY : undefined;
}

export function getRouteLLMClient(): OpenAI | null {
  const apiKey = resolveApiKey();
  if (!apiKey) return null;
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey,
      baseURL: ROUTE_LLM_BASE_URL
    });
  }
  return cachedClient;
}

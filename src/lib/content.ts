// Content helper utilities used to load JSON page docs.
// Inline helpers now return empty objects so no editor-specific attributes are added.

export async function loadPageDoc(slug: string): Promise<any | null> {
  const modules = import.meta.glob('/content/pages/*.json', { eager: true }) as Record<string, any>;
  const key = `/content/pages/${slug}.json`;
  const mod = modules[key];
  if (!mod) return null;
  return mod.default ?? mod;
}

export function inlineFieldAttrs(_path?: string): Record<string, never> {
  return {};
}

export function inlineObjectId(_id?: string): Record<string, never> {
  return {};
}

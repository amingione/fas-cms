// Lightweight helpers for Stackbit Inline Editor annotations
// Usage in Astro/JSX: <h1 {...sbFieldPath('title')}>...</h1>
// Optionally: <div {...sbObjectId(docId)}>...</div>

export function sbFieldPath(path: string) {
  return { 'data-sb-field-path': path } as Record<string, string>;
}

export function sbObjectId(id: string) {
  return { 'data-sb-object-id': id } as Record<string, string>;
}

// Load a Git Page document by slug from content/pages/{slug}.json
// Returns the JSON contents or null if not found.
export async function getGitPageDoc(slug: string): Promise<any | null> {
  const modules = import.meta.glob('/content/pages/*.json', { eager: true }) as Record<string, any>;
  const key = `/content/pages/${slug}.json`;
  const mod = modules[key];
  if (!mod) return null;
  return mod.default ?? mod;
}


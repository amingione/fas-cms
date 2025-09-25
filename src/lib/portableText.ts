export function portableTextToPlainText(value: unknown): string {
  if (!value) return '';

  if (typeof value === 'string') return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => portableTextToPlainText(item))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.children)) {
      return record.children
        .map((child) => portableTextToPlainText(child))
        .join('')
        .trim();
    }

    if (typeof record.text === 'string') {
      return record.text;
    }
  }

  return '';
}

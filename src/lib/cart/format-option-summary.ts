type OptionSummaryInput = {
  options?: Record<string, unknown> | null;
  selections?: unknown;
  selectedOptions?: string[] | null;
  selectedUpgrades?: string[] | null;
  upgrades?: unknown;
};

const TYPED_GROUP_REGEX = /(paint|code|notes?|custom)/i;

function normalizeValue(raw: unknown): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\s+/g, ' ');
}

function extractValueFromString(raw: string): { value: string; key?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex > -1) {
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    if (!value) return null;
    return { value, key };
  }
  return { value: trimmed };
}

function hasTypedGroup(group?: string | null): boolean {
  if (!group) return false;
  return TYPED_GROUP_REGEX.test(group);
}

function readUpgradeEntries(raw: unknown): string[] {
  const values: string[] = [];
  if (Array.isArray(raw)) {
    raw.forEach((entry) => {
      if (typeof entry === 'string') {
        values.push(entry);
      } else if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>;
        const label =
          (obj.label as string | undefined) ||
          (obj.name as string | undefined) ||
          (obj.title as string | undefined) ||
          (obj.value as string | undefined);
        if (label) values.push(label);
      }
    });
  } else if (raw && typeof raw === 'object') {
    Object.values(raw).forEach((entry) => {
      if (typeof entry === 'string') values.push(entry);
    });
  } else if (typeof raw === 'string') {
    values.push(raw);
  }
  return values;
}

export function formatOptionSummary(input: OptionSummaryInput): string | null {
  const values: string[] = [];
  const typedValues: string[] = [];
  const seen = new Set<string>();

  const pushValue = (rawValue: unknown, typed = false) => {
    const normalized = normalizeValue(rawValue);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    if (typed) typedValues.push(normalized);
    else values.push(normalized);
  };

  const selectionsArray = Array.isArray(input.selections)
    ? input.selections
    : input.selections && typeof input.selections === 'object'
      ? Array.isArray((input.selections as any)?.selections)
        ? (input.selections as any).selections
        : Object.entries(input.selections as Record<string, unknown>).flatMap(([key, value]) =>
            Array.isArray(value) ? value.map((entry) => ({ group: key, label: entry })) : []
          )
      : [];

  selectionsArray.forEach((entry: any) => {
    if (!entry || typeof entry !== 'object') return;
    const group = entry.group ?? entry.name ?? entry.key;
    const label = entry.label ?? entry.value ?? '';
    pushValue(label, hasTypedGroup(group));
  });

  if (Array.isArray(input.selectedOptions)) {
    input.selectedOptions.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const parsed = extractValueFromString(entry);
      if (!parsed) return;
      pushValue(parsed.value, hasTypedGroup(parsed.key));
    });
  }

  if (input.options && typeof input.options === 'object') {
    Object.entries(input.options).forEach(([key, value]) => {
      const typed = hasTypedGroup(key);
      if (Array.isArray(value)) {
        value.forEach((entry) => pushValue(entry, typed));
        return;
      }
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const labeled =
          obj.label ?? obj.value ?? obj.name ?? obj.title ?? obj.text ?? obj.id ?? null;
        if (labeled) {
          pushValue(labeled, typed);
          return;
        }
        Object.values(obj).forEach((entry) => pushValue(entry, typed));
        return;
      }
      if (typeof value === 'string') {
        const parsed = extractValueFromString(value);
        if (!parsed) return;
        pushValue(parsed.value, typed || hasTypedGroup(parsed.key));
        return;
      }
      pushValue(value, typed);
    });
  }

  if (Array.isArray(input.selectedUpgrades)) {
    input.selectedUpgrades.forEach((entry) => pushValue(entry, false));
  }

  readUpgradeEntries(input.upgrades).forEach((entry) => pushValue(entry, false));

  const combined = [...values, ...typedValues];
  if (!combined.length) return null;
  return combined.join(' • ');
}

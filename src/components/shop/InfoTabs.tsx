'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import PortableTextRenderer from '@/components/PortableTextRenderer.jsx';
import { portableTextToPlainText } from '@/lib/portableText';

type TabId = 'kit' | 'features' | 'specs' | 'attributes';

const TAB_DEFINITIONS: Array<{ id: TabId; name: string }> = [
  { id: 'kit', name: 'Kit Includes' },
  { id: 'features', name: 'Key Features' },
  { id: 'specs', name: 'Specs' },
  { id: 'attributes', name: 'Attributes' }
];

type KitItemLike = {
  item?: string;
  title?: string;
  name?: string;
  label?: string;
  quantity?: number;
  notes?: string;
  description?: string;
  detail?: string;
};

type KeyFeatureLike = Record<string, unknown>;

type SpecItemLike = {
  label?: string;
  name?: string;
  key?: string;
  title?: string;
  value?: string;
  detail?: string;
  description?: string;
};

type AttributeLike = {
  label?: string;
  name?: string;
  key?: string;
  title?: string;
  value?: string;
  detail?: string;
  description?: string;
};

type InfoTabsProps = {
  kitItems?: KitItemLike[];
  keyFeatures?: KeyFeatureLike[];
  specifications?: SpecItemLike[];
  attributes?: AttributeLike[];
};

type NormalizedKitItem = {
  label: string;
  notes?: string;
  quantity?: number;
};

type NormalizedFeature = {
  heading?: string;
  subheading?: string;
  body?: string | any[];
  bullets?: string[];
};

type NormalizedSpec = {
  label: string;
  value: string;
};

type NormalizedAttribute = {
  label: string;
  value: string;
};

const toPlainString = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value) || typeof value === 'object') {
    return portableTextToPlainText(value).trim();
  }
  return '';
};

const normalizeKitItems = (items?: KitItemLike[]): NormalizedKitItem[] => {
  const source = Array.isArray(items) ? items : [];

  const results: NormalizedKitItem[] = [];
  source.forEach((entry, index) => {
    if (entry == null) return;
    if (typeof entry === 'string') {
      results.push({ label: entry });
      return;
    }
    const label =
      toPlainString(entry.item) ||
      toPlainString(entry.title) ||
      toPlainString(entry.name) ||
      toPlainString(entry.label) ||
      '';
    const notes = toPlainString(entry.notes ?? entry.description ?? entry.detail);
    const quantity =
      typeof entry.quantity === 'number' && Number.isFinite(entry.quantity)
        ? entry.quantity
        : undefined;
    if (!label && !notes && quantity === undefined) {
      return;
    }
    results.push({
      label: label || `Item ${index + 1}`,
      notes: notes || undefined,
      quantity
    });
  });
  return results;
};

const normalizeFeatureBody = (value: unknown): string | any[] | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.blocks)) return record.blocks as any[];
    if (Array.isArray(record.value)) return record.value as any[];
    if (record._type) return [record];
  }
  return undefined;
};

const normalizeFeatureBullets = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .map((entry) => {
      if (!entry) return '';
      if (typeof entry === 'string') return entry;
      if (typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        return (
          toPlainString(record.title) ||
          toPlainString(record.label) ||
          toPlainString(record.text) ||
          toPlainString(record.value)
        );
      }
      return '';
    })
    .filter(Boolean);
  return list.length ? list : undefined;
};

const normalizeKeyFeatures = (items?: KeyFeatureLike[]): NormalizedFeature[] => {
  const source = Array.isArray(items) ? items : [];

  const results: NormalizedFeature[] = [];
  source.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      const plain = toPlainString(entry);
      if (plain) {
        results.push({ heading: `Feature ${index + 1}`, body: plain });
      }
      return;
    }
    const record = entry as Record<string, unknown>;
    const heading =
      toPlainString(record.title) ||
      toPlainString(record.name) ||
      toPlainString(record.heading) ||
      toPlainString(record.label);
    const subheading =
      toPlainString(record.subtitle) ||
      toPlainString(record.kicker) ||
      toPlainString(record.eyebrow) ||
      toPlainString(record.caption);
    const body =
      normalizeFeatureBody(
        record.description ??
          record.detail ??
          record.copy ??
          record.body ??
          record.content ??
          record.value ??
          record.text
      ) ?? toPlainString(record.description ?? record.detail);
    const bullets =
      normalizeFeatureBullets(record.points) ||
      normalizeFeatureBullets(record.items) ||
      normalizeFeatureBullets(record.bullets);

    if (!heading && !body && !bullets) {
      return;
    }

    results.push({
      heading: heading || undefined,
      subheading: subheading || undefined,
      body,
      bullets
    });
  });
  return results;
};

const normalizeSpecs = (items?: SpecItemLike[]): NormalizedSpec[] => {
  const source = Array.isArray(items) ? items : [];

  const results: NormalizedSpec[] = [];
  source.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      const plain = toPlainString(entry);
      if (plain) {
        results.push({ label: `Spec ${index + 1}`, value: plain });
      }
      return;
    }
    const label =
      toPlainString(entry.label) ||
      toPlainString(entry.title) ||
      toPlainString(entry.name) ||
      toPlainString(entry.key);
    const value = toPlainString(entry.value ?? entry.detail ?? entry.description);
    if (!label && !value) {
      return;
    }
    results.push({
      label: label || `Spec ${index + 1}`,
      value: value || '—'
    });
  });
  return results;
};

const normalizeAttributes = (items?: AttributeLike[]): NormalizedAttribute[] => {
  const source = Array.isArray(items) ? items : [];

  const results: NormalizedAttribute[] = [];
  source.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      const plain = toPlainString(entry);
      if (plain) {
        results.push({ label: `Attribute ${index + 1}`, value: plain });
      }
      return;
    }
    const label =
      toPlainString(entry.label) ||
      toPlainString(entry.title) ||
      toPlainString(entry.name) ||
      toPlainString(entry.key);
    const value = toPlainString(entry.value ?? entry.detail ?? entry.description);
    if (!label && !value) {
      return;
    }
    results.push({
      label: label || `Attribute ${index + 1}`,
      value: value || '—'
    });
  });
  return results;
};

const EmptyState = ({ message }: { message: string }) => (
  <p className="border-t border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-white/60">
    {message}
  </p>
);

const classNames = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

export default function InfoTabs({
  kitItems,
  keyFeatures,
  specifications,
  attributes
}: InfoTabsProps) {
  const normalizedKitItems = useMemo(() => normalizeKitItems(kitItems), [kitItems]);
  const normalizedFeatures = useMemo(() => normalizeKeyFeatures(keyFeatures), [keyFeatures]);
  const normalizedSpecs = useMemo(() => normalizeSpecs(specifications), [specifications]);
  const normalizedAttributes = useMemo(() => normalizeAttributes(attributes), [attributes]);

  const tabs = useMemo(() => {
    const contentMap: Record<TabId, boolean> = {
      kit: normalizedKitItems.length > 0,
      features: normalizedFeatures.length > 0,
      specs: normalizedSpecs.length > 0,
      attributes: normalizedAttributes.length > 0
    };
    return TAB_DEFINITIONS.filter((tab) => contentMap[tab.id]);
  }, [
    normalizedKitItems.length,
    normalizedFeatures.length,
    normalizedSpecs.length,
    normalizedAttributes.length
  ]);

  const firstAvailableTab = useMemo(() => tabs[0]?.id ?? 'kit', [tabs]);

  const [activeTab, setActiveTab] = useState<TabId>(firstAvailableTab);

  useEffect(() => {
    if (!tabs.length) return;
    if (tabs.some((tab) => tab.id === activeTab)) return;
    setActiveTab(firstAvailableTab);
  }, [activeTab, tabs, firstAvailableTab]);

  if (tabs.length === 0) {
    return null;
  }

  const renderFeaturesContent = () => {
    if (!normalizedFeatures.length) {
      return <EmptyState message="No key features have been published yet." />;
    }
    return (
      <div className="space-y-4">
        {normalizedFeatures.map((feature, index) => (
          <div
            key={`${feature.heading || 'feature'}-${index}`}
            className="border-t border-white/10 bg-black/30 p-4 shadow-inner"
          >
            {feature.subheading ? (
              <p className="text-xs uppercase tracking-widest text-white/60">
                {feature.subheading}
              </p>
            ) : null}
            {feature.heading ? (
              <h3 className="text-lg font-semibold text-white">{feature.heading}</h3>
            ) : null}
            {feature.body ? (
              typeof feature.body === 'string' ? (
                <p className="mt-2 text-sm leading-relaxed text-white/80">{feature.body}</p>
              ) : (
                <div className="prose prose-invert mt-2 text-sm leading-relaxed text-white/80">
                  <PortableTextRenderer value={feature.body} />
                </div>
              )
            ) : null}
            {feature.bullets && feature.bullets.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/80">
                {feature.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderKitContent = () => {
    if (!normalizedKitItems.length) {
      return <EmptyState message="Kit contents will be published soon." />;
    }
    return (
      <dl className="divide-y divide-white/10 border-t border-white/10 bg-black/30 text-sm text-white/90">
        {normalizedKitItems.map((kitItem, index) => (
          <div
            key={`${kitItem.label}-${index}`}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <dt className="text-xs uppercase tracking-wider text-white/60">
              {kitItem.label}
              {kitItem.notes ? (
                <span className="block text-[11px] font-normal text-white/50">{kitItem.notes}</span>
              ) : null}
            </dt>
            <dd className="font-semibold text-white">
              {kitItem.quantity !== undefined ? `Qty ${kitItem.quantity}` : ''}
            </dd>
          </div>
        ))}
      </dl>
    );
  };

  const renderSpecsContent = () => {
    if (!normalizedSpecs.length) {
      return <EmptyState message="Technical specifications coming soon." />;
    }
    return (
      <dl className="divide-y divide-white/10 border-t border-white/10 bg-black/30 text-sm text-white/90">
        {normalizedSpecs.map((spec, index) => (
          <div
            key={`${spec.label}-${index}`}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <dt className="text-xs uppercase tracking-wider text-white/60">{spec.label}</dt>
            <dd className="font-medium text-white">{spec.value}</dd>
          </div>
        ))}
      </dl>
    );
  };

  const renderAttributesContent = () => {
    if (!normalizedAttributes.length) {
      return <EmptyState message="Attributes have not been added yet." />;
    }
    return (
      <dl className="grid gap-3 sm:grid-cols-2">
        {normalizedAttributes.map((attr, index) => (
          <div
            key={`${attr.label}-${index}`}
            className="border-t border-white/10 bg-black/30 p-4 text-sm text-white/90"
          >
            <dt className="text-xs uppercase tracking-wide text-white/60">{attr.label}</dt>
            <dd className="mt-1 font-semibold text-white">{attr.value}</dd>
          </div>
        ))}
      </dl>
    );
  };

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'kit':
        return renderKitContent();
      case 'features':
        return renderFeaturesContent();
      case 'specs':
        return renderSpecsContent();
      case 'attributes':
        return renderAttributesContent();
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:hidden">
        <select
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as TabId)}
          aria-label="Select product info section"
          className="col-start-1 row-start-1 w-full appearance-none rounded-full bg-black border-white/20 border py-2 pr-8 pl-3 text-base text-white outline-1 -outline-offset-1 outline-white/10 *:bg-gray-900 focus:outline-2 focus:-outline-offset-2 focus:outline-amber-500 shadow-card-outer shadow-inner shadow-primary/30"
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-400"
        />
      </div>
      <div className="hidden sm:block">
        <div className="shadow-amber-300/30 shadow-card-outer shadow-inner">
          <nav aria-label="Product info tabs" className="-mb-px flex flex-wrap gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  tab.id === activeTab
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-white/60 hover:border-white/30 hover:text-white',
                  'cursor-pointer border-b-2 px-1 py-4 text-sm font-semibold transition'
                )}
                aria-current={tab.id === activeTab ? 'page' : undefined}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="mt-6">{renderActiveContent()}</div>
    </div>
  );
}

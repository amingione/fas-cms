'use client';

import { useState } from 'react';

type TabKey = 'overview' | 'inventory' | 'clients';

type Metric = {
  label: string;
  base: number;
  variance?: number;
  decimals?: number;
  suffix?: string;
  formatter?: (value: number) => string;
  clamp?: [number, number];
};

type TabConfig = {
  key: TabKey;
  label: string;
  summary: {
    statusColor: string;
    division: string;
    focus: string;
    description: string;
  };
  metrics: Metric[];
  footer: {
    eyebrow: string;
    title: string;
    body: string;
  };
};

const TABS: TabConfig[] = [
  {
    key: 'overview',
    label: 'Overview',
    summary: {
      statusColor: 'bg-primaryB',
      division: 'Supercharger Division',
      focus: 'Predator Platform',
      description:
        'Live telemetry from fabrication bays, dyno cells, and customer service dashboards.'
    },
    metrics: [
      { label: 'Active custom builds', base: 5, variance: 3, clamp: [5, 9] },
      { label: 'Avg turnaround', base: 10, variance: 2, suffix: 'days', clamp: [3, 11] },
      {
        label: 'QC pass rate',
        base: 99.9,
        variance: 0.4,
        decimals: 1,
        suffix: '%',
        clamp: [99.9, 99.9]
      }
    ],
    footer: {
      eyebrow: 'Precision insights',
      title: 'Every build tracked, every milestone verified',
      body: 'Our operations dashboard keeps the FAS Motorsports crew aligned—monitoring billet machining queues, dyno calibration data, and customer delivery timelines in one command center view.'
    }
  },
  {
    key: 'inventory',
    label: 'Inventory',
    summary: {
      statusColor: 'bg-amber-400',
      division: 'Inventory Control',
      focus: 'Performance Components',
      description:
        'Pulse on ready-to-ship Predator pulleys, intercoolers, and install hardware kits.'
    },
    metrics: [
      { label: 'Pulleys ready to ship', base: 30, variance: 0, clamp: [30, 30] },
      { label: 'Next restock ETA', base: 5, variance: 2, suffix: 'days', clamp: [2, 9] }
    ],
    footer: {
      eyebrow: 'Balanced stock',
      title: 'Inventory synced to the production floor',
      body: 'Alerts fire before we hit reorder points, keeping Predator kits, clamps, and belts aligned with live build demand.'
    }
  },
  {
    key: 'clients',
    label: 'Clients',
    summary: {
      statusColor: 'bg-blue-400',
      division: 'Client Success',
      focus: 'VIP & Dealer Network',
      description:
        'Account managers tracking milestone approvals, tuning sessions, and delivery logistics.'
    },
    metrics: [
      { label: 'Active VIP builds', base: 3, variance: 1, clamp: [2, 4] },
      {
        label: 'Client satisfaction',
        base: 4.9,
        variance: 0.15,
        decimals: 1,
        suffix: 'rating',
        clamp: [4.5, 5]
      },
      {
        label: 'Response SLA',
        base: 9,
        variance: 4,
        suffix: 'hours',
        clamp: [7, 24]
      }
    ],
    footer: {
      eyebrow: 'Guided experience',
      title: 'White-glove updates for every client',
      body: 'Milestone alerts, media galleries, and tuning notes keep customers and dealers looped in from concept to delivery.'
    }
  }
];

// Deterministic pseudo-random number (0-1) based on seed.
function dailyRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (hash >>> 0) / 0xffffffff;
  return normalized;
}

function computeMetricValue(tabKey: TabKey, metric: Metric, dateSeed: string) {
  const variance = metric.variance ?? 0;
  if (variance === 0) return metric.base;
  const random = dailyRandom(`${dateSeed}:${tabKey}:${metric.label}`);
  const offset = (random * 2 - 1) * variance;
  let value = metric.base + offset;
  if (metric.clamp) {
    const [min, max] = metric.clamp;
    value = Math.min(max, Math.max(min, value));
  }
  return value;
}

function getLocalDateSeed() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HeadingBanner() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const currentTab = TABS.find((tab) => tab.key === activeTab)!;
  const dateSeed = getLocalDateSeed();
  const displayMetrics = currentTab.metrics.map((metric) => {
    const value = computeMetricValue(currentTab.key, metric, dateSeed);
    const decimals = metric.decimals ?? 0;
    const primary = metric.formatter
      ? metric.formatter(value)
      : decimals > 0
        ? value.toFixed(decimals)
        : Math.round(value).toString();
    return {
      label: metric.label,
      primary,
      suffix: metric.formatter ? undefined : metric.suffix
    };
  });

  return (
    <section className="bg-transparent text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {/* GRID: left status card + right dashboard card */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* LEFT: Security / avatars */}
          <div className="rounded-2xl border border-white/10 bg-transparent p-6 lg:col-span-1">
            <div
              className="relative mb-6 flex h-56 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-transparent p-6"
              style={{
                backgroundImage:
                  'radial-gradient(circle at center, rgba(255,255,255,0.06) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            >
              {/* Avatars + check */}
              <div className="absolute left-1/4 -translate-x-1/2">
                <img
                  src="/images/billetParts/fas-pred-pully.png"
                  alt="Predator Pulley"
                  className="h-30 w-30 rounded-full object-contain"
                />
              </div>
              <div className="absolute right-1/4 translate-x-1/2">
                <img
                  src="/images/billetParts/predator-pulley-fas.png"
                  alt="Predator Pulley"
                  className="h-25 w-25 rounded-full object-contain"
                />
              </div>
            </div>

            <h3 className="text-base/7 font-semibold italic text-white font-borg">
              F.a.S.{' '}
              <span className="text-red-600 font-ethno text-primary italic">Predator Pulley</span>
            </h3>
            <p className="mt-2 max-w-lg text-4xl font-semibold tracking-tight text-pretty font-mono text-white/30 sm:text-3xl">
              PATENT PENDING INNOVATION – PRECISION-ENGINEERED FOR FLAWLESS PERFORMANCE.
            </p>
          </div>

          {/* RIGHT: Dashboard overview card */}
          <div className="rounded-2xl border border-white/10 bg-transparent p-0 lg:col-span-2">
            {/* Tabs */}
            <div className="border-b border-white/10 px-6 pt-4">
              <nav className="-mb-px flex flex-wrap gap-6 text-sm">
                {TABS.map((tab) => {
                  const isActive = tab.key === activeTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`border-b-2 pb-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                        isActive
                          ? 'border-primary text-white'
                          : 'border-transparent text-white/70 hover:text-white/90'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Header line with project */}
            <div className="px-6 pb-6 pt-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-white/90">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${currentTab.summary.statusColor}`}
                ></span>
                <span className="text-lg font-semibold">{currentTab.summary.division}</span>
                <span className="text-white/40">/</span>
                <span className="text-lg font-semibold text-white/80">
                  {currentTab.summary.focus}
                </span>
              </div>
              <p className="mt-2 text-sm text-white/50">{currentTab.summary.description}</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 gap-6 border-t border-white/10 p-6 sm:grid-cols-3">
              {displayMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-white/10 bg-black/20 p-5"
                >
                  <p className="text-sm text-white/60">{metric.label}</p>
                  {metric.suffix ? (
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className="text-5xl font-bold tracking-tight">{metric.primary}</p>
                      <span className="text-sm text-white/60">{metric.suffix}</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-5xl font-bold tracking-tight">{metric.primary}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Footer copy */}
            <div className="border-t border-white/10 p-6">
              <h5 className="text-sm font-semibold text-white/70">{currentTab.footer.eyebrow}</h5>
              <p className="mt-2 text-xl font-semibold">{currentTab.footer.title}</p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                {currentTab.footer.body}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

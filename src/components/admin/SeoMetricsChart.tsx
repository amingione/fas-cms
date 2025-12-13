import { useEffect, useMemo, useState } from 'react';
import type { ApexOptions } from 'apexcharts';
import type { RankingMetricPoint } from '@/lib/seoMetrics';

type Props = {
  data: RankingMetricPoint[];
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export default function SeoMetricsChart({ data }: Props) {
  const [shouldLoadChart, setShouldLoadChart] = useState(false);
  const [ChartComponent, setChartComponent] = useState<
    null | (typeof import('react-apexcharts'))['default']
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  const chartData = useMemo(() => {
    const sorted = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const categories = sorted.map((point) => formatDate(point.date));

    const positionSeries = sorted.map((point) =>
      typeof point.position === 'number' ? point.position : null
    );
    const clickSeries = sorted.map((point) =>
      typeof point.clicks === 'number' ? point.clicks : 0
    );
    const impressionSeries = sorted.map((point) =>
      typeof point.impressions === 'number' ? point.impressions : 0
    );

    const options: ApexOptions = {
      chart: {
        toolbar: { show: false },
        height: 320,
        background: 'transparent'
      },
      stroke: {
        curve: 'smooth',
        width: [3, 2, 2]
      },
      xaxis: {
        categories,
        labels: { style: { colors: '#e5e7eb' } }
      },
      yaxis: [
        {
          title: { text: 'Avg Position' },
          labels: { style: { colors: '#f97316' } },
          reversed: true,
          min: 1
        },
        {
          opposite: true,
          title: { text: 'Clicks' },
          labels: { style: { colors: '#38bdf8' } }
        },
        {
          opposite: true,
          show: false
        }
      ],
      tooltip: {
        shared: true
      },
      theme: { mode: 'dark' },
      legend: {
        labels: { colors: '#f9fafb' }
      }
    };

    const series = [
      { name: 'Avg Position', type: 'line' as const, data: positionSeries },
      { name: 'Clicks', type: 'column' as const, data: clickSeries },
      { name: 'Impressions', type: 'column' as const, data: impressionSeries }
    ];

    return { options, series };
  }, [data]);

  useEffect(() => {
    if (!shouldLoadChart || ChartComponent) return;
    let cancelled = false;
    setIsLoading(true);
    import('react-apexcharts')
      .then((mod) => {
        if (!cancelled) setChartComponent(() => mod.default);
      })
      .catch((err) => {
        if (!cancelled) console.error('[SeoMetricsChart] failed to load chart library', err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ChartComponent, shouldLoadChart]);

  if (!data.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-dark/40 p-6 text-sm text-white/70">
        No SEO ranking metrics were returned from Sanity.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-dark/40 p-4">
      {ChartComponent ? (
        <ChartComponent
          options={chartData.options}
          series={chartData.series}
          height={320}
          type="line"
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-white/70">
            Load the chart to fetch the ApexCharts bundle only when you need it (saves ~150 KB).
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => setShouldLoadChart(true)}
            disabled={isLoading}
          >
            {isLoading ? 'Loading chart…' : 'Load chart'}
          </button>
        </div>
      )}
    </div>
  );
}

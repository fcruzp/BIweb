'use client';

import type { VisualizationConfig } from '@/stores/chat-store';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { DataTable } from './data-table';
import { DRHeatMap } from './dr-map';

const CHART_COLORS = [
  'hsl(160, 60%, 50%)', // emerald
  'hsl(173, 58%, 39%)', // teal
  'hsl(25, 95%, 53%)', // orange
  'hsl(47, 96%, 53%)', // yellow
  'hsl(340, 75%, 55%)', // rose
  'hsl(262, 83%, 58%)', // purple
  'hsl(199, 89%, 48%)', // cyan
  'hsl(142, 71%, 45%)', // green
];

interface ChartRendererProps {
  visualization: VisualizationConfig;
  data: Array<Record<string, unknown>>;
}

export function ChartRenderer({ visualization, data }: ChartRendererProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground">No data to visualize</p>
      </div>
    );
  }

  switch (visualization.chartType) {
    case 'bar':
      return <BarChartRenderer visualization={visualization} data={data} />;
    case 'line':
      return <LineChartRenderer visualization={visualization} data={data} />;
    case 'pie':
      return <PieChartRenderer visualization={visualization} data={data} />;
    case 'scatter':
      return <ScatterChartRenderer visualization={visualization} data={data} />;
    case 'area':
      return <AreaChartRenderer visualization={visualization} data={data} />;
    case 'metric':
      return <MetricRenderer visualization={visualization} data={data} />;
    case 'heatmap':
      return (
        <DRHeatMap
          data={data}
          provinceColumn={visualization.provinceColumn || ''}
          valueColumn={visualization.valueColumn || ''}
          title={visualization.title}
        />
      );
    case 'table':
      return <DataTable data={data} columns={data.length > 0 ? Object.keys(data[0]) : []} />;
    default:
      return <DataTable data={data} columns={data.length > 0 ? Object.keys(data[0]) : []} />;
  }
}

function buildChartConfig(visualization: VisualizationConfig): ChartConfig {
  const config: ChartConfig = {};
  const yAxes = visualization.yAxis || [];
  const allKeys = [...(visualization.xAxis ? [visualization.xAxis] : []), ...yAxes];

  allKeys.forEach((key, i) => {
    config[key] = {
      label: key,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });

  return config;
}

function getYAxes(visualization: VisualizationConfig, data: Array<Record<string, unknown>>): string[] {
  if (visualization.yAxis && visualization.yAxis.length > 0) {
    return visualization.yAxis;
  }
  if (data.length > 0) {
    return Object.keys(data[0]).filter(
      (k) => k !== visualization.xAxis && typeof data[0][k] === 'number'
    );
  }
  return [];
}

function BarChartRenderer({ visualization, data }: ChartRendererProps) {
  const chartConfig = buildChartConfig(visualization);
  const yAxes = getYAxes(visualization, data);

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey={visualization.xAxis || ''}
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {yAxes.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

function LineChartRenderer({ visualization, data }: ChartRendererProps) {
  const chartConfig = buildChartConfig(visualization);
  const yAxes = getYAxes(visualization, data);

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey={visualization.xAxis || ''}
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {yAxes.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

function PieChartRenderer({ visualization, data }: ChartRendererProps) {
  const chartConfig = buildChartConfig(visualization);
  const valueKey =
    visualization.yAxis?.[0] ||
    (data.length > 0 ? Object.keys(data[0]).find((k) => typeof data[0][k] === 'number') : undefined) ||
    '';
  const nameKey =
    visualization.xAxis ||
    (data.length > 0 ? Object.keys(data[0]).find((k) => typeof data[0][k] === 'string') : undefined) ||
    '';

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <PieChart>
        <Pie
          data={data.slice(0, 8)}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }: { name: string; percent: number }) =>
            `${name} (${(percent * 100).toFixed(0)}%)`
          }
          labelLine={false}
        >
          {data.slice(0, 8).map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ChartContainer>
  );
}

function ScatterChartRenderer({ visualization, data }: ChartRendererProps) {
  const chartConfig = buildChartConfig(visualization);
  const xKey =
    visualization.xAxis ||
    (data.length > 0 ? Object.keys(data[0]).find((k) => typeof data[0][k] === 'number') : undefined) ||
    '';
  const yKey =
    visualization.yAxis?.[0] ||
    (data.length > 0
      ? Object.keys(data[0]).filter((k) => typeof data[0][k] === 'number')[1]
      : undefined) ||
    '';

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11 }}
          name={xKey}
          className="text-muted-foreground"
        />
        <YAxis
          dataKey={yKey}
          tick={{ fontSize: 11 }}
          name={yKey}
          className="text-muted-foreground"
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Scatter data={data} fill={CHART_COLORS[0]} />
      </ScatterChart>
    </ChartContainer>
  );
}

function AreaChartRenderer({ visualization, data }: ChartRendererProps) {
  const chartConfig = buildChartConfig(visualization);
  const yAxes = getYAxes(visualization, data);

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis
          dataKey={visualization.xAxis || ''}
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {yAxes.map((key) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={`var(--color-${key})`}
            fill={`var(--color-${key})`}
            fillOpacity={0.2}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

function MetricRenderer({ visualization, data }: ChartRendererProps) {
  const metrics = visualization.metrics || [];

  if (metrics.length === 0 && data.length > 0) {
    // Auto-generate metrics from first row
    const firstRow = data[0];
    const numericKeys = Object.keys(firstRow).filter((k) => typeof firstRow[k] === 'number');
    const autoMetrics = numericKeys.slice(0, 4).map((k) => ({
      label: k,
      value: Number(firstRow[k]),
      format: 'number' as const,
    }));

    if (autoMetrics.length > 0) {
      return <MetricsDisplay metrics={autoMetrics} />;
    }
  }

  return <MetricsDisplay metrics={metrics} />;
}

function MetricsDisplay({
  metrics,
}: {
  metrics: Array<{ label: string; value: number; format?: string }>;
}) {
  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'percent':
        return `${value.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, i) => (
        <div
          key={metric.label}
          className="bg-muted/30 border border-border/50 rounded-lg p-4 text-center"
        >
          <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
          <p
            className="text-2xl font-bold"
            style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
          >
            {formatValue(metric.value, metric.format)}
          </p>
        </div>
      ))}
    </div>
  );
}

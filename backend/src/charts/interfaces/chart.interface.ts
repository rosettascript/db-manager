/**
 * Chart-related interfaces for backend services
 */

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'timeseries';

export type AggregationFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

export type TimeGrouping = 'day' | 'week' | 'month' | 'year' | 'hour' | 'minute';

export interface ChartOptions {
  chartType: ChartType;
  xAxisColumn: string;
  yAxisColumns: string[]; // Multiple for multi-series charts
  aggregation?: AggregationFunction;
  groupBy?: string;
  timeGrouping?: TimeGrouping;
  limit?: number;
  filters?: Array<{
    column: string;
    operator: string;
    value: string;
  }>;
}

export interface ChartDataPoint {
  x: string | number;
  y: number | number[];
  label?: string;
}

export interface ChartDataResponse {
  success: boolean;
  chartType: ChartType;
  data: ChartDataPoint[];
  labels?: string[];
  metadata?: {
    totalRows?: number;
    aggregatedRows?: number;
    xAxisColumn?: string;
    yAxisColumns?: string[];
    aggregation?: AggregationFunction;
  };
  error?: string;
}






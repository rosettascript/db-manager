import { apiClient } from '../client';
import type { ChartDataResponse, ChartOptions } from '../types';

export const chartsService = {
  /**
   * Get chart data for a table
   */
  async getTableChartData(
    connectionId: string,
    schema: string,
    table: string,
    options: ChartOptions,
  ): Promise<ChartDataResponse> {
    const url = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/charts/data`;
    return apiClient.post<ChartDataResponse>(url, options);
  },

  /**
   * Get chart data from query results
   */
  async getQueryChartData(
    connectionId: string,
    queryResults: any[],
    options: ChartOptions,
  ): Promise<ChartDataResponse> {
    const url = `connections/${connectionId}/query/charts/data`;
    return apiClient.post<ChartDataResponse>(url, {
      queryResults,
      options,
    });
  },
};


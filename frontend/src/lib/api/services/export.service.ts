import { API_CONFIG, getApiUrl } from '../config';
import type { TableExportOptions, QueryExportOptions } from '../types';

/**
 * Export Service
 * Handles data export operations (CSV/JSON)
 */
export const exportService = {
  /**
   * Export table data
   * GET /api/connections/:connectionId/db/tables/:schema/:table/export
   */
  async exportTableData(
    connectionId: string,
    schema: string,
    table: string,
    options: TableExportOptions,
  ): Promise<void> {
    const params = new URLSearchParams();
    
    params.append('format', options.format);
    
    if (options.includeHeaders !== undefined) {
      params.append('includeHeaders', options.includeHeaders.toString());
    }
    
    if (options.filters && options.filters.length > 0) {
      params.append('filters', JSON.stringify(options.filters));
    }
    
    if (options.sort) {
      params.append('sort', JSON.stringify(options.sort));
    }
    
    if (options.search) {
      params.append('search', options.search);
    }
    
    if (options.searchColumns && options.searchColumns.length > 0) {
      params.append('searchColumns', options.searchColumns.join(','));
    }
    
    if (options.selectedColumns && options.selectedColumns.length > 0) {
      params.append('selectedColumns', options.selectedColumns.join(','));
    }
    
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }
    
    const endpoint = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/export?${params.toString()}`;
    const url = getApiUrl(endpoint);
    
    // For file downloads, we need to use fetch directly and handle blob response
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `Export failed: ${response.statusText}`);
    }
    
    // Get the blob data
    const blob = await response.blob();
    
    // Determine file extension and MIME type
    const extension = options.format === 'csv' ? 'csv' : 'json';
    const mimeType = options.format === 'csv' 
      ? 'text/csv' 
      : 'application/json';
    
    // Create a download link
    const downloadUrl = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${schema}_${table}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Export query results
   * POST /api/connections/:connectionId/query/export
   */
  async exportQueryResults(
    connectionId: string,
    options: QueryExportOptions,
  ): Promise<void> {
    const endpoint = `connections/${connectionId}/query/export`;
    const url = getApiUrl(endpoint);
    
    // For file downloads, we need to use fetch directly and handle blob response
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query: options.query,
        format: options.format,
        includeHeaders: options.includeHeaders !== false,
        timeout: options.timeout,
        maxRows: options.maxRows,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `Export failed: ${response.statusText}`);
    }
    
    // Get the blob data
    const blob = await response.blob();
    
    // Determine file extension and MIME type
    const extension = options.format === 'csv' ? 'csv' : 'json';
    const mimeType = options.format === 'csv' 
      ? 'text/csv' 
      : 'application/json';
    
    // Create a download link with a timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const downloadUrl = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `query_results_${timestamp}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  /**
   * Export selected rows by row IDs
   * POST /api/connections/:connectionId/db/tables/:schema/:table/export-selected
   */
  async exportSelectedRows(
    connectionId: string,
    schema: string,
    table: string,
    rowIds: string[],
    format: 'csv' | 'json',
    includeHeaders: boolean = true,
    selectedColumns?: string[],
  ): Promise<void> {
    if (!rowIds || rowIds.length === 0) {
      throw new Error('No rows selected for export');
    }

    const endpoint = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/export-selected`;
    const url = getApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        rowIds,
        format,
        includeHeaders,
        selectedColumns,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `Export failed: ${response.statusText}`);
    }
    
    // Get the blob data
    const blob = await response.blob();
    
    // Determine file extension and MIME type
    const extension = format === 'csv' ? 'csv' : 'json';
    const mimeType = format === 'csv' 
      ? 'text/csv' 
      : 'application/json';
    
    // Create a download link with a timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const downloadUrl = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${schema}_${table}_selected_${timestamp}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};


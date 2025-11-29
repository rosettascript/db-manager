/**
 * Data API Service
 * 
 * Handles all table data-related API calls
 */

import apiClient from '../client';
import type {
  TableDataResponse,
  TableCountResponse,
  DeleteRowResponse,
  BatchUpdateResponse,
  BatchUpdateDto,
  FilterRule,
  TableDataQueryParams,
  InsertRowDto,
  InsertRowResponse,
  UpdateRowDto,
  UpdateRowResponse,
} from '../types';

export const dataService = {
  /**
   * Get table data with pagination, filtering, sorting, and search
   * GET /api/connections/:connectionId/db/tables/:schema/:table/data
   */
  async getTableData(
    connectionId: string,
    schema: string,
    table: string,
    params?: TableDataQueryParams,
  ): Promise<TableDataResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.pageSize) {
      queryParams.append('pageSize', params.pageSize.toString());
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.sortColumn) {
      queryParams.append('sortColumn', params.sortColumn);
    }
    if (params?.sortDirection) {
      queryParams.append('sortDirection', params.sortDirection);
    }
    if (params?.columns && params.columns.length > 0) {
      queryParams.append('columns', params.columns.join(','));
    }
    if (params?.filters && params.filters.length > 0) {
      queryParams.append('filters', JSON.stringify(params.filters));
    }

    const queryString = queryParams.toString();
    const url = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/data${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<TableDataResponse>(url);
  },

  /**
   * Get table row count (with optional filtering)
   * GET /api/connections/:connectionId/db/tables/:schema/:table/count
   */
  async getTableCount(
    connectionId: string,
    schema: string,
    table: string,
    params?: {
      search?: string;
      filters?: FilterRule[];
    },
  ): Promise<TableCountResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.filters && params.filters.length > 0) {
      queryParams.append('filters', JSON.stringify(params.filters));
    }

    const queryString = queryParams.toString();
    const url = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/count${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<TableCountResponse>(url);
  },

  /**
   * Delete a single row by primary key
   * DELETE /api/connections/:connectionId/db/tables/:schema/:table/row/:rowId
   */
  async deleteRow(
    connectionId: string,
    schema: string,
    table: string,
    rowId: string,
  ): Promise<DeleteRowResponse> {
    const url = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/row/${encodeURIComponent(rowId)}`;
    
    return apiClient.delete<DeleteRowResponse>(url);
  },

  /**
   * Delete multiple rows by primary keys (batch delete)
   * POST /api/connections/:connectionId/db/tables/:schema/:table/rows/batch-delete
   */
  async deleteRows(
    connectionId: string,
    schema: string,
    table: string,
    rowIds: string[],
  ): Promise<DeleteRowResponse> {
    const url = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/rows/batch-delete`;
    
    return apiClient.post<DeleteRowResponse>(url, { rowIds });
  },

  /**
   * Update multiple rows by primary keys (batch update)
   * POST /api/connections/:connectionId/db/tables/:schema/:table/rows/batch-update
   */
  async updateRows(
    connectionId: string,
    schema: string,
    table: string,
    batchUpdate: BatchUpdateDto,
  ): Promise<BatchUpdateResponse> {
    const url = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/rows/batch-update`;
    
    return apiClient.post<BatchUpdateResponse>(url, batchUpdate);
  },

  /**
   * Insert a new row
   * POST /api/connections/:connectionId/db/tables/:schema/:table/row
   */
  async insertRow(
    connectionId: string,
    schema: string,
    table: string,
    data: Record<string, any>,
  ): Promise<InsertRowResponse> {
    const url = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/row`;
    const dto: InsertRowDto = { data };
    
    return apiClient.post<InsertRowResponse>(url, dto);
  },

  /**
   * Update a single row by primary key
   * PUT /api/connections/:connectionId/db/tables/:schema/:table/row/:rowId
   */
  async updateRow(
    connectionId: string,
    schema: string,
    table: string,
    rowId: string,
    data: Record<string, any>,
  ): Promise<UpdateRowResponse> {
    const url = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/row/${encodeURIComponent(rowId)}`;
    const dto: UpdateRowDto = { data };
    
    return apiClient.put<UpdateRowResponse>(url, dto);
  },
};


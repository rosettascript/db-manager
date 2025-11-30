/**
 * Search API Service
 * 
 * Handles global search and column search API calls
 */

import apiClient from '../client';
import type {
  GlobalSearchResponse,
  ColumnSearchResponse,
  ColumnAutocompleteResult,
} from '../types';

export const searchService = {
  /**
   * Global search across tables, columns, and data
   * GET /api/connections/:connectionId/search/global
   */
  async globalSearch(
    connectionId: string,
    query: string,
    options: {
      searchTables?: boolean;
      searchColumnNames?: boolean;
      searchDataValues?: boolean;
      schemas?: string[];
      limit?: number;
    } = {},
  ): Promise<GlobalSearchResponse> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (options.searchTables !== undefined) {
      params.append('searchTables', options.searchTables.toString());
    }
    if (options.searchColumnNames !== undefined) {
      params.append('searchColumnNames', options.searchColumnNames.toString());
    }
    if (options.searchDataValues !== undefined) {
      params.append('searchDataValues', options.searchDataValues.toString());
    }
    if (options.schemas && options.schemas.length > 0) {
      params.append('schemas', options.schemas.join(','));
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    return apiClient.get<GlobalSearchResponse>(
      `connections/${connectionId}/search/global?${params.toString()}`,
    );
  },

  /**
   * Find tables containing specific columns
   * GET /api/connections/:connectionId/search/columns
   */
  async findTablesWithColumns(
    connectionId: string,
    columns: string[],
    options: {
      schemas?: string[];
      matchAll?: boolean;
    } = {},
  ): Promise<ColumnSearchResponse> {
    const params = new URLSearchParams();
    params.append('columns', columns.join(','));
    
    if (options.schemas && options.schemas.length > 0) {
      params.append('schemas', options.schemas.join(','));
    }
    if (options.matchAll !== undefined) {
      params.append('matchAll', options.matchAll.toString());
    }

    return apiClient.get<ColumnSearchResponse>(
      `connections/${connectionId}/search/columns?${params.toString()}`,
    );
  },

  /**
   * Column name autocomplete
   * GET /api/connections/:connectionId/search/autocomplete
   */
  async columnAutocomplete(
    connectionId: string,
    query: string,
    options: {
      schemas?: string[];
      limit?: number;
    } = {},
  ): Promise<ColumnAutocompleteResult[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (options.schemas && options.schemas.length > 0) {
      params.append('schemas', options.schemas.join(','));
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }

    return apiClient.get<ColumnAutocompleteResult[]>(
      `connections/${connectionId}/search/autocomplete?${params.toString()}`,
    );
  },

  /**
   * Filter columns by data type and other criteria
   * GET /api/connections/:connectionId/search/columns-by-type
   */
  async filterColumnsByType(
    connectionId: string,
    options: {
      dataTypes?: string[];
      schemas?: string[];
      nullable?: boolean;
      isPrimaryKey?: boolean;
      isForeignKey?: boolean;
    } = {},
  ): Promise<ColumnSearchResponse> {
    const params = new URLSearchParams();
    
    if (options.dataTypes && options.dataTypes.length > 0) {
      params.append('dataTypes', options.dataTypes.join(','));
    }
    if (options.schemas && options.schemas.length > 0) {
      params.append('schemas', options.schemas.join(','));
    }
    if (options.nullable !== undefined) {
      params.append('nullable', options.nullable.toString());
    }
    if (options.isPrimaryKey !== undefined) {
      params.append('isPrimaryKey', options.isPrimaryKey.toString());
    }
    if (options.isForeignKey !== undefined) {
      params.append('isForeignKey', options.isForeignKey.toString());
    }

    return apiClient.get<ColumnSearchResponse>(
      `connections/${connectionId}/search/columns-by-type?${params.toString()}`,
    );
  },
};


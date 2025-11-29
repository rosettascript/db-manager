import apiClient from '../client';
import type {
  RowLookupResponse,
  ForeignKeyLookupResponse,
} from '../types';

/**
 * Foreign Keys Service
 * Handles foreign key navigation and row lookup operations
 */
export const foreignKeysService = {
  /**
   * Get a specific row by primary key
   * GET /api/connections/:connectionId/db/tables/:schema/:table/row/:id
   */
  async getRowById(
    connectionId: string,
    schema: string,
    table: string,
    id: string,
  ): Promise<RowLookupResponse> {
    return apiClient.get<RowLookupResponse>(
      `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/row/${encodeURIComponent(id)}`,
    );
  },

  /**
   * Lookup a row by foreign key value
   * GET /api/connections/:connectionId/db/tables/:schema/:table/fk-lookup
   */
  async lookupByForeignKey(
    connectionId: string,
    schema: string,
    table: string,
    options: {
      foreignKeyName: string;
      foreignKeyValue: string | string[];
    },
  ): Promise<ForeignKeyLookupResponse> {
    const params = new URLSearchParams();
    params.append('foreignKeyName', options.foreignKeyName);
    
    // Handle both single value and array
    if (Array.isArray(options.foreignKeyValue)) {
      options.foreignKeyValue.forEach((val) => {
        params.append('foreignKeyValues', val);
      });
    } else {
      params.append('foreignKeyValue', options.foreignKeyValue);
    }

    return apiClient.get<ForeignKeyLookupResponse>(
      `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/fk-lookup?${params.toString()}`,
    );
  },
};


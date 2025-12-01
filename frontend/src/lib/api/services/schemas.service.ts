/**
 * Schemas API Service
 * 
 * Handles all schema and table-related API calls
 */

import apiClient from '../client';
import type {
  Schema,
  Table,
  DatabaseStats,
  DatabaseFunction,
  DatabaseView,
  DatabaseIndex,
  FunctionDetails,
  ViewDetails,
  IndexDetails,
} from '../types';

export const schemasService = {
  /**
   * Get all schemas for a connection
   * GET /api/connections/:connectionId/db/schemas
   */
  async getSchemas(connectionId: string): Promise<Schema[]> {
    return apiClient.get<Schema[]>(`connections/${connectionId}/db/schemas`);
  },

  /**
   * Get all tables for a connection (optionally filtered by schema)
   * GET /api/connections/:connectionId/db/tables?schema=public
   */
  async getTables(connectionId: string, schema?: string): Promise<Table[]> {
    const queryParams = schema ? `?schema=${encodeURIComponent(schema)}` : '';
    return apiClient.get<Table[]>(`connections/${connectionId}/db/tables${queryParams}`);
  },

  /**
   * Get table details
   * GET /api/connections/:connectionId/db/tables/:schema/:table
   */
  async getTableDetails(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<Table> {
    return apiClient.get<Table>(
      `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}`,
    );
  },

  /**
   * Get database statistics
   * GET /api/connections/:connectionId/db/stats
   */
  async getDatabaseStats(connectionId: string): Promise<DatabaseStats> {
    return apiClient.get<DatabaseStats>(`connections/${connectionId}/db/stats`);
  },

  /**
   * Refresh schemas cache
   * POST /api/connections/:connectionId/db/schemas/refresh
   */
  async refreshSchemas(connectionId: string): Promise<{ success: boolean; message?: string }> {
    return apiClient.post<{ success: boolean; message?: string }>(
      `connections/${connectionId}/db/schemas/refresh`,
    );
  },

  /**
   * Check table dependencies
   * GET /api/connections/:connectionId/db/tables/:schema/:table/dependencies
   */
  async checkTableDependencies(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<{
    hasDependencies: boolean;
    dependentTables: Array<{ schema: string; table: string; constraint: string }>;
  }> {
    return apiClient.get<{
      hasDependencies: boolean;
      dependentTables: Array<{ schema: string; table: string; constraint: string }>;
    }>(
      `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/dependencies`,
    );
  },

  /**
   * Delete a table
   * DELETE /api/connections/:connectionId/db/tables/:schema/:table
   */
  async deleteTable(
    connectionId: string,
    schema: string,
    table: string,
    options: { cascade?: boolean; confirmName?: string } = {},
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}`,
      { data: options },
    );
  },

  /**
   * Check schema dependencies
   * GET /api/connections/:connectionId/db/schemas/:schema/dependencies
   */
  async checkSchemaDependencies(
    connectionId: string,
    schema: string,
  ): Promise<{
    hasDependencies: boolean;
    objects: Array<{ type: string; name: string }>;
    dependentSchemas: string[];
  }> {
    return apiClient.get<{
      hasDependencies: boolean;
      objects: Array<{ type: string; name: string }>;
      dependentSchemas: string[];
    }>(
      `connections/${connectionId}/db/schemas/${encodeURIComponent(schema)}/dependencies`,
    );
  },

  /**
   * Delete a schema
   * DELETE /api/connections/:connectionId/db/schemas/:schema
   */
  async deleteSchema(
    connectionId: string,
    schema: string,
    options: { cascade?: boolean; confirmName?: string } = {},
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(
      `connections/${connectionId}/db/schemas/${encodeURIComponent(schema)}`,
      { data: options },
    );
  },

  /**
   * Get all functions for a connection (optionally filtered by schema and category)
   * GET /api/connections/:connectionId/db/functions?schema=public&category=user
   */
  async getFunctions(
    connectionId: string,
    schema?: string,
    category?: 'user' | 'extension' | 'system',
  ): Promise<DatabaseFunction[]> {
    const params = new URLSearchParams();
    if (schema) params.append('schema', schema);
    if (category) params.append('category', category);
    const queryParams = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<DatabaseFunction[]>(`connections/${connectionId}/db/functions${queryParams}`);
  },

  /**
   * Get all views for a connection (optionally filtered by schema)
   * GET /api/connections/:connectionId/db/views?schema=public
   */
  async getViews(connectionId: string, schema?: string): Promise<DatabaseView[]> {
    const queryParams = schema ? `?schema=${encodeURIComponent(schema)}` : '';
    return apiClient.get<DatabaseView[]>(`connections/${connectionId}/db/views${queryParams}`);
  },

  /**
   * Get all indexes for a connection (optionally filtered by schema)
   * GET /api/connections/:connectionId/db/indexes?schema=public
   */
  async getIndexes(connectionId: string, schema?: string): Promise<DatabaseIndex[]> {
    const queryParams = schema ? `?schema=${encodeURIComponent(schema)}` : '';
    return apiClient.get<DatabaseIndex[]>(`connections/${connectionId}/db/indexes${queryParams}`);
  },

  /**
   * Get function details
   * GET /api/connections/:connectionId/db/functions/:schema/:functionName
   */
  async getFunctionDetails(
    connectionId: string,
    schema: string,
    functionName: string,
    parameters?: string,
  ): Promise<FunctionDetails> {
    const params = new URLSearchParams();
    if (parameters) params.append('parameters', parameters);
    const queryParams = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<FunctionDetails>(
      `connections/${connectionId}/db/functions/${encodeURIComponent(schema)}/${encodeURIComponent(functionName)}${queryParams}`,
    );
  },

  /**
   * Get view details
   * GET /api/connections/:connectionId/db/views/:schema/:viewName
   */
  async getViewDetails(
    connectionId: string,
    schema: string,
    viewName: string,
  ): Promise<ViewDetails> {
    return apiClient.get<ViewDetails>(
      `connections/${connectionId}/db/views/${encodeURIComponent(schema)}/${encodeURIComponent(viewName)}`,
    );
  },

  /**
   * Get index details
   * GET /api/connections/:connectionId/db/indexes/:schema/:indexName
   */
  async getIndexDetails(
    connectionId: string,
    schema: string,
    indexName: string,
  ): Promise<IndexDetails> {
    return apiClient.get<IndexDetails>(
      `connections/${connectionId}/db/indexes/${encodeURIComponent(schema)}/${encodeURIComponent(indexName)}`,
    );
  },
};


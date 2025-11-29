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
};


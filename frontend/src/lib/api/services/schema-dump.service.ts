/**
 * Schema Dump API Service
 * 
 * Handles schema dump export API calls
 */

import apiClient from '../client';

export type SchemaDumpFormat = 'sql' | 'txt' | 'json';

export interface SchemaDumpOptions {
  format?: SchemaDumpFormat;
  includeDrops?: boolean;
  includeGrants?: boolean;
  includeComments?: boolean;
}

export interface SchemaDumpResponse {
  connectionId: string;
  sql: string;
  generatedAt: string;
  options: SchemaDumpOptions;
}

export const schemaDumpService = {
  /**
   * Get schema dump for a connection
   * GET /api/schema-dump/:connectionId?format=sql&includeDrops=true&includeGrants=true&includeComments=true
   */
  async getSchemaDump(
    connectionId: string,
    options: SchemaDumpOptions = {},
  ): Promise<string> {
    const {
      format = 'sql',
      includeDrops = true,
      includeGrants = true,
      includeComments = true,
    } = options;

    const queryParams = new URLSearchParams({
      format,
      includeDrops: includeDrops.toString(),
      includeGrants: includeGrants.toString(),
      includeComments: includeComments.toString(),
    });

    // For SQL and TXT formats, we need to get plain text response
    const endpoint = `schema-dump/${connectionId}?${queryParams.toString()}`;
    
    // Use fetch directly to get text response for SQL/TXT formats
    if (format === 'sql' || format === 'txt') {
      const { getApiUrl } = await import('../config');
      const url = getApiUrl(endpoint);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        throw new Error(error.message || 'Failed to generate schema dump');
      }

      return await response.text();
    }

    // For JSON format, use apiClient
    return apiClient.get<SchemaDumpResponse>(endpoint).then((data) => data.sql);
  },

  /**
   * Get DDL for a single table
   * GET /api/schema-dump/:connectionId/:schema/:table?includeDrops=false
   */
  async getTableDDL(
    connectionId: string,
    schema: string,
    table: string,
    options: { includeDrops?: boolean } = {},
  ): Promise<string> {
    const { includeDrops = false } = options;

    const queryParams = new URLSearchParams({
      includeDrops: includeDrops.toString(),
    });

    const endpoint = `schema-dump/${connectionId}/${encodeURIComponent(schema)}/${encodeURIComponent(table)}?${queryParams.toString()}`;
    
    // Use fetch directly to get text response
    const { getApiUrl } = await import('../config');
    const url = getApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.message || 'Failed to generate table DDL');
    }

    return await response.text();
  },
};


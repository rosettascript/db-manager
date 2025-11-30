/**
 * Index Recommendations API Service
 * 
 * Handles all index recommendation-related API calls
 */

import apiClient from '../client';
import type {
  IndexAnalysisResponse,
  IndexRecommendation,
  IndexUsageStat,
  QueryPattern,
} from '../types';

export const indexRecommendationsService = {
  /**
   * Get comprehensive index analysis
   * GET /api/connections/:connectionId/index-recommendations/analysis
   */
  async getIndexAnalysis(
    connectionId: string,
    schema?: string,
  ): Promise<IndexAnalysisResponse> {
    const queryParams = schema ? `?schema=${encodeURIComponent(schema)}` : '';
    return apiClient.get<IndexAnalysisResponse>(
      `connections/${connectionId}/index-recommendations/analysis${queryParams}`,
    );
  },

  /**
   * Get index recommendations
   * GET /api/connections/:connectionId/index-recommendations/suggestions
   */
  async getSuggestions(
    connectionId: string,
    schema?: string,
  ): Promise<IndexRecommendation[]> {
    const queryParams = schema ? `?schema=${encodeURIComponent(schema)}` : '';
    return apiClient.get<IndexRecommendation[]>(
      `connections/${connectionId}/index-recommendations/suggestions${queryParams}`,
    );
  },

  /**
   * Get index usage statistics
   * GET /api/connections/:connectionId/index-recommendations/usage-stats
   */
  async getUsageStats(
    connectionId: string,
    schema?: string,
  ): Promise<IndexUsageStat[]> {
    const queryParams = schema ? `?schema=${encodeURIComponent(schema)}` : '';
    return apiClient.get<IndexUsageStat[]>(
      `connections/${connectionId}/index-recommendations/usage-stats${queryParams}`,
    );
  },

  /**
   * Analyze query patterns
   * GET /api/connections/:connectionId/index-recommendations/query-patterns
   */
  async getQueryPatterns(
    connectionId: string,
    limit?: number,
  ): Promise<QueryPattern[]> {
    const queryParams = limit ? `?limit=${limit}` : '';
    return apiClient.get<QueryPattern[]>(
      `connections/${connectionId}/index-recommendations/query-patterns${queryParams}`,
    );
  },

  /**
   * Generate CREATE INDEX statement
   * GET /api/connections/:connectionId/index-recommendations/generate-statement
   */
  async generateStatement(
    connectionId: string,
    schema: string,
    table: string,
    columns: string[],
    indexName?: string,
    unique?: boolean,
  ): Promise<{ statement: string }> {
    const params = new URLSearchParams();
    params.append('schema', schema);
    params.append('table', table);
    params.append('columns', columns.join(','));
    if (indexName) params.append('indexName', indexName);
    if (unique) params.append('unique', 'true');

    return apiClient.get<{ statement: string }>(
      `connections/${connectionId}/index-recommendations/generate-statement?${params.toString()}`,
    );
  },
};


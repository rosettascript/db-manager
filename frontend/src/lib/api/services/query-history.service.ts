/**
 * Query History API Service
 * 
 * Handles all query history and saved queries API calls
 */

import apiClient from '../client';
import type {
  QueryHistoryItem,
  SavedQuery,
  CreateSavedQueryDto,
  UpdateSavedQueryDto,
} from '../types';

export const queryHistoryService = {
  /**
   * Get query history
   * GET /api/connections/:connectionId/query-history
   */
  async getQueryHistory(
    connectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<QueryHistoryItem[]> {
    const queryParams = new URLSearchParams();
    if (limit) {
      queryParams.append('limit', limit.toString());
    }
    if (offset) {
      queryParams.append('offset', offset.toString());
    }

    const queryString = queryParams.toString();
    const url = `connections/${connectionId}/query-history${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<QueryHistoryItem[]>(url);
  },

  /**
   * Clear query history
   * DELETE /api/connections/:connectionId/query-history
   */
  async clearHistory(connectionId: string): Promise<void> {
    return apiClient.delete(`connections/${connectionId}/query-history`);
  },

  /**
   * Get all saved queries
   * GET /api/connections/:connectionId/queries
   */
  async getSavedQueries(connectionId: string): Promise<SavedQuery[]> {
    return apiClient.get<SavedQuery[]>(`connections/${connectionId}/queries`);
  },

  /**
   * Get a single saved query by ID
   * GET /api/connections/:connectionId/queries/:id
   */
  async getSavedQuery(
    connectionId: string,
    queryId: string,
  ): Promise<SavedQuery> {
    return apiClient.get<SavedQuery>(
      `connections/${connectionId}/queries/${queryId}`,
    );
  },

  /**
   * Save a query
   * POST /api/connections/:connectionId/queries
   */
  async saveQuery(
    connectionId: string,
    dto: CreateSavedQueryDto,
  ): Promise<SavedQuery> {
    return apiClient.post<SavedQuery>(
      `connections/${connectionId}/queries`,
      dto,
    );
  },

  /**
   * Update a saved query
   * PUT /api/connections/:connectionId/queries/:id
   */
  async updateSavedQuery(
    connectionId: string,
    queryId: string,
    dto: UpdateSavedQueryDto,
  ): Promise<SavedQuery> {
    return apiClient.put<SavedQuery>(
      `connections/${connectionId}/queries/${queryId}`,
      dto,
    );
  },

  /**
   * Delete a saved query
   * DELETE /api/connections/:connectionId/queries/:id
   */
  async deleteSavedQuery(
    connectionId: string,
    queryId: string,
  ): Promise<void> {
    return apiClient.delete(`connections/${connectionId}/queries/${queryId}`);
  },
};


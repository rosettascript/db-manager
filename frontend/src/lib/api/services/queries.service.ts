/**
 * Queries API Service
 * 
 * Handles all query execution-related API calls
 */

import apiClient from '../client';
import type {
  ExecuteQueryDto,
  QueryExecutionResponse,
  ExplainQueryDto,
  ExplainPlanResponse,
} from '../types';

export const queriesService = {
  /**
   * Execute a SQL query
   * POST /api/connections/:connectionId/query
   */
  async executeQuery(
    connectionId: string,
    dto: ExecuteQueryDto,
  ): Promise<QueryExecutionResponse> {
    return apiClient.post<QueryExecutionResponse>(
      `connections/${connectionId}/query`,
      dto,
    );
  },

  /**
   * Get explain plan for a query
   * POST /api/connections/:connectionId/query/explain
   */
  async explainQuery(
    connectionId: string,
    dto: ExplainQueryDto,
  ): Promise<ExplainPlanResponse> {
    return apiClient.post<ExplainPlanResponse>(
      `connections/${connectionId}/query/explain`,
      dto,
    );
  },

  /**
   * Cancel a running query
   * POST /api/connections/:connectionId/query/cancel
   */
  async cancelQuery(
    connectionId: string,
    queryId: string,
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `connections/${connectionId}/query/cancel`,
      { queryId },
    );
  },
};


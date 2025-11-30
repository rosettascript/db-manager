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
  QueryValidationResult,
  QueryOptimizationResult,
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

  /**
   * Validate query syntax
   * POST /api/connections/:connectionId/query/validate
   */
  async validateQuery(
    connectionId: string,
    query: string,
  ): Promise<QueryValidationResult> {
    return apiClient.post<QueryValidationResult>(
      `connections/${connectionId}/query/validate`,
      { query },
    );
  },

  /**
   * Optimize query and get recommendations
   * POST /api/connections/:connectionId/query/optimize
   */
  async optimizeQuery(
    connectionId: string,
    query: string,
    analyze: boolean = false,
  ): Promise<QueryOptimizationResult> {
    return apiClient.post<QueryOptimizationResult>(
      `connections/${connectionId}/query/optimize`,
      { query, analyze },
    );
  },
};


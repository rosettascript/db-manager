/**
 * Response interface for query execution
 */
export interface QueryExecutionResponse {
  success: boolean;
  data?: Record<string, any>[];
  columns?: string[];
  rowCount?: number;
  rowsAffected?: number;
  executionTime: number;
  query: string;
  message?: string;
  error?: string;
}

/**
 * Response interface for explain plan
 */
export interface ExplainPlanResponse {
  plan: string;
  planningTime?: number;
  executionTime?: number;
  formattedPlan?: string;
}

/**
 * Request interface for query execution
 */
export interface ExecuteQueryDto {
  query: string;
  maxRows?: number;
  timeout?: number;
}


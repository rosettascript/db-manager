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

/**
 * Query validation result
 */
export interface QueryValidationResult {
  isValid: boolean;
  errors: QueryValidationError[];
  warnings: QueryValidationWarning[];
  suggestions: string[];
}

/**
 * Query validation error
 */
export interface QueryValidationError {
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Query validation warning
 */
export interface QueryValidationWarning {
  message: string;
  suggestion?: string;
}

/**
 * Query optimization result
 */
export interface QueryOptimizationResult {
  originalPlan: ExplainPlanResponse;
  optimizedPlan?: ExplainPlanResponse;
  recommendations: OptimizationRecommendation[];
  performanceMetrics: {
    estimatedCost?: number;
    executionTime?: number;
    rowsExamined?: number;
  };
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  type: 'index' | 'join' | 'filter' | 'sort' | 'other';
  priority: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  estimatedImpact?: string;
}


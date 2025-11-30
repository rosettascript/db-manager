export interface QueryPattern {
  query: string;
  executionCount: number;
  avgExecutionTime: number;
  totalExecutionTime: number;
  tables: string[];
  columns: string[];
  lastExecuted: Date;
}

export interface IndexRecommendation {
  table: string;
  schema: string;
  columns: string[];
  indexType: 'btree' | 'hash' | 'gin' | 'gist' | 'brin';
  estimatedBenefit: 'high' | 'medium' | 'low';
  reason: string;
  createStatement: string;
  estimatedSize?: string;
}

export interface IndexUsageStat {
  schema: string;
  table: string;
  indexName: string;
  indexSize: string;
  indexSizeBytes: number;
  indexScans: number;
  tuplesRead: number;
  tuplesFetched: number;
  isUsed: boolean;
  lastUsed?: Date;
}

export interface IndexAnalysisResponse {
  recommendations: IndexRecommendation[];
  usageStats: IndexUsageStat[];
  queryPatterns: QueryPattern[];
  summary: {
    totalIndexes: number;
    unusedIndexes: number;
    recommendedIndexes: number;
    highPriorityRecommendations: number;
  };
}


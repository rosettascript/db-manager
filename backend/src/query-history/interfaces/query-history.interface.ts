/**
 * Query History Item interface
 */
export interface QueryHistoryItem {
  id: string;
  connectionId: string;
  query: string;
  timestamp: Date;
  executionTime: number;
  rowsAffected?: number;
  rowCount?: number;
  success: boolean;
  error?: string;
}

/**
 * Saved Query interface
 */
export interface SavedQuery {
  id: string;
  connectionId: string;
  name: string;
  query: string;
  createdAt: Date;
  updatedAt?: Date;
  tags?: string[];
  description?: string;
}


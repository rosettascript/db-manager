/**
 * Cache Invalidation Utilities
 * 
 * Helper functions for invalidating React Query caches
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys, getConnectionQueryKeys } from './queryKeys';

/**
 * Invalidate all queries for a specific connection
 */
export function invalidateConnectionCache(
  queryClient: QueryClient,
  connectionId: string,
): void {
  const keys = getConnectionQueryKeys(connectionId);
  
  // Invalidate all connection-related queries
  queryClient.invalidateQueries({ queryKey: keys.schemas });
  queryClient.invalidateQueries({ queryKey: keys.tables });
  queryClient.invalidateQueries({ queryKey: keys.databaseStats });
  queryClient.invalidateQueries({ queryKey: keys.queryHistory });
  queryClient.invalidateQueries({ queryKey: keys.savedQueries });
  
  // Invalidate table data queries (this will invalidate all table data for this connection)
  queryClient.invalidateQueries({ 
    queryKey: ['table-data', connectionId],
    exact: false, // Invalidate all queries that start with this key
  });
  
  // Invalidate diagram queries
  queryClient.invalidateQueries({ 
    queryKey: ['diagram', connectionId],
    exact: false,
  });
}

/**
 * Invalidate all schema and table queries for a connection
 */
export function invalidateSchemaCache(
  queryClient: QueryClient,
  connectionId: string,
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.schemas.all(connectionId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.tables.all(connectionId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.databaseStats.detail(connectionId) });
  
  // Invalidate all table detail queries
  queryClient.invalidateQueries({ 
    queryKey: ['table-details', connectionId],
    exact: false,
  });
}

/**
 * Invalidate table data cache for a specific table
 */
export function invalidateTableDataCache(
  queryClient: QueryClient,
  connectionId: string,
  schema: string,
  table: string,
): void {
  queryClient.invalidateQueries({ 
    queryKey: queryKeys.tables.detail(connectionId, schema, table),
  });
  
  // Invalidate all data queries for this table (different filters/pagination)
  queryClient.invalidateQueries({ 
    queryKey: ['table-data', connectionId, schema, table],
    exact: false,
  });
  
  // Invalidate count queries
  queryClient.invalidateQueries({ 
    queryKey: ['table-count', connectionId, schema, table],
    exact: false,
  });
}

/**
 * Invalidate query history for a connection
 */
export function invalidateQueryHistoryCache(
  queryClient: QueryClient,
  connectionId: string,
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.queryHistory.all(connectionId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.queryHistory.count(connectionId) });
}

/**
 * Invalidate saved queries cache for a connection
 */
export function invalidateSavedQueriesCache(
  queryClient: QueryClient,
  connectionId: string,
): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.savedQueries.all(connectionId) });
}

/**
 * Invalidate ER diagram cache for a connection
 */
export function invalidateDiagramCache(
  queryClient: QueryClient,
  connectionId: string,
): void {
  queryClient.invalidateQueries({ 
    queryKey: ['diagram', connectionId],
    exact: false,
  });
}

/**
 * Clear all caches (use with caution)
 */
export function clearAllCaches(queryClient: QueryClient): void {
  queryClient.clear();
}


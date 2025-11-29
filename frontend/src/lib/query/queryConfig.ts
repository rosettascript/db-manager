/**
 * React Query Configuration
 * 
 * Centralized configuration for cache times, retry logic, and query options
 */

export const queryConfig = {
  // Cache times (in milliseconds)
  cacheTime: {
    // Long-term cache (5 minutes) - for relatively static data
    long: 5 * 60 * 1000, // 5 minutes
    
    // Medium-term cache (2 minutes) - for moderately changing data
    medium: 2 * 60 * 1000, // 2 minutes
    
    // Short-term cache (30 seconds) - for frequently changing data
    short: 30 * 1000, // 30 seconds
    
    // Very short cache (10 seconds) - for real-time data
    veryShort: 10 * 1000, // 10 seconds
  },

  // Stale times (in milliseconds) - how long data is considered fresh
  staleTime: {
    // Very stale (10 minutes) - for static data like schemas/tables
    veryStale: 10 * 60 * 1000, // 10 minutes
    
    // Stale (5 minutes) - for metadata
    stale: 5 * 60 * 1000, // 5 minutes
    
    // Medium stale (2 minutes) - for table details
    mediumStale: 2 * 60 * 1000, // 2 minutes
    
    // Fresh (30 seconds) - for table data
    fresh: 30 * 1000, // 30 seconds
    
    // Very fresh (10 seconds) - for real-time data
    veryFresh: 10 * 1000, // 10 seconds
  },

  // Retry configuration
  retry: {
    // Retry failed queries
    queries: {
      attempts: 1, // Retry once
      delay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    
    // Don't retry mutations by default
    mutations: {
      attempts: 0,
    },
  },

  // Refetch configuration
  refetch: {
    onWindowFocus: false, // Don't refetch when window regains focus
    onReconnect: true, // Refetch when network reconnects
    onMount: false, // Don't refetch on mount if data exists
  },
};

/**
 * Get default query options for different data types
 */
export function getDefaultQueryOptions(type: 'connections' | 'schemas' | 'tables' | 'table-data' | 'query' | 'diagram') {
  switch (type) {
    case 'connections':
      return {
        staleTime: queryConfig.staleTime.fresh,
        gcTime: queryConfig.cacheTime.medium,
        retry: queryConfig.retry.queries.attempts,
        refetchOnWindowFocus: queryConfig.refetch.onWindowFocus,
        refetchOnReconnect: queryConfig.refetch.onReconnect,
      };
    
    case 'schemas':
    case 'tables':
      return {
        staleTime: queryConfig.staleTime.stale,
        gcTime: queryConfig.cacheTime.long,
        retry: queryConfig.retry.queries.attempts,
        refetchOnWindowFocus: queryConfig.refetch.onWindowFocus,
        refetchOnReconnect: queryConfig.refetch.onReconnect,
      };
    
    case 'table-data':
      return {
        staleTime: queryConfig.staleTime.fresh,
        gcTime: queryConfig.cacheTime.medium,
        retry: queryConfig.retry.queries.attempts,
        refetchOnWindowFocus: queryConfig.refetch.onWindowFocus,
        refetchOnReconnect: queryConfig.refetch.onReconnect,
        placeholderData: (previousData: any) => previousData, // Keep previous data during refetch
      };
    
    case 'query':
      return {
        staleTime: 0, // Always consider query results stale
        gcTime: queryConfig.cacheTime.short,
        retry: false, // Don't retry query execution
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      };
    
    case 'diagram':
      return {
        staleTime: queryConfig.staleTime.mediumStale,
        gcTime: queryConfig.cacheTime.medium,
        retry: queryConfig.retry.queries.attempts,
        refetchOnWindowFocus: queryConfig.refetch.onWindowFocus,
        refetchOnReconnect: queryConfig.refetch.onReconnect,
      };
    
    default:
      return {
        staleTime: queryConfig.staleTime.fresh,
        gcTime: queryConfig.cacheTime.medium,
        retry: queryConfig.retry.queries.attempts,
        refetchOnWindowFocus: queryConfig.refetch.onWindowFocus,
        refetchOnReconnect: queryConfig.refetch.onReconnect,
      };
  }
}


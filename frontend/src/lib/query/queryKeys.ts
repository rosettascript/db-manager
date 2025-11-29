/**
 * Query Key Factory
 * 
 * Centralized query key management for consistent caching and invalidation
 */

export const queryKeys = {
  // Connections
  connections: {
    all: ['connections'] as const,
    detail: (id: string) => ['connections', id] as const,
    status: (id: string) => ['connection-status', id] as const,
  },

  // Schemas & Metadata
  schemas: {
    all: (connectionId?: string) => 
      connectionId ? ['schemas', connectionId] as const : ['schemas'] as const,
  },

  tables: {
    all: (connectionId?: string) => 
      connectionId ? ['tables', connectionId] as const : ['tables'] as const,
    bySchema: (connectionId: string, schema: string) => 
      ['tables', connectionId, schema] as const,
    detail: (connectionId: string, schema: string, table: string) => 
      ['table-details', connectionId, schema, table] as const,
    data: (
      connectionId: string,
      schema: string,
      table: string,
      page: number = 1,
      pageSize: number = 100,
      search?: string,
      sortColumn?: string,
      sortDirection?: string,
      columns?: string[],
      filters?: any[],
    ) => [
      'table-data',
      connectionId,
      schema,
      table,
      page,
      pageSize,
      search || '',
      sortColumn || '',
      sortDirection || '',
      columns ? [...columns].sort().join(',') : '',
      filters ? JSON.stringify(filters) : '',
    ] as const,
    count: (connectionId: string, schema: string, table: string, search?: string, filters?: any[]) =>
      ['table-count', connectionId, schema, table, search || '', filters ? JSON.stringify(filters) : ''] as const,
  },

  // Database Stats
  databaseStats: {
    detail: (connectionId: string) => 
      ['database-stats', connectionId] as const,
  },

  // Query Execution
  queries: {
    execution: (connectionId: string, query: string) =>
      ['query-execution', connectionId, query] as const,
    explain: (connectionId: string, query: string) =>
      ['explain-plan', connectionId, query] as const,
  },

  // Query History
  queryHistory: {
    all: (connectionId: string) => 
      ['query-history', connectionId] as const,
    count: (connectionId: string) =>
      ['query-history-count', connectionId] as const,
  },

  // Saved Queries
  savedQueries: {
    all: (connectionId: string) => 
      ['saved-queries', connectionId] as const,
    detail: (connectionId: string, queryId: string) =>
      ['saved-queries', connectionId, queryId] as const,
  },

  // ER Diagram
  diagram: {
    detail: (connectionId: string, schemas?: string[], showIsolatedTables?: boolean) =>
      ['diagram', connectionId, schemas ? [...schemas].sort().join(',') : '', showIsolatedTables] as const,
    relationships: (connectionId: string, schema: string, table: string) =>
      ['relationships', connectionId, schema, table] as const,
  },

  // Foreign Keys
  foreignKeys: {
    row: (connectionId: string, schema: string, table: string, id: string) =>
      ['row-lookup', connectionId, schema, table, id] as const,
    lookup: (connectionId: string, schema: string, table: string, foreignKeyName: string, foreignKeyValue: string) =>
      ['fk-lookup', connectionId, schema, table, foreignKeyName, foreignKeyValue] as const,
  },
};

/**
 * Helper function to invalidate all queries for a connection
 */
export function getConnectionQueryKeys(connectionId: string) {
  return {
    schemas: queryKeys.schemas.all(connectionId),
    tables: queryKeys.tables.all(connectionId),
    databaseStats: queryKeys.databaseStats.detail(connectionId),
    queryHistory: queryKeys.queryHistory.all(connectionId),
    savedQueries: queryKeys.savedQueries.all(connectionId),
  };
}


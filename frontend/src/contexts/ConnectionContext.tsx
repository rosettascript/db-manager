/**
 * Connection Context
 * 
 * Provides global access to the active database connection
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Connection } from '@/lib/api/types';
import { connectionsService } from '@/lib/api/services/connections.service';
import { queryKeys, getConnectionQueryKeys } from '@/lib/query/queryKeys';
import { queryConfig, getDefaultQueryOptions } from '@/lib/query/queryConfig';

interface ConnectionContextType {
  activeConnection: Connection | null;
  setActiveConnection: (connection: Connection | null) => void;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  connections: Connection[];
  refreshConnections: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: ReactNode;
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ children }) => {
  
  const queryClient = useQueryClient();
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(() => {
    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activeConnectionId');
      if (saved) return saved;
    }
    return null;
  });

  // Fetch all connections with optimized query options
  const connectionsOptions = getDefaultQueryOptions('connections');
  
  
  const {
    data: connections = [],
    isLoading,
    isError,
    error,
    refetch: refreshConnections,
  } = useQuery<Connection[]>({
    queryKey: queryKeys.connections.all,
    queryFn: async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConnectionContext.tsx:60',message:'Fetching connections',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion
      try {
        const result = await connectionsService.list();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConnectionContext.tsx:66',message:'Connections fetched successfully',data:{count:result?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H8'})}).catch(()=>{});
        // #endregion
        return result;
      } catch (err: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33f2f112-059c-4e50-a06d-531fbaf44b2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ConnectionContext.tsx:72',message:'Failed to fetch connections',data:{error:err?.message,stack:err?.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H8'})}).catch(()=>{});
        // #endregion
        throw err;
      }
    },
    ...connectionsOptions,
  });

  // Find active connection from the list (memoized)
  const activeConnection = useMemo(
    () => connections.find(c => c.id === activeConnectionId) || null,
    [connections, activeConnectionId]
  );

  // Auto-select first connected connection if no active connection
  useEffect(() => {
    if (!activeConnection && connections.length > 0 && !activeConnectionId) {
      const connected = connections.find(c => c.status === 'connected');
      if (connected) {
        setActiveConnectionId(connected.id);
      } else if (connections[0]) {
        // Fallback to first connection
        setActiveConnectionId(connections[0].id);
      }
    }
  }, [connections, activeConnection, activeConnectionId]);

  // Update active connection with cache invalidation
  const setActiveConnection = useCallback((connection: Connection | null) => {
    const previousConnectionId = activeConnectionId;
    
    if (connection) {
      setActiveConnectionId(connection.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeConnectionId', connection.id);
      }
      
      // If switching connections, invalidate previous connection's queries
      if (previousConnectionId && previousConnectionId !== connection.id) {
        const previousKeys = getConnectionQueryKeys(previousConnectionId);
        queryClient.invalidateQueries({ queryKey: previousKeys.schemas });
        queryClient.invalidateQueries({ queryKey: previousKeys.tables });
        queryClient.invalidateQueries({ queryKey: previousKeys.databaseStats });
      }
    } else {
      setActiveConnectionId(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('activeConnectionId');
      }
      
      // Invalidate all connection-related queries
      if (previousConnectionId) {
        const previousKeys = getConnectionQueryKeys(previousConnectionId);
        queryClient.invalidateQueries({ queryKey: previousKeys.schemas });
        queryClient.invalidateQueries({ queryKey: previousKeys.tables });
        queryClient.invalidateQueries({ queryKey: previousKeys.databaseStats });
      }
    }
  }, [activeConnectionId, queryClient]);

  // Save to localStorage when activeConnectionId changes
  useEffect(() => {
    if (activeConnectionId && typeof window !== 'undefined') {
      localStorage.setItem('activeConnectionId', activeConnectionId);
    } else if (!activeConnectionId && typeof window !== 'undefined') {
      localStorage.removeItem('activeConnectionId');
    }
  }, [activeConnectionId]);

  // Enhanced refresh function that also clears cache for active connection
  const refreshConnectionsWithCacheClear = useCallback(() => {
    refreshConnections();
    if (activeConnectionId) {
      const keys = getConnectionQueryKeys(activeConnectionId);
      queryClient.invalidateQueries({ queryKey: keys.schemas });
      queryClient.invalidateQueries({ queryKey: keys.tables });
      queryClient.invalidateQueries({ queryKey: keys.databaseStats });
    }
  }, [refreshConnections, activeConnectionId, queryClient]);

  const value: ConnectionContextType = {
    activeConnection,
    setActiveConnection,
    isLoading,
    isError,
    error: error as Error | null,
    connections,
    refreshConnections: refreshConnectionsWithCacheClear,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};


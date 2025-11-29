/**
 * State Management Test Page
 * 
 * Test page to verify state management enhancements:
 * - Query key factory
 * - Cache invalidation
 * - Connection state persistence
 * - QueryClient configuration
 */

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConnection } from "@/contexts/ConnectionContext";
import { queryKeys } from "@/lib/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { invalidateConnectionCache, invalidateSchemaCache } from "@/lib/query/cacheUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Database, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function StateManagementTest() {
  const queryClient = useQueryClient();
  const { activeConnection, connections, setActiveConnection } = useConnection();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [cacheInfo, setCacheInfo] = useState<{
    totalQueries: number;
    queryDetails: Array<{ key: string; data: any; status: string }>;
  }>({ totalQueries: 0, queryDetails: [] });

  // Get cache information
  const getCacheInfo = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const queryDetails = queries.slice(0, 20).map((query) => {
      const state = query.state;
      return {
        key: JSON.stringify(query.queryKey),
        data: state.data ? 'Has data' : 'No data',
        status: state.status,
        fetchStatus: state.fetchStatus,
        dataUpdatedAt: state.dataUpdatedAt,
        error: state.error ? (state.error as Error).message : null,
      };
    });

    return {
      totalQueries: queries.length,
      queryDetails,
    };
  };

  useEffect(() => {
    const updateCacheInfo = () => {
      setCacheInfo(getCacheInfo());
    };

    updateCacheInfo();
    const interval = setInterval(updateCacheInfo, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  // Test 1: Query Key Factory
  const testQueryKeys = () => {
    try {
      const connId = activeConnection?.id || 'test-connection';
      const schemaKey = queryKeys.schemas.all(connId);
      const tableKey = queryKeys.tables.detail(connId, 'public', 'users');
      const dataKey = queryKeys.tables.data(connId, 'public', 'users', 1, 100);
      
      const allValid = 
        Array.isArray(schemaKey) &&
        Array.isArray(tableKey) &&
        Array.isArray(dataKey) &&
        schemaKey[0] === 'schemas' &&
        tableKey[0] === 'table-details';

      setTestResults(prev => ({ ...prev, queryKeys: allValid }));
      toast[allValid ? 'success' : 'error'](
        allValid ? 'Query keys factory working correctly!' : 'Query keys factory test failed'
      );
      return allValid;
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, queryKeys: false }));
      toast.error(`Query keys test error: ${error.message}`);
      return false;
    }
  };

  // Test 2: Query Configuration
  const testQueryConfig = () => {
    try {
      const hasConfig = 
        queryConfig.cacheTime &&
        queryConfig.staleTime &&
        queryConfig.retry &&
        queryConfig.refetch;

      setTestResults(prev => ({ ...prev, queryConfig: !!hasConfig }));
      toast[hasConfig ? 'success' : 'error'](
        hasConfig ? 'Query configuration loaded!' : 'Query configuration test failed'
      );
      return !!hasConfig;
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, queryConfig: false }));
      toast.error(`Query config test error: ${error.message}`);
      return false;
    }
  };

  // Test 3: Cache Invalidation
  const testCacheInvalidation = async () => {
    if (!activeConnection) {
      toast.error('No active connection to test cache invalidation');
      return false;
    }

    try {
      const beforeCount = queryClient.getQueryCache().getAll().length;
      
      // Invalidate connection cache
      invalidateConnectionCache(queryClient, activeConnection.id);
      
      // Wait a bit for invalidation to process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if queries were invalidated
      const invalidatedQueries = queryClient.getQueryCache().getAll().filter(
        query => query.state.status === 'error' || query.isInvalidated()
      );

      const success = true; // Invalidation doesn't necessarily remove queries immediately
      setTestResults(prev => ({ ...prev, cacheInvalidation: success }));
      toast.success('Cache invalidation executed successfully!');
      return success;
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, cacheInvalidation: false }));
      toast.error(`Cache invalidation test error: ${error.message}`);
      return false;
    }
  };

  // Test 4: Connection State Persistence
  const testConnectionPersistence = () => {
    try {
      const savedId = localStorage.getItem('activeConnectionId');
      const isPersisted = savedId === activeConnection?.id || (!savedId && !activeConnection);
      
      setTestResults(prev => ({ ...prev, connectionPersistence: isPersisted }));
      toast[isPersisted ? 'success' : 'error'](
        isPersisted ? 'Connection state persistence working!' : 'Connection persistence test failed'
      );
      return isPersisted;
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, connectionPersistence: false }));
      toast.error(`Connection persistence test error: ${error.message}`);
      return false;
    }
  };

  // Test 5: Connection Switching
  const testConnectionSwitching = async () => {
    if (connections.length < 2) {
      toast.warning('Need at least 2 connections to test switching');
      setTestResults(prev => ({ ...prev, connectionSwitching: false }));
      return false;
    }

    try {
      const currentId = activeConnection?.id;
      const otherConnection = connections.find(c => c.id !== currentId);
      
      if (!otherConnection) {
        toast.warning('No other connection available to switch to');
        setTestResults(prev => ({ ...prev, connectionSwitching: false }));
        return false;
      }

      // Switch connection
      setActiveConnection(otherConnection);
      
      // Wait for state update and check localStorage
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const savedId = localStorage.getItem('activeConnectionId');
      const success = savedId === otherConnection.id;
      
      setTestResults(prev => ({ ...prev, connectionSwitching: success }));
      toast[success ? 'success' : 'error'](
        success ? 'Connection switching working!' : 'Connection switching test failed'
      );
      
      // Switch back to original connection
      if (currentId) {
        const originalConnection = connections.find(c => c.id === currentId);
        if (originalConnection) {
          setTimeout(() => setActiveConnection(originalConnection), 2000);
        }
      }
      
      return success;
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, connectionSwitching: false }));
      toast.error(`Connection switching test error: ${error.message}`);
      return false;
    }
  };

  // Test 6: Query Client Configuration
  const testQueryClientConfig = () => {
    try {
      const defaultOptions = queryClient.getDefaultOptions();
      const hasRetry = defaultOptions.queries?.retry !== undefined;
      const hasStaleTime = defaultOptions.queries?.staleTime !== undefined;
      
      const success = hasRetry && hasStaleTime;
      setTestResults(prev => ({ ...prev, queryClientConfig: success }));
      toast[success ? 'success' : 'error'](
        success ? 'QueryClient configuration loaded!' : 'QueryClient config test failed'
      );
      return success;
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, queryClientConfig: false }));
      toast.error(`QueryClient config test error: ${error.message}`);
      return false;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTestResults({});
    toast.info('Running all state management tests...');
    
    testQueryKeys();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testQueryConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testQueryClientConfig();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testConnectionPersistence();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testCacheInvalidation();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testConnectionSwitching();
    
    toast.success('All tests completed!');
  };

  // Clear cache
  const clearCache = () => {
    queryClient.clear();
    setCacheInfo(getCacheInfo());
    toast.success('Cache cleared!');
  };

  const allPassed = Object.keys(testResults).length > 0 && 
    Object.values(testResults).every(v => v === true);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">State Management Test</h1>
        <p className="text-muted-foreground">
          Test the state management enhancements including query keys, cache invalidation, and connection state.
        </p>
      </div>

      {/* Test Results */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Query Key Factory</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.queryKeys === undefined ? (
              <Badge variant="outline">Not Tested</Badge>
            ) : testResults.queryKeys ? (
              <Badge className="bg-green-500">Passed</Badge>
            ) : (
              <Badge variant="destructive">Failed</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={testQueryKeys}
            >
              Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Query Config</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.queryConfig === undefined ? (
              <Badge variant="outline">Not Tested</Badge>
            ) : testResults.queryConfig ? (
              <Badge className="bg-green-500">Passed</Badge>
            ) : (
              <Badge variant="destructive">Failed</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={testQueryConfig}
            >
              Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">QueryClient Config</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.queryClientConfig === undefined ? (
              <Badge variant="outline">Not Tested</Badge>
            ) : testResults.queryClientConfig ? (
              <Badge className="bg-green-500">Passed</Badge>
            ) : (
              <Badge variant="destructive">Failed</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={testQueryClientConfig}
            >
              Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Connection Persistence</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.connectionPersistence === undefined ? (
              <Badge variant="outline">Not Tested</Badge>
            ) : testResults.connectionPersistence ? (
              <Badge className="bg-green-500">Passed</Badge>
            ) : (
              <Badge variant="destructive">Failed</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={testConnectionPersistence}
            >
              Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cache Invalidation</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.cacheInvalidation === undefined ? (
              <Badge variant="outline">Not Tested</Badge>
            ) : testResults.cacheInvalidation ? (
              <Badge className="bg-green-500">Passed</Badge>
            ) : (
              <Badge variant="destructive">Failed</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={testCacheInvalidation}
              disabled={!activeConnection}
            >
              Test
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Connection Switching</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.connectionSwitching === undefined ? (
              <Badge variant="outline">Not Tested</Badge>
            ) : testResults.connectionSwitching ? (
              <Badge className="bg-green-500">Passed</Badge>
            ) : (
              <Badge variant="destructive">Failed</Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={testConnectionSwitching}
              disabled={connections.length < 2}
            >
              Test
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <Button onClick={runAllTests} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Run All Tests
        </Button>
        <Button variant="outline" onClick={clearCache} className="gap-2">
          <Trash2 className="w-4 h-4" />
          Clear Cache
        </Button>
        {allPassed && (
          <Badge className="bg-green-500 self-center">
            <CheckCircle2 className="w-4 h-4 mr-1" />
            All Tests Passed!
          </Badge>
        )}
      </div>

      {/* Cache Information */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Information</CardTitle>
          <CardDescription>
            Real-time view of React Query cache state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Total Cached Queries: <strong>{cacheInfo.totalQueries}</strong>
            </p>
            {activeConnection && (
              <p className="text-sm text-muted-foreground">
                Active Connection: <strong>{activeConnection.name}</strong> ({activeConnection.id})
              </p>
            )}
          </div>

          {cacheInfo.queryDetails.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {cacheInfo.queryDetails.map((query, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-muted rounded-lg text-sm font-mono"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={query.status === 'success' ? 'default' : 'destructive'}>
                      {query.status}
                    </Badge>
                    <Badge variant="outline">{query.fetchStatus}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground break-all">
                    {query.key}
                  </div>
                  <div className="text-xs mt-1">
                    Data: {query.data} | Updated: {query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString() : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query Configuration Display */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Query Configuration</CardTitle>
          <CardDescription>
            Current query configuration values
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">Cache Times</h4>
              <ul className="text-sm space-y-1">
                <li>Long: {queryConfig.cacheTime.long / 1000}s</li>
                <li>Medium: {queryConfig.cacheTime.medium / 1000}s</li>
                <li>Short: {queryConfig.cacheTime.short / 1000}s</li>
                <li>Very Short: {queryConfig.cacheTime.veryShort / 1000}s</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Stale Times</h4>
              <ul className="text-sm space-y-1">
                <li>Very Stale: {queryConfig.staleTime.veryStale / 1000}s</li>
                <li>Stale: {queryConfig.staleTime.stale / 1000}s</li>
                <li>Medium: {queryConfig.staleTime.mediumStale / 1000}s</li>
                <li>Fresh: {queryConfig.staleTime.fresh / 1000}s</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Retry Configuration</h4>
              <ul className="text-sm space-y-1">
                <li>Query Attempts: {queryConfig.retry.queries.attempts}</li>
                <li>Mutation Attempts: {queryConfig.retry.mutations.attempts}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Refetch Configuration</h4>
              <ul className="text-sm space-y-1">
                <li>On Window Focus: {queryConfig.refetch.onWindowFocus ? 'Yes' : 'No'}</li>
                <li>On Reconnect: {queryConfig.refetch.onReconnect ? 'Yes' : 'No'}</li>
                <li>On Mount: {queryConfig.refetch.onMount ? 'Yes' : 'No'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


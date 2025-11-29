# State Management Testing Guide

## Overview

This guide helps you test the state management enhancements implemented in Phase 12.10, including:
- Query key factory
- Query configuration
- Cache invalidation
- Connection state persistence
- QueryClient configuration

## Test Page

Navigate to: **http://localhost:8080/state-test**

## Manual Testing Steps

### 1. Query Key Factory Test

**What it tests:** Verifies that the query key factory generates consistent, structured query keys.

**Steps:**
1. Click the "Test" button on the "Query Key Factory" card
2. Expected: ✅ "Query keys factory working correctly!" toast notification
3. Card should show green "Passed" badge

**Verification:**
- Query keys are arrays
- Keys follow the expected structure
- Keys are consistent across the application

---

### 2. Query Configuration Test

**What it tests:** Verifies that query configuration is properly loaded.

**Steps:**
1. Click the "Test" button on the "Query Config" card
2. Expected: ✅ "Query configuration loaded!" toast notification
3. Card should show green "Passed" badge

**Verification:**
- Configuration object exists
- Cache times are defined
- Stale times are defined
- Retry configuration is present

---

### 3. QueryClient Configuration Test

**What it tests:** Verifies that QueryClient is configured with our enhanced settings.

**Steps:**
1. Click the "Test" button on the "QueryClient Config" card
2. Expected: ✅ "QueryClient configuration loaded!" toast notification
3. Card should show green "Passed" badge

**Verification:**
- Default options include retry configuration
- Default options include staleTime
- Configuration matches our queryConfig

---

### 4. Connection State Persistence Test

**What it tests:** Verifies that the active connection ID is persisted in localStorage.

**Steps:**
1. Ensure you have an active connection selected
2. Click the "Test" button on the "Connection Persistence" card
3. Expected: ✅ "Connection state persistence working!" toast notification
4. Card should show green "Passed" badge

**Additional verification:**
- Open browser DevTools (F12)
- Go to Application > Local Storage
- Check for `activeConnectionId` key
- Refresh the page - active connection should persist

---

### 5. Cache Invalidation Test

**What it tests:** Verifies that cache invalidation utilities work correctly.

**Prerequisites:** Must have an active connection

**Steps:**
1. Ensure you have an active connection selected
2. Navigate to Schema Browser and load some schemas/tables (to populate cache)
3. Go back to `/state-test`
4. Observe the "Cache Information" section - should show cached queries
5. Click the "Test" button on the "Cache Invalidation" card
6. Expected: ✅ "Cache invalidation executed successfully!" toast notification
7. Card should show green "Passed" badge

**Verification:**
- Cache invalidation function executes without errors
- Queries can be invalidated programmatically

---

### 6. Connection Switching Test

**What it tests:** Verifies that switching connections properly invalidates previous connection's cache.

**Prerequisites:** Must have at least 2 connections

**Steps:**
1. Ensure you have at least 2 connections configured
2. Note the current active connection
3. Click the "Test" button on the "Connection Switching" card
4. Expected: Connection should switch to another connection
5. Expected: ✅ "Connection switching working!" toast notification
6. Card should show green "Passed" badge

**Verification:**
- Active connection changes
- Previous connection's cache is invalidated
- New connection's queries can be fetched fresh

---

### 7. Run All Tests

**What it tests:** Runs all individual tests sequentially.

**Steps:**
1. Click the "Run All Tests" button
2. Wait for all tests to complete
3. All cards should show green "Passed" badges
4. Expected: ✅ "All tests completed!" and "All Tests Passed!" badge

---

### 8. Cache Information Display

**What it tests:** Real-time view of React Query cache state.

**Steps:**
1. Navigate to different pages (Schema Browser, Table Viewer, etc.)
2. Return to `/state-test`
3. Observe the "Cache Information" section
4. Should show:
   - Total number of cached queries
   - Active connection name and ID
   - List of cached queries with their status

**Verification:**
- Cache updates in real-time (updates every 2 seconds)
- Shows query keys, status, and data state
- Displays last update time

---

### 9. Query Configuration Display

**What it tests:** Displays the current query configuration values.

**Steps:**
1. Scroll down to "Query Configuration" card
2. Review the configuration values:
   - Cache Times (Long, Medium, Short, Very Short)
   - Stale Times (Very Stale, Stale, Medium, Fresh)
   - Retry Configuration (Query Attempts, Mutation Attempts)
   - Refetch Configuration (On Window Focus, On Reconnect, On Mount)

**Verification:**
- All values are displayed correctly
- Values match the configuration in `queryConfig.ts`

---

### 10. Clear Cache Test

**What it tests:** Verifies that the cache can be cleared programmatically.

**Steps:**
1. Navigate to different pages to populate cache
2. Return to `/state-test`
3. Observe cached queries in "Cache Information"
4. Click "Clear Cache" button
5. Expected: ✅ "Cache cleared!" toast notification
6. "Cache Information" should show 0 total queries (or refresh to see)

**Verification:**
- Cache is completely cleared
- All queries are removed from cache

---

## Integration Testing

### Test Cache Persistence Across Navigation

1. Navigate to Schema Browser (`/`)
2. Let schemas and tables load
3. Navigate to a table (`/table/public.users`)
4. Let table data load
5. Go to `/state-test`
6. Verify queries are cached in "Cache Information"
7. Navigate back to Schema Browser
8. Data should load instantly from cache (no loading spinner)

### Test Connection Switch Cache Invalidation

1. Select Connection A
2. Navigate to Schema Browser - schemas load
3. Switch to Connection B
4. Navigate to Schema Browser - should fetch fresh schemas (not from cache)
5. Go to `/state-test`
6. Verify Connection A's queries are not in cache (or marked invalid)

### Test Cache Times

1. Navigate to Schema Browser
2. Let schemas load
3. Wait for stale time to expire (check queryConfig for stale times)
4. Return to Schema Browser
5. Should refetch data if stale time has passed

---

## Expected Results

All tests should pass with green badges. The test page provides:

✅ **Query Key Factory** - Pass  
✅ **Query Config** - Pass  
✅ **QueryClient Config** - Pass  
✅ **Connection Persistence** - Pass  
✅ **Cache Invalidation** - Pass  
✅ **Connection Switching** - Pass (if 2+ connections)

---

## Troubleshooting

### Test Fails: Query Key Factory
- **Issue:** Query keys not generating correctly
- **Check:** `lib/query/queryKeys.ts` file exists and exports correctly
- **Fix:** Verify imports in test page

### Test Fails: Connection Persistence
- **Issue:** Connection not persisting in localStorage
- **Check:** Browser localStorage in DevTools
- **Fix:** Check ConnectionContext implementation

### Test Fails: Cache Invalidation
- **Issue:** Cache not invalidating
- **Check:** QueryClient is properly configured
- **Fix:** Verify cacheUtils functions are called correctly

### Cache Not Showing Queries
- **Issue:** No queries in cache information
- **Reason:** Need to navigate to pages that fetch data first
- **Fix:** Navigate to Schema Browser or Table Viewer first

---

## Browser Console Testing

You can also test in the browser console:

```javascript
// Check query keys
import { queryKeys } from '@/lib/query/queryKeys';
console.log(queryKeys.connections.all);
console.log(queryKeys.schemas.all('conn_123'));

// Check cache
const queryClient = window.__REACT_QUERY_CLIENT__;
const cache = queryClient.getQueryCache();
console.log('Total queries:', cache.getAll().length);
console.log('Queries:', cache.getAll().map(q => q.queryKey));

// Clear cache
queryClient.clear();
```

---

## Success Criteria

✅ All individual tests pass  
✅ Cache information displays correctly  
✅ Connection switching works  
✅ Cache invalidation functions correctly  
✅ Configuration values display correctly  
✅ Cache clears successfully  

---

**Happy Testing!** 🧪


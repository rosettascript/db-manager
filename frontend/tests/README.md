# State Management Test Suite

Automated tests for state management utilities and configuration.

## Test Scripts

### 1. Automated Shell Script

**Run from project root:**
```bash
./TEST_STATE_MANAGEMENT_AUTO.sh
```

This script validates:
- ✅ File existence checks
- ✅ Export validation
- ✅ Structure validation
- ✅ Integration checks
- ✅ Configuration value validation

**Test Results:**
- ✅ Query Keys Factory structure
- ✅ Query Configuration structure
- ✅ Cache Utilities structure
- ✅ Index exports
- ✅ App.tsx integration
- ✅ ConnectionContext integration
- ✅ Cache time values

### 2. Browser Test Page

**URL:** `http://localhost:8080/state-test`

Interactive test page with:
- Individual test buttons
- Real-time cache information
- Query configuration display
- Run all tests button

See `TEST_STATE_MANAGEMENT.md` for detailed testing guide.

## Test Coverage

### ✅ File Structure Tests
- `queryKeys.ts` exists and exports correctly
- `queryConfig.ts` exists and exports correctly
- `cacheUtils.ts` exists and exports correctly
- `index.ts` exports all utilities

### ✅ Query Keys Factory Tests
- Connections query keys
- Schemas query keys
- Tables query keys
- Database stats query keys
- Query history query keys
- Saved queries query keys
- ER diagram query keys
- Foreign key query keys
- Helper functions

### ✅ Query Configuration Tests
- Cache time configurations (long, medium, short, very short)
- Stale time configurations (very stale, stale, medium, fresh, very fresh)
- Retry configuration (queries and mutations)
- Refetch configuration (onWindowFocus, onReconnect, onMount)
- Default query options function

### ✅ Cache Utilities Tests
- `invalidateConnectionCache` function
- `invalidateSchemaCache` function
- `invalidateTableDataCache` function
- `invalidateQueryHistoryCache` function
- `invalidateSavedQueriesCache` function
- `invalidateDiagramCache` function
- `clearAllCaches` function

### ✅ Integration Tests
- App.tsx uses queryConfig
- ConnectionContext uses queryKeys
- Components import from correct locations
- Configuration values are reasonable

## Running Tests

### Quick Test
```bash
# From project root
./TEST_STATE_MANAGEMENT_AUTO.sh
```

### Detailed Browser Test
1. Start frontend server: `cd frontend && npm run dev`
2. Navigate to: `http://localhost:8080/state-test`
3. Click "Run All Tests"
4. Verify all tests pass

### Manual Verification
```bash
# Check file exists
ls frontend/src/lib/query/queryKeys.ts
ls frontend/src/lib/query/queryConfig.ts
ls frontend/src/lib/query/cacheUtils.ts

# Check exports
grep "export" frontend/src/lib/query/index.ts
```

## Expected Results

All automated tests should pass with:
- ✅ 28 checks passed
- ✅ 0 failures
- ✅ All files exist
- ✅ All exports valid
- ✅ All integrations correct

## Troubleshooting

### Test Failures

**Issue:** File not found
- **Fix:** Ensure you're running from project root
- **Check:** `ls frontend/src/lib/query/`

**Issue:** Export not found
- **Fix:** Check the file has the correct export statement
- **Verify:** `grep "export" frontend/src/lib/query/[filename].ts`

**Issue:** Integration test fails
- **Fix:** Check that components import from correct paths
- **Verify:** `grep "from.*query" frontend/src/App.tsx`

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```bash
# In CI script
./TEST_STATE_MANAGEMENT_AUTO.sh
if [ $? -ne 0 ]; then
    echo "State management tests failed"
    exit 1
fi
```

## Next Steps

- ✅ Automated file structure tests
- ✅ Automated integration tests
- ✅ Browser-based interactive tests
- ⬜ Unit tests for individual functions (requires test framework setup)
- ⬜ Integration tests with mock QueryClient


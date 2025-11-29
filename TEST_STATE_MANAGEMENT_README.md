# State Management Automated Test Scripts

## Overview

This directory contains automated test scripts for validating state management enhancements.

## Quick Start

### Run Automated Tests

From the **project root**:

```bash
./TEST_STATE_MANAGEMENT_AUTO.sh
```

Or from the **frontend directory**:

```bash
npm run test:state-management
```

## Test Results

When you run the automated test script, you'll see:

```
🧪 State Management Automated Tests
====================================

✅ PASS: queryKeys.ts file exists
✅ PASS: queryConfig.ts file exists
✅ PASS: cacheUtils.ts file exists
✅ PASS: queryKeys constant exported
✅ PASS: getConnectionQueryKeys function exported
... (28 checks total)

🎉 All tests passed!
```

## What Gets Tested

### 1. File Existence ✅
- `queryKeys.ts` exists
- `queryConfig.ts` exists
- `cacheUtils.ts` exists

### 2. Structure Validation ✅
- Exports are correct
- Required functions exist
- Configuration objects are defined

### 3. Integration Tests ✅
- App.tsx uses queryConfig
- ConnectionContext uses queryKeys
- Index file exports correctly

### 4. Configuration Values ✅
- Cache times are reasonable
- Stale times are set correctly
- Retry configuration is present

## Test Files

| File | Purpose | Location |
|------|---------|----------|
| `TEST_STATE_MANAGEMENT_AUTO.sh` | Automated shell script | Project root |
| `TEST_STATE_MANAGEMENT.md` | Browser test guide | Project root |
| `StateManagementTest.tsx` | Interactive test page | `frontend/src/pages/` |

## Test Coverage

✅ **28 Automated Checks**
- File existence: 3 checks
- Query keys structure: 5 checks
- Query config structure: 6 checks
- Cache utils structure: 4 checks
- Index exports: 3 checks
- App.tsx integration: 2 checks
- ConnectionContext integration: 2 checks
- Cache time values: 3 checks

## Running Different Types of Tests

### 1. Automated Shell Tests (Quick)
```bash
./TEST_STATE_MANAGEMENT_AUTO.sh
```
**Best for:** CI/CD, quick validation, file structure checks

### 2. Browser Interactive Tests (Detailed)
```bash
# Start frontend server
cd frontend && npm run dev

# Navigate to:
http://localhost:8080/state-test
```
**Best for:** Manual testing, cache visualization, real-time validation

### 3. Manual Code Review
- Check exports in `frontend/src/lib/query/index.ts`
- Verify imports in components
- Review configuration values

## Adding New Tests

To add a new test to the automated script:

1. Open `TEST_STATE_MANAGEMENT_AUTO.sh`
2. Add a new test section:
```bash
print_test "Your Test Name"
if [ condition ]; then
    print_pass "Test passed message"
else
    print_fail "Test failed message"
fi
```

## Troubleshooting

### Permission Denied
```bash
chmod +x TEST_STATE_MANAGEMENT_AUTO.sh
```

### Tests Failing
- Ensure you're in the project root
- Check file paths are correct
- Verify exports in source files

### Integration Test Failures
- Check that components actually use the utilities
- Verify import paths are correct
- Review recent changes to files

## Success Criteria

✅ All 28 automated checks pass  
✅ Files exist and are properly structured  
✅ Exports are correct  
✅ Integration points are verified  
✅ Configuration values are reasonable  

## Next Steps

After running tests:
1. ✅ Review test results
2. ✅ Fix any failures
3. ✅ Run browser tests for detailed validation
4. ✅ Integrate into CI/CD pipeline

---

**Happy Testing!** 🧪


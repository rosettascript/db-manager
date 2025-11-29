# Phase 12.4: Table Data Operations Integration - Test Guide

## 🧪 Testing Overview

This guide helps you test the frontend integration of table data operations, including:
- Table data fetching with API
- Pagination
- Filtering
- Sorting
- Search
- Column selection

---

## 📋 Prerequisites

1. ✅ Backend server running on `http://localhost:3000`
2. ✅ Frontend server running (check port from vite output)
3. ✅ Active database connection configured

---

## 🚀 Manual Testing Steps

### Step 1: Verify Backend API Endpoints

First, let's verify the backend API is working:

```bash
# Get a connection ID first (if you don't know it)
curl http://localhost:3000/api/connections | jq '.[0].id'

# Test table data endpoint
curl "http://localhost:3000/api/connections/{CONNECTION_ID}/db/tables/public/{TABLE_NAME}/data?page=1&pageSize=5" | jq
```

---

### Step 2: Browser Testing

#### 2.1 Navigate to Schema Browser

1. Open your frontend app (usually `http://localhost:5173` or `http://localhost:8080`)
2. Go to the Schema Browser (home page)
3. Verify you have an active connection selected

#### 2.2 Open a Table

1. Click on any table from the schema browser
2. You should be redirected to `/table/{schema}.{tableName}`
3. **Expected**: Table viewer page loads with:
   - Table name and metadata
   - Loading indicator while fetching data
   - Table data displayed

#### 2.3 Test Basic Data Loading

- **Expected**: 
  - Data loads from API (not mock data)
  - Pagination controls visible
  - Row count displayed correctly
  - No console errors

---

### Step 3: Test Pagination

1. **Change page size**: Select different page sizes (50, 100, 200, 500, 1000)
   - **Expected**: Data reloads with new page size
   - **Expected**: Pagination controls update

2. **Navigate pages**: Click "Next", "Previous", "First", "Last"
   - **Expected**: Data changes to show correct page
   - **Expected**: URL might update (if implemented)
   - **Expected**: Page number displays correctly

3. **Verify API calls**: Open browser DevTools → Network tab
   - **Expected**: API calls include `page` and `pageSize` parameters
   - **Expected**: Response includes pagination metadata

---

### Step 4: Test Search

1. **Enter search query**: Type text in the search box
   - **Expected**: Debounced search (waits 300ms before searching)
   - **Expected**: Data filters to matching rows
   - **Expected**: Row count updates
   - **Expected**: Resets to page 1

2. **Clear search**: Clear the search box
   - **Expected**: All data shows again
   - **Expected**: Row count returns to total

3. **Verify API calls**:
   - **Expected**: `search` parameter included in API request
   - **Expected**: Response shows filtered results

---

### Step 5: Test Sorting

1. **Click column header**: Click on any column header to sort
   - **Expected**: Sort icon appears (arrow up/down)
   - **Expected**: Data reorders

2. **Toggle sort direction**: Click same column again
   - **Expected**: Sort direction reverses (asc → desc)

3. **Sort different column**: Click another column header
   - **Expected**: Previous sort clears, new sort applied

4. **Verify API calls**:
   - **Expected**: `sortColumn` and `sortDirection` in API request
   - **Expected**: Data comes sorted from backend

---

### Step 6: Test Filtering

1. **Open filter dialog**: Click "Filter" button
   - **Expected**: Filter sheet opens

2. **Add a filter**: 
   - Select a column
   - Choose an operator (equals, contains, gt, etc.)
   - Enter a value
   - Click "Apply Filters"
   - **Expected**: Data filters based on condition
   - **Expected**: Filter badge shows count
   - **Expected**: Row count updates

3. **Add multiple filters**: Add 2-3 filters
   - **Expected**: All filters apply (AND logic)
   - **Expected**: Filter badge shows total count

4. **Clear filters**: Click "Clear All"
   - **Expected**: All data shows again
   - **Expected**: Filter badge disappears

5. **Verify API calls**:
   - **Expected**: `filters` parameter in API request (JSON stringified)
   - **Expected**: Response shows filtered results

---

### Step 7: Test Column Selection

1. **Open column manager**: Click column manager button
   - **Expected**: Column manager opens

2. **Toggle columns**: Hide/show different columns
   - **Expected**: Table updates to show only selected columns
   - **Expected**: API request includes `columns` parameter

3. **Show/hide all**: Use toggle all functionality
   - **Expected**: All columns show or hide

---

### Step 8: Test Error Handling

1. **Disconnect database**: Disconnect the active connection
2. **Try to view table**:
   - **Expected**: Error message displayed
   - **Expected**: User-friendly error UI
   - **Expected**: Option to retry or go back

3. **Invalid table**: Navigate to non-existent table
   - **Expected**: "Table not found" error
   - **Expected**: Option to go back to schema browser

---

## ✅ Test Checklist

### Basic Functionality
- [ ] Table data loads from API
- [ ] Loading states display correctly
- [ ] Error states handle gracefully
- [ ] No console errors

### Pagination
- [ ] Page size changes work
- [ ] Page navigation works
- [ ] Pagination info displays correctly
- [ ] API includes pagination params

### Search
- [ ] Search input works
- [ ] Debouncing works (300ms delay)
- [ ] Search filters results
- [ ] Search clears correctly
- [ ] API includes search param

### Sorting
- [ ] Column headers clickable
- [ ] Sort icons display correctly
- [ ] Sort direction toggles
- [ ] Data sorts correctly
- [ ] API includes sort params

### Filtering
- [ ] Filter dialog opens/closes
- [ ] Filters can be added/removed
- [ ] Multiple filters work (AND logic)
- [ ] Filter badge shows count
- [ ] Filters clear correctly
- [ ] API includes filters param

### Column Selection
- [ ] Column manager works
- [ ] Columns can be hidden/shown
- [ ] Column selection persists
- [ ] API includes columns param

### Error Handling
- [ ] No connection error handled
- [ ] Table not found error handled
- [ ] Network errors handled
- [ ] Retry functionality works

---

## 🐛 Common Issues & Solutions

### Issue: Table doesn't load
- **Check**: Connection is active and connected
- **Check**: Table ID format is correct (schema.tableName)
- **Check**: Browser console for errors
- **Check**: Network tab for API response

### Issue: Pagination not working
- **Check**: API response includes pagination metadata
- **Check**: Page/pageSize params in API request
- **Check**: Total pages calculation

### Issue: Search not working
- **Check**: Debounce timing (should be 300ms)
- **Check**: Search param in API request
- **Check**: Backend search endpoint working

### Issue: Filters not applying
- **Check**: Filter format matches API expectations
- **Check**: Filters param is JSON stringified
- **Check**: Filter operators are valid

---

## 📊 Expected API Request Format

### Get Table Data
```
GET /api/connections/{connectionId}/db/tables/{schema}/{table}/data?page=1&pageSize=100&search=query&sortColumn=name&sortDirection=asc&columns=col1,col2&filters=[{"column":"name","operator":"equals","value":"test"}]
```

### Get Table Count
```
GET /api/connections/{connectionId}/db/tables/{schema}/{table}/count?search=query&filters=[...]
```

---

## 🎯 Success Criteria

Phase 12.4 is successful when:
- ✅ All table data comes from API (not mock)
- ✅ Pagination works correctly
- ✅ Search works correctly
- ✅ Sorting works correctly
- ✅ Filtering works correctly
- ✅ Column selection works correctly
- ✅ Error states handled gracefully
- ✅ Loading states show appropriately
- ✅ No console errors
- ✅ Good user experience

---

## 📝 Test Results Template

```
Date: [DATE]
Tester: [NAME]
Connection: [CONNECTION_NAME]
Database: [DATABASE_NAME]

Basic Loading: ✅/❌
Pagination: ✅/❌
Search: ✅/❌
Sorting: ✅/❌
Filtering: ✅/❌
Column Selection: ✅/❌
Error Handling: ✅/❌

Issues Found:
- [ISSUE 1]
- [ISSUE 2]

Overall Status: ✅ PASS / ❌ FAIL
```

---

## 🚀 Next Steps After Testing

1. Fix any issues found
2. Update test results
3. Update progress tracker
4. Proceed to next phase


# Phase 12.7 - Data Export Integration Testing Guide

This document provides a comprehensive testing guide for the export functionality implemented in Phase 12.7.

## 📋 Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Frontend Server Running**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Active Database Connection**
   - Ensure you have a connected database in the application
   - Note the connection ID for API testing

## 🧪 Test Scenarios

### 1. Table Export Testing (Browser)

#### Test 1.1: Basic CSV Export
1. Navigate to a table view (e.g., `/table/public.users`)
2. Click the "Export" button in the toolbar
3. Select "CSV" format
4. Ensure "Include column headers" is checked
5. Click "Export"
6. **Expected Result:**
   - Toast notification: "Exporting users as CSV..."
   - Download starts automatically
   - File name: `public_users.csv`
   - File contains headers and all table data

#### Test 1.2: Basic JSON Export
1. Navigate to a table view
2. Click "Export"
3. Select "JSON" format
4. Click "Export"
5. **Expected Result:**
   - Download starts automatically
   - File name: `public_users.json`
   - File contains JSON array of objects

#### Test 1.3: Export with Filters
1. Navigate to a table view
2. Apply some filters (e.g., `id > 10`)
3. Click "Export" → CSV
4. **Expected Result:**
   - Only filtered rows are exported
   - Export respects filter conditions

#### Test 1.4: Export with Sorting
1. Navigate to a table view
2. Sort by a column (e.g., `name DESC`)
3. Click "Export" → CSV
4. **Expected Result:**
   - Exported data is sorted according to current sort settings

#### Test 1.5: Export with Search
1. Navigate to a table view
2. Enter a search query in the search box
3. Wait for results to filter
4. Click "Export" → CSV
5. **Expected Result:**
   - Only search results are exported

#### Test 1.6: Export with Column Selection
1. Navigate to a table view
2. Hide some columns using column manager
3. Click "Export" → CSV
4. **Expected Result:**
   - Only visible columns are exported
   - Hidden columns are not included

#### Test 1.7: Export without Headers
1. Navigate to a table view
2. Click "Export"
3. Uncheck "Include column headers"
4. Select CSV format
5. Click "Export"
6. **Expected Result:**
   - CSV file has no header row
   - Only data rows are exported

### 2. Query Export Testing (Browser)

#### Test 2.1: Export Query Results (CSV)
1. Navigate to Query Builder (`/query`)
2. Enter a SELECT query (e.g., `SELECT * FROM users LIMIT 10`)
3. Click "Run Query"
4. Wait for results to appear
5. Click "Export" button
6. Select "CSV" format
7. Click "Export"
8. **Expected Result:**
   - Toast notification: "Exporting query results as CSV..."
   - Download starts automatically
   - File name: `query_results_YYYY-MM-DDTHH-MM-SS.csv`
   - File contains query results

#### Test 2.2: Export Query Results (JSON)
1. Run a query in Query Builder
2. Click "Export" → "JSON"
3. **Expected Result:**
   - JSON file downloaded
   - File contains query results as JSON array

#### Test 2.3: Export Query Results without Headers
1. Run a query
2. Click "Export"
3. Uncheck "Include column headers"
4. Select CSV
5. **Expected Result:**
   - CSV file without header row

#### Test 2.4: Export Empty Query Results
1. Run a query that returns no results
2. Click "Export" → CSV
3. **Expected Result:**
   - Export still works (empty file or headers only)
   - No errors shown

### 3. Error Handling Testing

#### Test 3.1: Export without Connection
1. Disconnect from database
2. Try to export a table
3. **Expected Result:**
   - Export button is disabled or shows error
   - Error message displayed

#### Test 3.2: Export with Invalid Table
1. Navigate to a table view
2. Delete the table from database (or use non-existent table)
3. Try to export
4. **Expected Result:**
   - Error message displayed
   - Export fails gracefully

#### Test 3.3: Export During Loading
1. Navigate to a table view
2. Quickly click "Export" multiple times
3. **Expected Result:**
   - Only one export starts
   - Button shows "Exporting..." state
   - Subsequent clicks are disabled

### 4. API Endpoint Testing (Command Line)

Run the automated test script:

```bash
# Update connection ID and table name in the script first
./TEST_PHASE12_7_EXPORT.sh
```

Or test manually with curl:

```bash
# Export table as CSV
curl -X GET "http://localhost:3000/api/connections/{CONNECTION_ID}/db/tables/public/users/export?format=csv&includeHeaders=true" \
  -H "Content-Type: application/json" \
  -o test_export.csv

# Export table as JSON
curl -X GET "http://localhost:3000/api/connections/{CONNECTION_ID}/db/tables/public/users/export?format=json" \
  -H "Content-Type: application/json" \
  -o test_export.json

# Export query results
curl -X POST "http://localhost:3000/api/connections/{CONNECTION_ID}/query/export" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT * FROM users LIMIT 10","format":"csv","includeHeaders":true}' \
  -o test_query_export.csv
```

## ✅ Checklist

### Table Export
- [ ] CSV export works
- [ ] JSON export works
- [ ] Export respects filters
- [ ] Export respects sorting
- [ ] Export respects search
- [ ] Export respects column selection
- [ ] Headers can be included/excluded
- [ ] File downloads automatically
- [ ] Correct file naming (`schema_table.format`)
- [ ] Loading state during export
- [ ] Error handling works

### Query Export
- [ ] CSV export works
- [ ] JSON export works
- [ ] Headers can be included/excluded
- [ ] File downloads automatically
- [ ] Correct file naming (`query_results_timestamp.format`)
- [ ] Works with various query types
- [ ] Loading state during export
- [ ] Error handling works

### General
- [ ] Toast notifications work
- [ ] Export button disabled during export
- [ ] Cancellation works (closing dialog)
- [ ] No duplicate exports
- [ ] Proper error messages

## 🐛 Known Issues / Notes

- Export files are saved to browser's default download location
- Large exports may take time - ensure proper loading indicators
- CSV exports use UTF-8 encoding
- JSON exports are pretty-printed for readability

## 📊 Performance Considerations

- Large table exports (1000+ rows) should be tested
- Export timeout handling
- Memory usage for large exports
- Streaming vs buffered export (backend handles this)

## 🔍 Debugging

If exports fail:

1. **Check Browser Console**
   - Look for JavaScript errors
   - Check network tab for failed requests

2. **Check Backend Logs**
   - Verify connection pool is active
   - Check for SQL errors
   - Verify file streaming works

3. **Check Download Settings**
   - Browser may block downloads
   - Check download permissions
   - Verify file isn't blocked by antivirus

4. **Verify API Endpoints**
   ```bash
   # Test health endpoint
   curl http://localhost:3000/api/health
   
   # Test export endpoint directly
   curl -v "http://localhost:3000/api/connections/{ID}/db/tables/public/users/export?format=csv"
   ```

## ✅ Success Criteria

All of the following should work:

1. ✅ Table data can be exported as CSV
2. ✅ Table data can be exported as JSON
3. ✅ Query results can be exported as CSV
4. ✅ Query results can be exported as JSON
5. ✅ Filters, sorting, search are applied to exports
6. ✅ Column selection works for exports
7. ✅ Headers can be toggled
8. ✅ Files download automatically
9. ✅ Error handling works correctly
10. ✅ Loading states are shown

---

**Last Updated:** 2025-01-27
**Phase:** 12.7 - Data Export Integration


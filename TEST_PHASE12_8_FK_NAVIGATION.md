# Phase 12.8 - Foreign Key Navigation Testing Guide

This document provides a comprehensive testing guide for the foreign key navigation functionality implemented in Phase 12.8.

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
   - Ensure you have a connected database with tables that have foreign key relationships
   - Note the connection ID for API testing

## 🧪 Test Scenarios

### 1. Foreign Key Cell Display

#### Test 1.1: FK Cell Visual Appearance
1. Navigate to a table that has foreign key columns
2. **Expected Result:**
   - Foreign key values should be displayed with:
     - Primary color text
     - Underlined with dotted decoration
     - External link icon appears on hover
     - Tooltip shows FK reference information

#### Test 1.2: Non-FK Column Display
1. Navigate to a table
2. View columns that are NOT foreign keys
3. **Expected Result:**
   - Regular columns display normally (no special styling)
   - No hover effects for non-FK columns

### 2. Foreign Key Navigation

#### Test 2.1: Basic FK Navigation
1. Navigate to a table with foreign key columns (e.g., `users` table with `role_id` FK)
2. Click on a foreign key value
3. **Expected Result:**
   - Navigates to the referenced table (e.g., `roles` table)
   - URL changes to `/table/schema.referenced_table`
   - Referenced table loads successfully
   - Breadcrumb trail updates

#### Test 2.2: FK Navigation with Null Values
1. Navigate to a table with nullable foreign key columns
2. Find a row with NULL in the FK column
3. Try to click on the NULL value
4. **Expected Result:**
   - NULL values don't trigger navigation
   - No error messages
   - Normal display of NULL value

#### Test 2.3: FK Navigation - Referenced Row Exists
1. Navigate to a table with a foreign key
2. Click on an FK value that references an existing row
3. **Expected Result:**
   - API lookup succeeds
   - Navigates to referenced table
   - Table loads with the referenced row visible

#### Test 2.4: FK Navigation - Referenced Row Missing
1. Navigate to a table with a foreign key
2. Click on an FK value that references a non-existent row (orphaned FK)
3. **Expected Result:**
   - API lookup returns `found: false`
   - Still navigates to referenced table (fallback)
   - Table loads normally (may show empty or filtered)

### 3. Tooltip Information

#### Test 3.1: FK Tooltip Content
1. Hover over a foreign key value
2. **Expected Result:**
   - Tooltip displays:
     - "Foreign Key Reference" header
     - Referenced table and column names
     - "Click to navigate" instruction

#### Test 3.2: FK Tooltip Positioning
1. Hover over FK values in different rows
2. **Expected Result:**
   - Tooltip appears above the cell
   - Doesn't overlap with other UI elements
   - Disappears when mouse leaves

### 4. Composite Foreign Keys

#### Test 4.1: Single Column FK
1. Test with tables that have single-column foreign keys
2. **Expected Result:**
   - Navigation works correctly
   - FK lookup uses single value

#### Test 4.2: Composite FK (if available)
1. Test with tables that have composite foreign keys (multiple columns)
2. **Expected Result:**
   - FK lookup handles multiple values
   - Navigation works correctly

### 5. API Integration

#### Test 5.1: FK Lookup API Call
1. Open browser DevTools → Network tab
2. Click on a foreign key value
3. **Expected Result:**
   - API call to `/api/connections/:id/db/tables/:schema/:table/fk-lookup` is made
   - Request includes `foreignKeyName` and `foreignKeyValue`
   - Response includes referenced table info

#### Test 5.2: Error Handling
1. Disconnect from database or cause connection error
2. Try to click on a foreign key value
3. **Expected Result:**
   - Error is caught gracefully
   - Fallback navigation to referenced table (using same schema assumption)
   - User-friendly error message if available

### 6. Browser Testing Checklist

- [ ] FK cells are visually distinct (underlined, colored)
- [ ] Hover shows external link icon
- [ ] Tooltip displays FK reference info
- [ ] Click navigates to referenced table
- [ ] URL uses correct format (`schema.table`)
- [ ] Referenced table loads successfully
- [ ] Breadcrumb trail updates correctly
- [ ] NULL values don't trigger navigation
- [ ] Orphaned FKs still navigate (fallback)
- [ ] Error handling works gracefully
- [ ] Network requests are made correctly
- [ ] Loading states are appropriate

## 🔍 Debugging

### Check Browser Console
- Look for JavaScript errors
- Check network tab for API calls
- Verify API responses

### Check Backend Logs
- Verify connection pool is active
- Check FK lookup queries
- Verify table/schema resolution

### Common Issues

1. **FK Not Clickable**
   - Check if column is detected as foreign key
   - Verify table object has foreignKeys array
   - Check console for errors

2. **Navigation Fails**
   - Verify FK lookup API response
   - Check table ID format (schema.table)
   - Verify referenced table exists

3. **Wrong Table Navigated**
   - Check FK lookup response
   - Verify schema is correct
   - Check table name resolution

## ✅ Success Criteria

All of the following should work:

1. ✅ Foreign key values are visually distinct
2. ✅ Tooltip shows FK reference information
3. ✅ Click on FK value navigates to referenced table
4. ✅ URL uses correct schema.table format
5. ✅ Referenced table loads successfully
6. ✅ NULL values are handled correctly
7. ✅ Error cases are handled gracefully
8. ✅ Network requests are correct
9. ✅ Breadcrumb trail updates

---

**Last Updated:** 2025-01-27
**Phase:** 12.8 - Foreign Key Navigation Integration


# 🧪 Connection Management Testing Guide

## 📋 Prerequisites

Before testing, ensure:
- ✅ Backend server is running on `http://localhost:3000`
- ✅ Frontend server is running (usually `http://localhost:8080` or `http://localhost:5173`)
- ✅ Both servers are accessible

## 🚀 How to Access Connection Manager

1. **Open the application** in your browser
2. **Look for the Settings icon** (gear icon) in the top-right corner of the header
3. **Click the Settings icon** to open the Connection Manager sheet

## 🧪 Test Cases

### Test 1: View Connection List ✅

**Steps:**
1. Click the Settings icon in the header
2. Connection Manager sheet should open from the right
3. You should see a list of existing connections

**Expected Results:**
- ✅ Connections are loaded from the backend API
- ✅ Loading spinner appears briefly while fetching
- ✅ Each connection shows:
  - Connection name
  - Status badge (connected/disconnected/error)
  - Connection details (username@host:port/database)
  - Last connected time (if available)

**If you see an error:**
- Check browser console for errors
- Verify backend is running: `curl http://localhost:3000/api/health`
- Check network tab for failed requests

---

### Test 2: Search Connections 🔍

**Steps:**
1. Open Connection Manager
2. Type in the search box at the top
3. Try searching by:
   - Connection name
   - Host name
   - Database name

**Expected Results:**
- ✅ Connection list filters in real-time
- ✅ Only matching connections are shown
- ✅ Empty state shown if no matches

---

### Test 3: Refresh Connections 🔄

**Steps:**
1. Open Connection Manager
2. Click the refresh icon (circular arrow) next to the search box

**Expected Results:**
- ✅ Connections list reloads
- ✅ Loading state appears briefly
- ✅ Latest connections are displayed

---

### Test 4: Create New Connection ➕

**Steps:**
1. Open Connection Manager
2. Click "Add New" button
3. Fill in the connection form:
   - **Connection Name**: `Test Connection`
   - **Host**: `localhost`
   - **Port**: `5432`
   - **Database**: `your_database_name`
   - **Username**: `your_username`
   - **Password**: `your_password`
   - **SSL Mode**: `prefer` (default)
4. Click "Create Connection"

**Expected Results:**
- ✅ Form validation works (all fields required)
- ✅ Success toast notification appears
- ✅ Dialog closes automatically
- ✅ New connection appears in the list
- ✅ Connection status is "disconnected" initially

**If creation fails:**
- Check if all required fields are filled
- Verify password is entered
- Check backend logs for errors
- Check browser console for API errors

---

### Test 5: Edit Connection ✏️

**Steps:**
1. Open Connection Manager
2. Find an existing connection
3. Click the Edit icon (pencil) on the connection card
4. Modify any field (e.g., change the connection name)
5. Click "Update Connection"

**Expected Results:**
- ✅ Dialog opens with pre-filled form data
- ✅ Password field is empty (for security)
- ✅ Changes are saved successfully
- ✅ Success toast notification appears
- ✅ Connection list updates with new values

**Note:** 
- Password is optional when editing (leave empty to keep current password)
- SSL mode can be changed

---

### Test 6: Test Connection 🧪

**Steps:**
1. Open Connection Manager
2. Click Edit icon on an existing connection
3. Click "Test Connection" button
4. Wait for the test to complete

**Expected Results:**
- ✅ Test button is only available for existing connections
- ✅ Loading spinner appears while testing
- ✅ Success or error message is displayed
- ✅ Connection time is shown (if successful)
- ✅ Status indicator shows result (green check or red X)

**Note:** 
- Testing requires a saved connection ID
- For new connections, save first, then test in edit mode

---

### Test 7: Connect to Database 🔌

**Steps:**
1. Open Connection Manager
2. Find a connection with "disconnected" status
3. Click the Power button (⚡ icon)
4. Wait for connection to establish

**Expected Results:**
- ✅ Loading spinner on the button
- ✅ Success toast notification
- ✅ Status badge changes to "connected"
- ✅ Power button changes to Power Off icon

**If connection fails:**
- Check connection credentials
- Verify database is running
- Check backend logs for detailed error

---

### Test 8: Disconnect from Database 🔌

**Steps:**
1. Open Connection Manager
2. Find a connection with "connected" status
3. Click the Power Off button
4. Wait for disconnection

**Expected Results:**
- ✅ Loading spinner on the button
- ✅ Info toast notification
- ✅ Status badge changes to "disconnected"
- ✅ Power button changes to Power On icon

---

### Test 9: Delete Connection 🗑️

**Steps:**
1. Open Connection Manager
2. Find a connection you want to delete
3. Click the Trash icon
4. Confirm deletion in the browser prompt

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Connection is removed from the list
- ✅ Success toast notification
- ✅ List updates immediately

**Note:** 
- Deletion is permanent
- Make sure you want to delete before confirming

---

## 🔍 Troubleshooting

### Connection List Not Loading

**Symptoms:** Loading spinner forever or error message

**Solutions:**
1. Check backend is running: `curl http://localhost:3000/api/health`
2. Check browser console for errors
3. Check network tab - look for failed requests to `/api/connections`
4. Verify CORS is configured correctly
5. Check backend logs for errors

### Create/Update/Delete Not Working

**Symptoms:** Actions complete but no changes appear

**Solutions:**
1. Check browser console for errors
2. Verify backend is receiving requests (check backend logs)
3. Check network tab for HTTP status codes (should be 200/201)
4. Try refreshing the connection list manually

### Connection Test Fails

**Symptoms:** Test always shows error

**Solutions:**
1. Verify database credentials are correct
2. Check if PostgreSQL is running
3. Verify database name exists
4. Check if user has permissions
5. Verify host and port are correct
6. Check backend logs for detailed error messages

### CORS Errors

**Symptoms:** Network errors in browser console mentioning CORS

**Solutions:**
1. Verify backend CORS configuration includes your frontend URL
2. Check `backend/src/main.ts` for CORS settings
3. Ensure frontend URL matches allowed origins

---

## ✅ Success Criteria

All tests pass if:
- ✅ Connection list loads from API
- ✅ Create/Update/Delete operations work
- ✅ Connect/Disconnect operations work
- ✅ Test connection works for existing connections
- ✅ Loading and error states display correctly
- ✅ Form validation works
- ✅ Toast notifications appear

---

## 📝 Notes

- **Test Connection**: Only works for existing connections (needs an ID)
- **Password**: Never displayed or pre-filled for security
- **Status**: Updates after operations complete
- **Refresh**: Manual refresh button available

---

**Ready to test!** Open your browser and click the Settings icon in the header to start.


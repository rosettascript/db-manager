# Testing API Foundation

## 🧪 Quick Test Guide

### Option 1: Using the Test Page (Recommended)

1. **Start the frontend dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Ensure backend is running:**
   ```bash
   cd backend
   npm run start:dev
   ```

3. **Visit the test page:**
   ```
   http://localhost:5173/api-test
   ```

4. **Click "Run API Tests" button**

5. **Review the results:**
   - ✅ Green checks = Test passed
   - ❌ Red X = Test failed
   - View logs for detailed information

---

### Option 2: Using Browser Console

1. **Open your browser's developer console (F12)**

2. **Navigate to any page on the frontend**

3. **Run the test function:**
   ```javascript
   // Import and run the test
   import testApiFoundation from '@/lib/api/test-api';
   await testApiFoundation();
   ```

   Or if using dynamic import:
   ```javascript
   const { testApiFoundation } = await import('/src/lib/api/test-api.ts');
   await testApiFoundation();
   ```

---

### Option 3: Manual Testing with cURL

Test each endpoint manually:

```bash
# 1. Health Check
curl http://localhost:3000/api/health

# 2. List Connections
curl http://localhost:3000/api/connections

# 3. Test Error Handling (should return 404)
curl http://localhost:3000/api/connections/nonexistent-id
```

---

## ✅ What Gets Tested

### 1. API Configuration
- Base URL configuration
- Timeout settings
- Retry configuration

### 2. Health Check
- Backend connectivity
- Response format
- API endpoint accessibility

### 3. Connections List
- API endpoint response
- Data structure validation
- Array response handling

### 4. Error Handling
- 404 error handling
- Error message parsing
- Exception throwing

---

## 📊 Expected Results

### ✅ All Tests Pass
```
✅ Config:        ✅
✅ Health Check:  ✅
✅ Connections:   ✅
✅ Error Handle:  ✅

🎉 All tests passed! API foundation is working correctly.
```

### ⚠️ Partial Success
If some tests fail, check:
- Backend server is running on port 3000
- CORS is properly configured
- Network connectivity
- Browser console for detailed errors

---

## 🔧 Troubleshooting

### Test Fails: Health Check
- **Issue:** Cannot connect to backend
- **Solution:** Ensure backend is running on `http://localhost:3000`

### Test Fails: Connections List
- **Issue:** No connections or error
- **Solution:** This is OK if no connections exist. Error handling test should still work.

### Test Fails: Error Handling
- **Issue:** Error not properly caught
- **Solution:** Check error handling code in `errors.ts`

### CORS Errors
- **Issue:** CORS policy errors in browser
- **Solution:** Verify backend CORS configuration in `backend/src/main.ts`

---

## 📝 Next Steps

Once all tests pass:
1. ✅ API foundation is working correctly
2. ✅ Ready to proceed with Phase 12.2 (Connection Management Integration)
3. ✅ Can start replacing mock data with real API calls

---

**Last Updated:** 2025-11-29


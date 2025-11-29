# Starting Frontend Dev Server for API Testing

## 🚀 Quick Start

### Step 1: Start Frontend Server

In the `frontend/` directory:

```bash
cd frontend
npm run dev
```

The server will start on: **http://localhost:5173**

### Step 2: Visit Test Page

Open your browser and navigate to:

```
http://localhost:5173/api-test
```

### Step 3: Run Tests

1. Click the **"Run API Tests"** button
2. Wait for tests to complete
3. Review the results:
   - ✅ Green checkmarks = Test passed
   - ❌ Red X marks = Test failed
   - View logs for detailed information

---

## ✅ Prerequisites

Make sure both servers are running:

### Backend Server (Required)
```bash
cd backend
npm run start:dev
```
Backend should be running on: **http://localhost:3000**

### Frontend Server
```bash
cd frontend
npm run dev
```
Frontend will run on: **http://localhost:5173**

---

## 📊 Expected Test Results

### All Tests Should Pass ✅

1. **Configuration** ✅
   - Base URL configured correctly
   - Timeout and retry settings OK

2. **Health Check** ✅
   - Backend connectivity verified
   - Response format correct

3. **Connections List** ✅
   - API endpoint accessible
   - Data structure valid

4. **Error Handling** ✅
   - 404 errors handled correctly
   - Error messages parsed properly

---

## 🔧 Troubleshooting

### Frontend won't start
- Check if port 5173 is already in use
- Verify `node_modules` are installed: `npm install`
- Check for syntax errors in code

### Tests fail - Cannot connect to backend
- Ensure backend is running on port 3000
- Check CORS configuration in backend
- Verify network connectivity

### CORS errors in browser console
- Backend CORS should allow `http://localhost:5173`
- Check `backend/src/main.ts` CORS settings

---

## 🎯 Next Steps After Testing

Once all tests pass:
1. ✅ API foundation verified
2. ✅ Ready for Phase 12.2 (Connection Management Integration)
3. ✅ Can proceed with replacing mock data

---

**Test Page URL:** http://localhost:5173/api-test


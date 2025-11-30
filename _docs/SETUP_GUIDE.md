# DB Visualizer - Setup Guide

Complete setup instructions for the DB Visualizer application.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and npm (or yarn/pnpm)
- **PostgreSQL** database (for testing/development)
- **Git** (for cloning the repository)
- **Code Editor** (VS Code recommended)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd db-visualizer
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# ENCRYPTION_KEY=your-secure-key-here
# (Generate with: openssl rand -base64 32)

# Start development server
npm run start:dev
```

The backend will run on `http://localhost:3000`

**Verify Backend:**
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:3000/api" > .env

# Start development server
npm run dev
```

The frontend will run on `http://localhost:8080` or `http://localhost:5173`

**Verify Frontend:**
Open `http://localhost:8080` in your browser

---

## ⚙️ Configuration

### Backend Configuration

**File:** `backend/.env`

```bash
# Database Encryption Key (REQUIRED)
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=your-secure-encryption-key-here

# Server Port (optional, default: 3000)
PORT=3000

# Node Environment
NODE_ENV=development
```

**Important:** The `ENCRYPTION_KEY` is required for encrypting database passwords. Generate a secure key:

```bash
openssl rand -base64 32
```

### Frontend Configuration

**File:** `frontend/.env`

```bash
# API Base URL (optional, default: http://localhost:3000/api)
VITE_API_URL=http://localhost:3000/api
```

**Note:** The frontend will use `http://localhost:3000/api` by default if `VITE_API_URL` is not set.

---

## 🔧 Development Setup

### Backend Development

```bash
cd backend

# Start with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run linting
npm run lint

# Run tests
npm test
```

### Frontend Development

```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

---

## 🗄️ Database Setup

### Create Test Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create test database
CREATE DATABASE testdb;

-- Create test user (optional)
CREATE USER testuser WITH PASSWORD 'testpass';
GRANT ALL PRIVILEGES ON DATABASE testdb TO testuser;
```

### Test Connection

Use the Connection Manager in the frontend to test your database connection:

1. Open the app: `http://localhost:8080`
2. Click Settings icon (top-right)
3. Click "Add New"
4. Enter connection details:
   - **Name:** Test DB
   - **Host:** localhost
   - **Port:** 5432
   - **Database:** testdb
   - **Username:** postgres (or your user)
   - **Password:** your password
5. Click "Test Connection"
6. If successful, click "Save"

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Tests

```bash
cd frontend

# Run state management tests
npm run test:state-management

# Or use test pages:
# - http://localhost:8080/api-test
# - http://localhost:8080/state-test
# - http://localhost:8080/ui-ux-test
```

### Integration Tests

Follow the comprehensive testing guide:
- **TEST_PHASE12_12.md** - Complete testing scenarios
- **INTEGRATION_TEST_CHECKLIST.md** - Quick checklist

---

## 🐛 Troubleshooting

### Backend Issues

#### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
PORT=3001
```

#### Encryption Key Error

**Error:** `Encryption failed: ENCRYPTION_KEY not set`

**Solution:**
```bash
# Generate a new key
openssl rand -base64 32

# Add to backend/.env
ENCRYPTION_KEY=<generated-key>
```

#### Database Connection Failed

**Error:** `password authentication failed`

**Solution:**
- Verify database credentials
- Check PostgreSQL is running: `pg_isready`
- Verify user permissions
- Check `pg_hba.conf` for authentication settings

### Frontend Issues

#### CORS Errors

**Error:** `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution:**
- Ensure backend CORS allows frontend origin
- Check `backend/src/main.ts` CORS configuration
- Verify frontend URL matches allowed origins

#### API Connection Failed

**Error:** `Network error: Unable to connect to the server`

**Solution:**
- Verify backend is running: `curl http://localhost:3000/api/health`
- Check `VITE_API_URL` in `frontend/.env`
- Verify firewall/network settings
- Check browser console for detailed errors

#### Module Not Found

**Error:** `Cannot find module '@/lib/api'`

**Solution:**
```bash
# Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📦 Production Build

### Backend Production

```bash
cd backend

# Build
npm run build

# Start production server
npm run start:prod
```

### Frontend Production

```bash
cd frontend

# Build
npm run build

# Output will be in frontend/dist/
# Serve with any static file server:
# - nginx
# - Apache
# - Vercel
# - Netlify
```

---

## 🔒 Security Considerations

### Development

- Use strong `ENCRYPTION_KEY` (32+ characters)
- Don't commit `.env` files
- Use test databases, not production
- Keep dependencies updated

### Production

- Use environment variables for all secrets
- Enable HTTPS
- Configure CORS properly
- Use strong encryption keys
- Regular security audits
- Keep dependencies updated

---

## 📚 Additional Resources

### Documentation

- **[FRONTEND_INTEGRATION_README.md](./FRONTEND_INTEGRATION_README.md)** - Complete integration guide
- **[../backend/_docs/API_DOCUMENTATION.md](../backend/_docs/API_DOCUMENTATION.md)** - API reference
- **[../backend/_docs/ARCHITECTURE.md](../backend/_docs/ARCHITECTURE.md)** - System architecture
- **TEST_PHASE12_12.md** - Testing guide

### Support

- Check troubleshooting section above
- Review error logs in browser console
- Check backend logs for API errors
- Review test pages for diagnostics

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Backend server starts without errors
- [ ] Frontend server starts without errors
- [ ] Health check endpoint works: `curl http://localhost:3000/api/health`
- [ ] Frontend loads: `http://localhost:8080`
- [ ] Connection Manager opens
- [ ] Can create a test connection
- [ ] Can connect to database
- [ ] Can browse schemas
- [ ] Can view tables

---

**Happy Coding!** 🚀


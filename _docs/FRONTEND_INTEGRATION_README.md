# Frontend-Backend Integration Documentation

Complete guide for the frontend-backend integration of the DB Visualizer application.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Integration](#api-integration)
4. [State Management](#state-management)
5. [Error Handling](#error-handling)
6. [Configuration](#configuration)
7. [Setup Instructions](#setup-instructions)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The frontend-backend integration connects the React frontend with the NestJS backend API, replacing all mock data with real API calls. The integration uses:

- **React Query (TanStack Query)** for data fetching and caching
- **TypeScript** for type safety
- **Axios-like API client** for HTTP requests
- **Centralized error handling** for consistent UX

### Key Features

- ✅ Real-time database connections
- ✅ Schema and table browsing
- ✅ Table data viewing with pagination, filtering, and sorting
- ✅ SQL query execution
- ✅ ER diagram visualization
- ✅ Data export (CSV/JSON)
- ✅ Foreign key navigation
- ✅ Query history and saved queries

---

## 🏗️ Architecture

### Frontend Structure

```
frontend/src/
├── lib/
│   ├── api/                    # API integration layer
│   │   ├── config.ts           # API configuration
│   │   ├── client.ts           # HTTP client
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── errors.ts           # Error handling
│   │   └── services/           # API service modules
│   │       ├── connections.service.ts
│   │       ├── schemas.service.ts
│   │       ├── data.service.ts
│   │       ├── queries.service.ts
│   │       └── ...
│   ├── query/                  # React Query utilities
│   │   ├── queryKeys.ts        # Query key factory
│   │   ├── queryConfig.ts      # Query configuration
│   │   └── cacheUtils.ts       # Cache utilities
│   └── notifications.ts        # Notification utilities
├── contexts/
│   └── ConnectionContext.tsx   # Global connection state
├── components/
│   ├── connection/             # Connection management
│   ├── query/                  # Query components
│   ├── error/                  # Error components
│   └── empty/                  # Empty state components
└── pages/
    ├── SchemaBrowser.tsx       # Schema browsing
    ├── TableViewer.tsx         # Table data viewing
    ├── QueryBuilder.tsx        # SQL query execution
    └── ERDiagram.tsx           # ER diagram
```

### Backend API Structure

```
backend/src/
├── connections/                # Connection management
├── schemas/                    # Schema & metadata
├── data/                       # Table data operations
├── queries/                    # Query execution
├── query-history/             # Query history & saved queries
├── diagram/                    # ER diagram generation
├── export/                     # Data export
└── foreign-keys/              # Foreign key navigation
```

---

## 🔌 API Integration

### API Client

The API client (`lib/api/client.ts`) handles all HTTP requests with:
- Automatic retry logic
- Request timeout handling
- Error parsing and transformation
- Type-safe responses

**Example Usage:**
```typescript
import apiClient from '@/lib/api/client';

// GET request
const data = await apiClient.get<MyType>('endpoint');

// POST request
const result = await apiClient.post<ResultType>('endpoint', { data });
```

### API Services

All API calls are organized into service modules. For complete API service documentation with all methods and examples, see **[API_SERVICE_DOCUMENTATION.md](./API_SERVICE_DOCUMENTATION.md)**.

Available services:
- `connectionsService` - Connection management
- `schemasService` - Schema and metadata
- `dataService` - Table data operations
- `queriesService` - Query execution
- `queryHistoryService` - Query history and saved queries
- `diagramService` - ER diagram generation
- `exportService` - Data export
- `foreignKeysService` - Foreign key navigation
- `indexRecommendationsService` - Index analysis
- `searchService` - Global search
- `querySnippetsService` - Query snippets

### API Configuration

Configure the API base URL in `lib/api/config.ts`:

```typescript
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000, // 30 seconds
  retries: 2,
};
```

**Environment Variable:**
```bash
# .env
VITE_API_URL=http://localhost:3000/api
```

---

## 🔄 State Management

The application uses React Query for server state management and React Context for global client state.

For complete state management documentation including:
- Query keys factory
- Query configuration
- Cache management utilities
- Connection context usage
- Common patterns and best practices

See **[STATE_MANAGEMENT_DOCUMENTATION.md](./STATE_MANAGEMENT_DOCUMENTATION.md)**.

---

## ⚠️ Error Handling

### Error Types

The application uses custom error classes:

```typescript
import { ApiException, getErrorMessage } from '@/lib/api/errors';

try {
  await connectionsService.connect(id);
} catch (error) {
  if (error instanceof ApiException) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status);
  } else {
    console.error('Unknown error:', getErrorMessage(error));
  }
}
```

### Error Display Components

Use error display components for consistent UX:

```typescript
import { ErrorDisplay } from '@/components/error/ErrorDisplay';

<ErrorDisplay
  title="Connection Error"
  message={error.message}
  description="Please check your connection settings"
  onRetry={() => refetch()}
/>
```

### Global Error Boundary

The app is wrapped with an ErrorBoundary:

```typescript
import { ErrorBoundary } from '@/components/error/ErrorBoundary';

<ErrorBoundary onError={(error, errorInfo) => {
  logError(error, 'ErrorBoundary');
}}>
  <App />
</ErrorBoundary>
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:3000/api

# Optional: Development settings
VITE_DEV_MODE=true
```

### API Base URL

The API base URL is configured in `lib/api/config.ts` and can be overridden with the `VITE_API_URL` environment variable.

**Default:** `http://localhost:3000/api`

### CORS Configuration

The backend must allow requests from the frontend origin. Configure in `backend/src/main.ts`:

```typescript
app.enableCors({
  origin: ['http://localhost:8080', 'http://localhost:5173'],
  credentials: true,
});
```

---

## 🚀 Setup Instructions

For complete setup instructions, see **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**.

---

## 🧪 Testing

### Test Pages

Interactive test pages available in the application:
- `/api-test` - API foundation tests
- `/state-test` - State management tests
- `/ui-ux-test` - UI/UX tests

---

## 🔧 Troubleshooting

### Common Issues

#### 1. CORS Errors

**Problem:** Browser blocks API requests

**Solution:**
- Ensure backend CORS allows frontend origin
- Check `backend/src/main.ts` CORS configuration
- Verify frontend URL matches allowed origins

#### 2. Connection Refused

**Problem:** Cannot connect to backend

**Solution:**
- Verify backend is running: `curl http://localhost:3000/api/health`
- Check `VITE_API_URL` in `.env`
- Verify firewall/network settings

#### 3. Connection Pool Not Found

**Problem:** "Connection not found or not connected" error

**Solution:**
- Reconnect to database after backend restart
- Connection pools are lost on server restart
- Use Connection Manager to reconnect

#### 4. Stale Data

**Problem:** Data doesn't update after changes

**Solution:**
- Invalidate React Query cache
- Use `queryClient.invalidateQueries()`
- Or refresh the page

#### 5. Type Errors

**Problem:** TypeScript errors in API calls

**Solution:**
- Ensure types match backend response
- Check `lib/api/types.ts` for correct interfaces
- Update types if backend changes

---

## 📚 Additional Resources

### Documentation Files

- **[API_SERVICE_DOCUMENTATION.md](./API_SERVICE_DOCUMENTATION.md)** - Frontend API service reference
- **[STATE_MANAGEMENT_DOCUMENTATION.md](./STATE_MANAGEMENT_DOCUMENTATION.md)** - State management guide
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup instructions
- **[../backend/_docs/API_DOCUMENTATION.md](../backend/_docs/API_DOCUMENTATION.md)** - Backend API endpoints reference
- **[../backend/_docs/ARCHITECTURE.md](../backend/_docs/ARCHITECTURE.md)** - System architecture

---

## 🎯 Best Practices

### API Calls

1. **Always use service functions** - Don't call `apiClient` directly
2. **Handle errors gracefully** - Use try-catch and error components
3. **Use React Query** - Don't use `useState` + `useEffect` for data fetching
4. **Invalidate caches** - When data changes, invalidate related queries

### State Management

1. **Use query keys consistently** - Use `queryKeys` factory
2. **Configure queries properly** - Use `getDefaultQueryOptions`
3. **Invalidate on mutations** - Always invalidate after mutations
4. **Persist connection state** - Use `ConnectionContext` for global state

### Error Handling

1. **Use error components** - `ErrorDisplay` for consistent UX
2. **Log errors** - Use `logError` for debugging
3. **Show user-friendly messages** - Use `getErrorMessage`
4. **Handle connection errors** - Use `ConnectionErrorHandler`

---

## 📝 License

MIT

---


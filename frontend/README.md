# DB Visualizer - Frontend

React frontend for the DB Visualizer application - a PostgreSQL database visualization and management tool.

## 🚀 Quick Start

For complete setup instructions, see [_docs/SETUP_GUIDE.md](../_docs/SETUP_GUIDE.md).

**Quick commands:**
```bash
npm install
echo "VITE_API_URL=http://localhost:3000/api" > .env  # Optional
npm run dev
```

The frontend will run on `http://localhost:8080` or `http://localhost:5173`

## 📚 Documentation

### Integration Documentation

- **[_docs/FRONTEND_INTEGRATION_README.md](../_docs/FRONTEND_INTEGRATION_README.md)** - Complete integration guide
- **[_docs/SETUP_GUIDE.md](../_docs/SETUP_GUIDE.md)** - Setup instructions
- **[_docs/API_SERVICE_DOCUMENTATION.md](../_docs/API_SERVICE_DOCUMENTATION.md)** - API service reference
- **[_docs/STATE_MANAGEMENT_DOCUMENTATION.md](../_docs/STATE_MANAGEMENT_DOCUMENTATION.md)** - State management guide


## 🛠️ Technologies

- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **React** - UI framework
- **React Query (TanStack Query)** - Server state management
- **shadcn-ui** - UI component library
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **ReactFlow** - ER diagram visualization

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start dev server

# Build
npm run build           # Build for production
npm run build:dev       # Build in development mode
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run ESLint
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```bash
# API Base URL (default: http://localhost:3000/api)
VITE_API_URL=http://localhost:3000/api
```

### API Configuration

The API base URL is configured in `src/lib/api/config.ts` and can be overridden with the `VITE_API_URL` environment variable.

## 🏗️ Project Structure

```
frontend/src/
├── lib/
│   ├── api/              # API integration layer
│   │   ├── config.ts     # API configuration
│   │   ├── client.ts     # HTTP client
│   │   ├── types.ts      # TypeScript interfaces
│   │   ├── errors.ts     # Error handling
│   │   └── services/     # API service modules
│   ├── query/            # React Query utilities
│   │   ├── queryKeys.ts  # Query key factory
│   │   ├── queryConfig.ts # Query configuration
│   │   └── cacheUtils.ts # Cache utilities
│   └── notifications.ts  # Notification utilities
├── contexts/
│   └── ConnectionContext.tsx  # Global connection state
├── components/
│   ├── connection/       # Connection management
│   ├── query/            # Query components
│   ├── error/            # Error components
│   └── empty/            # Empty state components
└── pages/
    ├── SchemaBrowser.tsx # Schema browsing
    ├── TableViewer.tsx  # Table data viewing
    ├── QueryBuilder.tsx # SQL query execution
    └── ERDiagram.tsx     # ER diagram
```

## 🔌 API Integration

The frontend communicates with the NestJS backend through a centralized API client. All API calls are organized into service modules:

- `connectionsService` - Connection management
- `schemasService` - Schema and metadata
- `dataService` - Table data operations
- `queriesService` - Query execution
- `queryHistoryService` - Query history and saved queries
- `diagramService` - ER diagram generation
- `exportService` - Data export
- `foreignKeysService` - Foreign key navigation

See [_docs/API_SERVICE_DOCUMENTATION.md](../_docs/API_SERVICE_DOCUMENTATION.md) for complete API reference.

## 🔄 State Management

The application uses React Query for server state management:

- **Query Keys:** Centralized factory in `lib/query/queryKeys.ts`
- **Query Configuration:** Default options in `lib/query/queryConfig.ts`
- **Cache Management:** Utilities in `lib/query/cacheUtils.ts`
- **Connection Context:** Global state in `contexts/ConnectionContext.tsx`

See [_docs/STATE_MANAGEMENT_DOCUMENTATION.md](../_docs/STATE_MANAGEMENT_DOCUMENTATION.md) for detailed guide.

## 🐛 Troubleshooting

### CORS Errors

Ensure backend CORS allows frontend origin. Check `backend/src/main.ts`.

### API Connection Failed

- Verify backend is running: `curl http://localhost:3000/api/health`
- Check `VITE_API_URL` in `.env`
- Check browser console for errors

### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

See [_docs/SETUP_GUIDE.md](../_docs/SETUP_GUIDE.md) for more troubleshooting tips.

## 📝 License

MIT

---

**For complete setup instructions, see [_docs/SETUP_GUIDE.md](../_docs/SETUP_GUIDE.md)**

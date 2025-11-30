# Architecture Documentation

## 📋 Overview

This document describes the architecture, design patterns, and technical decisions for the DB Visualizer Backend.

## 🏗️ System Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React/TS)    │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────────────────┐
│   Backend API (NestJS)      │
│   ┌─────────────────────┐   │
│   │  Connection Manager │   │
│   │  (Connection Pools) │   │
│   └─────────────────────┘   │
└────────┬────────────────────┘
         │ PostgreSQL Protocol
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  Database(s)    │
└─────────────────┘
```

## 📦 Module Structure

```
backend/
├── src/
│   ├── app.module.ts              # Root module
│   ├── main.ts                    # Application entry point
│   ├── common/                    # Shared utilities
│   │   ├── database/
│   │   │   ├── connection-manager.service.ts
│   │   │   └── query-builder.service.ts
│   │   ├── interceptors/
│   │   │   └── http-exception.filter.ts
│   │   └── utils/
│   │       └── encryption.util.ts
│   ├── connections/               # Connection Management
│   │   ├── connections.controller.ts
│   │   ├── connections.service.ts
│   │   ├── connections.repository.ts
│   │   └── dto/
│   ├── schemas/                   # Schema & Metadata
│   │   ├── schemas.controller.ts
│   │   ├── schemas.service.ts
│   │   └── interfaces/
│   ├── data/                      # Table Data Operations
│   │   ├── data.controller.ts
│   │   ├── data.service.ts
│   │   └── interfaces/
│   ├── queries/                   # Query Execution
│   │   ├── queries.controller.ts
│   │   ├── queries.service.ts
│   │   └── interfaces/
│   ├── query-history/             # Query History & Saved Queries
│   │   ├── query-history.controller.ts
│   │   ├── query-history.service.ts
│   │   └── repositories/
│   ├── diagram/                   # ER Diagram
│   │   ├── diagram.controller.ts
│   │   ├── diagram.service.ts
│   │   └── interfaces/
│   ├── export/                    # Data Export
│   │   ├── export.controller.ts
│   │   ├── export.service.ts
│   │   └── interfaces/
│   └── foreign-keys/              # FK Navigation
│       ├── foreign-keys.controller.ts
│       ├── foreign-keys.service.ts
│       └── interfaces/
└── database/                      # File storage
    ├── connections.json
    ├── query-history/
    └── saved-queries/
```

## 🔧 Core Components

### 1. Connection Manager Service

**Purpose:** Manages PostgreSQL connection pools for multiple databases.

**Key Features:**
- Singleton service shared across modules
- Connection pool per database connection
- Automatic pool lifecycle management
- Connection status tracking

**Implementation:**
```typescript
@Injectable()
export class ConnectionManagerService {
  private pools = new Map<string, Pool>();
  
  createPool(connectionId: string, config: ConnectionConfig): Pool
  getPool(connectionId: string): Pool | undefined
  removePool(connectionId: string): void
}
```

### 2. Query Builder Service

**Purpose:** Builds dynamic SQL queries with filtering, sorting, pagination, and search.

**Key Features:**
- Parameterized queries (SQL injection prevention)
- Dynamic WHERE clause construction
- ORDER BY clause generation
- LIMIT/OFFSET pagination
- Full-text search support

**Implementation:**
```typescript
@Injectable()
export class QueryBuilderService {
  buildSelectQuery(table: string, options: QueryOptions): { query: string; params: any[] }
  buildCountQuery(table: string, options: QueryOptions): { query: string; params: any[] }
}
```

### 3. Encryption Utility

**Purpose:** Encrypts/decrypts sensitive connection data (passwords).

**Implementation:**
- AES-256-CBC encryption
- IV (Initialization Vector) for each encryption
- Secure key management via environment variables

## 📊 Data Flow

### Connection Flow
```
1. User creates connection → POST /connections
2. Connection saved (encrypted) → connections.json
3. User connects → POST /connections/:id/connect
4. Connection pool created → ConnectionManagerService
5. Pool stored in memory → Map<connectionId, Pool>
```

### Query Execution Flow
```
1. User submits query → POST /connections/:id/query
2. Service gets pool → ConnectionManagerService.getPool()
3. Query executed → pool.query()
4. Results returned → Response
5. History auto-saved → QueryHistoryRepository
```

### Schema Discovery Flow
```
1. Request schemas → GET /connections/:id/db/schemas
2. Query system catalogs → information_schema
3. Parse results → Build Schema objects
4. Return to frontend → JSON response
```

## 🔐 Security Architecture

### Password Encryption
- **Algorithm:** AES-256-CBC
- **Key Management:** Environment variable (`ENCRYPTION_KEY`)
- **IV Generation:** Random per encryption
- **Storage:** Encrypted passwords stored in JSON files

### SQL Injection Prevention
- **Parameterized Queries:** All user input uses `$1, $2, ...` placeholders
- **Query Builder:** Dynamically builds safe queries
- **Input Validation:** DTOs with class-validator

### Connection Security
- **Credential Storage:** Encrypted in file system
- **Connection Pooling:** Isolated pools per connection
- **SSL Support:** Configurable via connection settings

## 🗄️ Data Storage

### File-Based Storage

**Locations:**
- `database/connections.json` - Connection configurations
- `database/query-history/{connectionId}.json` - Query history
- `database/saved-queries/{connectionId}.json` - Saved queries

**Format:** JSON files with atomic writes

**Benefits:**
- Simple for local development
- No database required for metadata
- Easy to backup/restore

**Limitations:**
- Not suitable for production (consider database)
- File locking issues with concurrent writes
- No transactions

## 🎯 Design Patterns

### 1. Dependency Injection
- **Framework:** NestJS built-in DI
- **Usage:** All services injected via constructors
- **Benefits:** Testability, modularity, loose coupling

### 2. Repository Pattern
- **Usage:** `ConnectionsRepository`, `QueryHistoryRepository`
- **Purpose:** Abstract data access layer
- **Benefits:** Easy to swap storage backends

### 3. Service Layer Pattern
- **Usage:** Business logic in services, controllers handle HTTP
- **Benefits:** Separation of concerns, reusability

### 4. Singleton Pattern
- **Usage:** `ConnectionManagerService` as singleton
- **Purpose:** Shared connection pools across modules
- **Implementation:** NestJS module system

## 🔄 Module Dependencies

```
AppModule
├── ConfigModule (global)
├── ConnectionsModule
│   └── ConnectionManagerService (exported)
├── SchemasModule
│   └── ConnectionsModule (import)
├── DataModule
│   ├── ConnectionsModule (import)
│   └── QueryBuilderService
├── QueriesModule
│   ├── ConnectionsModule (import)
│   └── QueryHistoryModule (import)
├── QueryHistoryModule
│   └── ConnectionsModule (import)
├── DiagramModule
│   ├── ConnectionsModule (import)
│   └── SchemasModule (import)
├── ExportModule
│   ├── ConnectionsModule (import)
│   ├── DataModule (import)
│   └── QueriesModule (import)
└── ForeignKeysModule
    ├── ConnectionsModule (import)
    └── SchemasModule (import)
```

## 📈 Performance Considerations

### Connection Pooling
- **Pool Size:** Default 10 connections per pool
- **Idle Timeout:** Configurable per connection
- **Connection Reuse:** Significant performance improvement

### Query Optimization
- **Result Limiting:** Max rows per query
- **Query Timeout:** Prevents hanging queries
- **Metadata Caching:** Could be added in future

### Memory Management
- **Pool Cleanup:** Pools removed on disconnect
- **Result Streaming:** Large exports use streaming
- **Garbage Collection:** Node.js handles automatically

## 🧪 Testing Strategy

### Unit Tests
- Service layer logic
- Utility functions
- Query builders

### Integration Tests
- Full request/response cycles
- Database interactions
- Error handling

### Test Files
- `_scripts/TEST_INTEGRATION.sh` - Comprehensive integration tests (if exists)
- Phase-specific test scripts
- Manual testing guides

## 🚀 Deployment Architecture

### Development
```
npm run start:dev  # Hot reload
Port: 3000
CORS: localhost:5173
```

### Production (Recommended)
```
npm run build      # TypeScript compilation
npm run start:prod # Production server
Port: Process.env.PORT
CORS: Process.env.FRONTEND_URL
```

### Environment Variables
```
PORT=3000
FRONTEND_URL=http://localhost:5173
ENCRYPTION_KEY=<base64-encoded-key>
```

## 📝 Key Design Decisions

### 1. NestJS Framework
- **Reason:** TypeScript-first, modular architecture, excellent for APIs
- **Alternatives Considered:** Express, Fastify
- **Decision:** NestJS for structure and scalability

### 2. File-Based Storage
- **Reason:** Simple for local development, no database needed
- **Production:** Should migrate to PostgreSQL or Redis
- **Trade-off:** Simplicity vs. scalability

### 3. Connection Pooling
- **Reason:** Efficient database connection management
- **Implementation:** node-postgres Pool
- **Benefit:** Reuse connections, better performance

### 4. Parameterized Queries
- **Reason:** SQL injection prevention
- **Implementation:** Always use placeholders
- **Benefit:** Security by default

### 5. Modular Architecture
- **Reason:** Separation of concerns, maintainability
- **Structure:** Feature-based modules
- **Benefit:** Easy to extend and test

## 🔮 Future Enhancements

### Potential Improvements
1. **Database Backend:** Replace file storage with PostgreSQL
2. **Caching Layer:** Redis for metadata caching
3. **Authentication:** JWT-based auth for multi-user
4. **Real-time Updates:** WebSocket support
5. **Query Optimization:** Automatic query analysis
6. **Export Formats:** Excel, PDF support
7. **Connection Templates:** Pre-configured connection types

---

**Last Updated:** 2025-11-29


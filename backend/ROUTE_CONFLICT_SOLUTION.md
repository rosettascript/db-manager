# Route Conflict Solution

## 🔍 Problem

**Route Conflict Identified:**

1. **ConnectionsController** (`@Controller('connections')`):
   - `@Get(':id')` → Matches `/api/connections/:id` (too broad!)

2. **SchemasController** (`@Controller('connections/:connectionId')`):
   - `@Get('schemas')` → Should match `/api/connections/:connectionId/schemas`

**The Issue:**
When requesting `/api/connections/conn_xxx/schemas`, NestJS matches ConnectionsController's `@Get(':id')` first, treating "conn_xxx/schemas" as the ID parameter. SchemasController never gets a chance to match.

## ✅ Solution Options

### Option 1: Change Schema Routes Path (RECOMMENDED)
Use a different base path to avoid conflicts:
```
Before: /api/connections/:connectionId/schemas
After:  /api/connections/:connectionId/db/schemas
```

### Option 2: Use Separate Base Path
Move schemas to completely different path:
```
/api/db/:connectionId/schemas
```

### Option 3: Add Route Validation
Add validation to ConnectionsController `:id` route to reject IDs with slashes.

### Option 4: Reorganize Route Structure
Make connections operations use a different pattern.

## 🎯 Recommended Fix: Option 1

Change the base path for schema routes to include `/db/` prefix to clearly separate database operations from connection management:

```
/api/connections/:connectionId/db/schemas
/api/connections/:connectionId/db/tables
/api/connections/:connectionId/db/stats
```

This clearly distinguishes:
- Connection management: `/api/connections/:id/*`
- Database operations: `/api/connections/:id/db/*`


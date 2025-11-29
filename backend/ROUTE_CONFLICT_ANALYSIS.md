# Route Conflict Analysis

## 🔍 Problem Identified

The schema routes are not being reached because of route matching conflicts in NestJS.

### Route Structure:

**ConnectionsController:**
- `@Controller('connections')`
  - `@Get()` → `/api/connections`
  - `@Get(':id')` → `/api/connections/:id` ⚠️ **TOO BROAD**
  - `@Get(':id/status')` → `/api/connections/:id/status`
  - `@Post(':id/test')` → `/api/connections/:id/test`
  - etc.

**SchemasController:**
- `@Controller('connections/:connectionId')`
  - `@Get('schemas')` → `/api/connections/:connectionId/schemas`
  - `@Get('tables')` → `/api/connections/:connectionId/tables`
  - etc.

## 🐛 The Issue

NestJS matches routes in order. The `@Get(':id')` route in ConnectionsController is a catch-all that matches:
- `/api/connections/conn_123` ✅ (intended)
- `/api/connections/conn_123/schemas` ❌ (unintended - treats "conn_123/schemas" as the ID)

When you request `/api/connections/conn_xxx/schemas`, NestJS:
1. Matches it to `@Get(':id')` in ConnectionsController
2. Calls `findOne('conn_xxx/schemas')` 
3. Never reaches SchemasController

## 💡 Solution Options

### Option 1: Move specific routes before generic route (RECOMMENDED)
Reorder routes in ConnectionsController so specific paths come first:
```typescript
@Get(':id/status')  // Specific - comes first
@Get(':id')         // Generic - comes last
```

### Option 2: Use route guards/validation
Add validation to `:id` route to reject paths with slashes.

### Option 3: Change route structure
Use a different base path for schemas like `/api/schemas/:connectionId`

### Option 4: Use route prefixes
Move all connection-specific operations to `/api/connections/:id/*` pattern

## ✅ Recommended Fix

Move the generic `@Get(':id')` route to be LAST in ConnectionsController, after all specific routes like `:id/status`, `:id/test`, etc.


# Dependency Injection Investigation

## Problem
- Schema routes work (`/api/connections/:id/db/schemas`)
- Data routes don't work (`/api/connections/:id/db/tables/:schema/:table/data`)
- Both should use the same ConnectionManagerService instance
- Error: "Connection not found or not connected"

## Current Setup

### Modules
1. **ConnectionsModule**
   - Provides: ConnectionManagerService
   - Exports: ConnectionManagerService, ConnectionsService

2. **SchemasModule**
   - Imports: ConnectionsModule
   - Works correctly ✅

3. **DataModule**
   - Imports: ConnectionsModule
   - Should work but doesn't ❌

## Hypothesis

### Possibility 1: Multiple Instances
ConnectionManagerService might be instantiated multiple times:
- Once in ConnectionsModule
- Once somewhere else?

### Possibility 2: Module Loading Order
DataModule might be loading before ConnectionsModule initializes the pool.

### Possibility 3: Service Scope
ConnectionManagerService pools map might be instance-specific.

## Investigation Steps

1. ✅ Added debug logging to DataService
2. ✅ Verified modules are set up correctly
3. ⬜ Check if ConnectionManagerService is a singleton
4. ⬜ Add instance ID tracking
5. ⬜ Verify pool creation timing

## Next Steps

1. Make ConnectionManagerService explicitly a global singleton
2. Add instance tracking to verify same instance is used
3. Check module initialization order
4. Add logging to pool creation and retrieval


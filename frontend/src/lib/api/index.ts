/**
 * API Module - Main export file
 * 
 * Exports all API-related types, utilities, and client functions
 */

export * from './config';
export * from './types';
export * from './errors';
export * from './client';

// Export services
export * from './services/connections.service';
export * from './services/schemas.service';
export * from './services/data.service';
export * from './services/queries.service';
export * from './services/query-history.service';
export * from './services/diagram.service';
export * from './services/export.service';
export * from './services/foreign-keys.service';
export * from './services/charts.service';
export * from './services/schema-dump.service';

// Re-export apiClient as default for convenience
export { apiClient as default } from './client';


/**
 * Notification Utilities
 * 
 * Centralized notification helpers for consistent user feedback
 */

import { toast } from 'sonner';

/**
 * Success notification
 */
export function notifySuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

/**
 * Error notification
 */
export function notifyError(message: string, description?: string) {
  toast.error(message, {
    description,
    duration: 5000, // Longer duration for errors
  });
}

/**
 * Info notification
 */
export function notifyInfo(message: string, description?: string) {
  toast.info(message, {
    description,
    duration: 3000,
  });
}

/**
 * Warning notification
 */
export function notifyWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
    duration: 4000,
  });
}

/**
 * Loading notification with promise tracking
 */
export function notifyLoading(promise: Promise<any>, messages: {
  loading: string;
  success: string;
  error: string;
}) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
}

/**
 * Connection notifications
 */
export const connectionNotifications = {
  connected: (connectionName: string, connectionTime?: number) => {
    notifySuccess(
      `Connected to ${connectionName}`,
      connectionTime ? `Connection established in ${connectionTime}ms` : undefined
    );
  },
  disconnected: (connectionName: string) => {
    notifyInfo(`Disconnected from ${connectionName}`);
  },
  failed: (error: string) => {
    notifyError('Connection failed', error);
  },
  created: (connectionName: string) => {
    notifySuccess(`Connection "${connectionName}" created successfully`);
  },
  updated: (connectionName: string) => {
    notifySuccess(`Connection "${connectionName}" updated successfully`);
  },
  deleted: (connectionName: string) => {
    notifyInfo(`Connection "${connectionName}" deleted`);
  },
};

/**
 * Query execution notifications
 */
export const queryNotifications = {
  executing: () => {
    return toast.loading('Executing query...', {
      id: 'query-execution',
    });
  },
  success: (rowCount: number, executionTime: number) => {
    toast.success('Query executed successfully', {
      id: 'query-execution',
      description: `${rowCount} rows returned in ${executionTime}ms`,
    });
  },
  failed: (error: string) => {
    toast.error('Query execution failed', {
      id: 'query-execution',
      description: error,
      duration: 5000,
    });
  },
  cancelled: () => {
    toast.info('Query cancellation requested', {
      id: 'query-execution',
    });
  },
};

/**
 * Data export notifications
 */
export const exportNotifications = {
  exporting: () => {
    return toast.loading('Exporting data...', {
      id: 'data-export',
    });
  },
  success: (format: string) => {
    toast.success(`Data exported as ${format.toUpperCase()}`, {
      id: 'data-export',
      description: 'Your download should start shortly',
    });
  },
  failed: (error: string) => {
    toast.error('Export failed', {
      id: 'data-export',
      description: error,
      duration: 5000,
    });
  },
};

/**
 * Schema refresh notifications
 */
export const schemaNotifications = {
  refreshing: () => {
    return toast.loading('Refreshing schema cache...', {
      id: 'schema-refresh',
    });
  },
  success: () => {
    toast.success('Schema cache refreshed', {
      id: 'schema-refresh',
      description: 'All schemas and tables are up to date',
    });
  },
  failed: (error: string) => {
    toast.error('Failed to refresh schema cache', {
      id: 'schema-refresh',
      description: error,
      duration: 5000,
    });
  },
};

/**
 * Query history notifications
 */
export const queryHistoryNotifications = {
  saved: (queryName: string) => {
    notifySuccess(`Query "${queryName}" saved successfully`);
  },
  deleted: () => {
    notifyInfo('Query deleted successfully');
  },
  cleared: () => {
    notifyInfo('Query history cleared');
  },
  failed: (error: string) => {
    notifyError('Operation failed', error);
  },
};

/**
 * Validation notifications
 */
export const validationNotifications = {
  required: (field: string) => {
    notifyError('Validation Error', `${field} is required`);
  },
  invalid: (field: string, reason?: string) => {
    notifyError('Validation Error', `${field} is invalid${reason ? `: ${reason}` : ''}`);
  },
  empty: (item: string) => {
    notifyWarning(`${item} is empty`);
  },
};


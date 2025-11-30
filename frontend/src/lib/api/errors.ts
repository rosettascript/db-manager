/**
 * API Error Handling Utilities
 */

import type { ApiError } from './types';

export class ApiException extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public error?: string,
    public path?: string,
  ) {
    super(message);
    this.name = 'ApiException';
  }

  static fromResponse(errorResponse: ApiError): ApiException {
    return new ApiException(
      errorResponse.statusCode,
      errorResponse.message || 'An error occurred',
      errorResponse.error,
      errorResponse.path,
    );
  }
}

/**
 * Handle API errors and throw appropriate exceptions
 */
export function handleApiError(error: unknown): never {
  if (error instanceof ApiException) {
    throw error;
  }

  if (error instanceof Error) {
    // Network errors, timeouts, etc.
    if (error.message.includes('fetch')) {
      throw new ApiException(
        0,
        'Network error: Unable to connect to the server. Please check your connection.',
      );
    }

    if (error.message.includes('timeout')) {
      throw new ApiException(
        408,
        'Request timeout: The server took too long to respond.',
      );
    }

    throw new ApiException(500, error.message || 'An unexpected error occurred');
  }

  throw new ApiException(500, 'An unexpected error occurred');
}

/**
 * Check if response is an error response
 */
export function isErrorResponse(response: any): response is ApiError {
  return (
    response &&
    typeof response === 'object' &&
    'statusCode' in response &&
    'message' in response
  );
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiException) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if error is a connection error
 */
export function isConnectionError(error: unknown): boolean {
  if (error instanceof ApiException) {
    return error.statusCode === 0 || error.message.toLowerCase().includes('connection');
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout')
    );
  }
  return false;
}

/**
 * Check if error is a database connection error
 */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof ApiException) {
    const message = error.message.toLowerCase();
    return (
      error.statusCode === 0 ||
      message.includes('connection') ||
      message.includes('not found') ||
      message.includes('not connected') ||
      message.includes('database')
    );
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('connection not found') ||
      message.includes('not connected') ||
      message.includes('database connection')
    );
  }
  return false;
}

/**
 * Log error for debugging and monitoring
 */
export function logError(error: unknown, context?: string): void {
  const errorLog = {
    message: getErrorMessage(error),
    context,
    timestamp: new Date().toISOString(),
    type: error instanceof ApiException ? 'ApiException' : error instanceof Error ? 'Error' : 'Unknown',
    statusCode: error instanceof ApiException ? error.statusCode : undefined,
    stack: error instanceof Error ? error.stack : undefined,
  };

  // Store in localStorage for debugging (optional, limited to last 50 errors)
  try {
    const existingLogs = JSON.parse(localStorage.getItem('error-logs') || '[]');
    existingLogs.push(errorLog);
    // Keep only last 50 errors
    if (existingLogs.length > 50) {
      existingLogs.splice(0, existingLogs.length - 50);
    }
    localStorage.setItem('error-logs', JSON.stringify(existingLogs));
  } catch (e) {
    // Ignore localStorage errors
  }

  // TODO: In production, send to error tracking service (e.g., Sentry)
  // if (import.meta.env.PROD) {
  //   errorTrackingService.captureException(error, { context });
  // }
}

/**
 * Get error logs from localStorage
 */
export function getErrorLogs(): Array<{
  message: string;
  context?: string;
  timestamp: string;
  type: string;
  statusCode?: number;
  stack?: string;
}> {
  try {
    return JSON.parse(localStorage.getItem('error-logs') || '[]');
  } catch {
    return [];
  }
}

/**
 * Clear error logs
 */
export function clearErrorLogs(): void {
  try {
    localStorage.removeItem('error-logs');
  } catch {
    // Ignore errors
  }
}


/**
 * Base API Client
 * 
 * Handles all HTTP requests to the backend API with error handling,
 * retry logic, and timeout support.
 */

import { API_CONFIG, getApiUrl } from './config';
import { ApiException, handleApiError, isErrorResponse } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a timeout promise that rejects after specified time
 */
function createTimeout(timeoutMs: number, signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // Clear timeout if abort signal is triggered
    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new Error('Request aborted'));
    });
  });
}

/**
 * Make HTTP request with retry logic and timeout
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions,
): Promise<T> {
  const {
    method,
    body,
    headers = {},
    timeout = API_CONFIG.timeout,
    retries = API_CONFIG.retries,
    signal,
  } = options;

  const url = getApiUrl(endpoint);
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    signal,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    fetchOptions.body = JSON.stringify(body);
  }

  let lastError: Error | null = null;

  // Retry logic
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create fetch request with timeout
      const fetchPromise = fetch(url, fetchOptions);
      const timeoutPromise = createTimeout(timeout, signal);

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (isErrorResponse(errorData)) {
          throw ApiException.fromResponse(errorData);
        }

        throw new ApiException(
          response.status,
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.error,
          endpoint,
        );
      }

      // Handle empty responses (204 No Content, etc.)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // For non-JSON responses (like file downloads), return response
        if (contentType?.includes('text/csv') || contentType?.includes('application/json')) {
          // Still try to parse as JSON if it's marked as JSON
          const text = await response.text();
          if (text) {
            try {
              return JSON.parse(text) as T;
            } catch {
              return text as unknown as T;
            }
          }
          return {} as T;
        }
        return {} as T;
      }

      // Parse JSON response
      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        error instanceof ApiException &&
        (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404)
      ) {
        throw error;
      }

      // Don't retry on abort
      if (error instanceof Error && error.message === 'Request aborted') {
        throw error;
      }

      // If not the last attempt, wait and retry
      if (attempt < retries) {
        await sleep(API_CONFIG.retryDelay * (attempt + 1)); // Exponential backoff
        continue;
      }

      // Last attempt failed, throw error
      throw handleApiError(error);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw handleApiError(lastError || new Error('Request failed'));
}

/**
 * API Client with typed request methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'POST', body });
  },

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: { data?: any; headers?: Record<string, string>; timeout?: number; retries?: number; signal?: AbortSignal }): Promise<T> {
    const { data, ...restOptions } = options || {};
    return request<T>(endpoint, { ...restOptions, method: 'DELETE', body: data });
  },
};

export default apiClient;


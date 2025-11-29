import { AlertCircle, RefreshCw, AlertTriangle, XCircle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ApiException } from '@/lib/api/errors';

interface ErrorDisplayProps {
  error: unknown;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Error Display Component
 * Displays user-friendly error messages with retry options
 */
export const ErrorDisplay = ({
  error,
  title,
  description,
  onRetry,
  onDismiss,
  className = '',
}: ErrorDisplayProps) => {
  // Get error message and type
  const getErrorInfo = () => {
    if (error instanceof ApiException) {
      return {
        message: error.message,
        type: error.statusCode,
        icon: getErrorIcon(error.statusCode),
        title: title || getErrorTitle(error.statusCode),
        description: description || getErrorDescription(error.statusCode, error.message),
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        type: 'generic',
        icon: XCircle,
        title: title || 'An error occurred',
        description: description || error.message,
      };
    }

    return {
      message: 'An unexpected error occurred',
      type: 'unknown',
      icon: XCircle,
      title: title || 'Unknown error',
      description: description || 'Something went wrong. Please try again.',
    };
  };

  const errorInfo = getErrorInfo();
  const Icon = errorInfo.icon;

  return (
    <Alert variant={errorInfo.type >= 500 || errorInfo.type === 0 ? 'destructive' : 'default'} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{errorInfo.title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{errorInfo.description}</p>
        {onRetry && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

/**
 * Get appropriate icon for error status code
 */
function getErrorIcon(statusCode: number | string) {
  if (statusCode === 0 || statusCode === 'generic') return WifiOff; // Network error
  if (typeof statusCode === 'number' && statusCode >= 500) return AlertCircle; // Server error
  if (statusCode === 404) return AlertCircle; // Not found
  if (statusCode === 401 || statusCode === 403) return AlertTriangle; // Auth error
  return XCircle; // Default
}

/**
 * Get user-friendly error title based on status code
 */
function getErrorTitle(statusCode: number | string): string {
  if (statusCode === 0 || statusCode === 'generic') return 'Connection Error';
  if (statusCode === 400) return 'Invalid Request';
  if (statusCode === 401) return 'Authentication Required';
  if (statusCode === 403) return 'Access Denied';
  if (statusCode === 404) return 'Not Found';
  if (statusCode === 408) return 'Request Timeout';
  if (typeof statusCode === 'number' && statusCode >= 500) return 'Server Error';
  return 'Error';
}

/**
 * Get user-friendly error description based on status code
 */
function getErrorDescription(statusCode: number | string, defaultMessage: string): string {
  if (statusCode === 0 || statusCode === 'generic') {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }
  if (statusCode === 400) {
    return 'The request was invalid. Please check your input and try again.';
  }
  if (statusCode === 401) {
    return 'You need to be authenticated to perform this action. Please log in and try again.';
  }
  if (statusCode === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (statusCode === 404) {
    return 'The requested resource was not found. It may have been deleted or moved.';
  }
  if (statusCode === 408) {
    return 'The request took too long to complete. Please try again.';
  }
  if (typeof statusCode === 'number' && statusCode >= 500) {
    return 'The server encountered an error. Please try again later or contact support if the problem persists.';
  }

  return defaultMessage || 'An error occurred. Please try again.';
}

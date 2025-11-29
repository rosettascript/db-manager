import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Plug } from 'lucide-react';
import { ApiException, isDatabaseConnectionError, logError } from '@/lib/api/errors';
import { connectionsService } from '@/lib/api/services/connections.service';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

interface ConnectionErrorHandlerProps {
  error: unknown;
  connectionId?: string;
  onRetry?: () => void;
  onReconnect?: () => void;
  className?: string;
}

/**
 * Connection Error Handler Component
 * Handles database connection errors with retry and reconnect options
 */
export const ConnectionErrorHandler = ({
  error,
  connectionId,
  onRetry,
  onReconnect,
  className = '',
}: ConnectionErrorHandlerProps) => {
  const queryClient = useQueryClient();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const isDbConnectionError = isDatabaseConnectionError(error);
  const isApiError = error instanceof ApiException;

  if (!isDbConnectionError && !isApiError) {
    return null;
  }

  const handleReconnect = async () => {
    if (!connectionId) {
      toast.error('No connection ID available');
      return;
    }

    setIsReconnecting(true);
    try {
      // Attempt to reconnect
      await connectionsService.connect(connectionId);
      toast.success('Connection re-established');

      // Invalidate related queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
      queryClient.invalidateQueries({ queryKey: ['tables', connectionId] });
      queryClient.invalidateQueries({ queryKey: ['database-stats', connectionId] });

      onReconnect?.();
    } catch (reconnectError) {
      logError(reconnectError, 'ConnectionErrorHandler.handleReconnect');
      toast.error('Failed to reconnect. Please check your connection settings.');
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleRetry = () => {
    if (connectionId) {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] });
      queryClient.invalidateQueries({ queryKey: ['tables', connectionId] });
      queryClient.invalidateQueries({ queryKey: ['database-stats', connectionId] });
    }
    onRetry?.();
  };

  const getErrorMessage = () => {
    if (error instanceof ApiException) {
      if (error.statusCode === 0) {
        return 'Unable to connect to the server. Please check your internet connection.';
      }
      if (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('not connected')) {
        return 'Database connection is not active. Please reconnect to continue.';
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'A database connection error occurred.';
  };

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Connection Error</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{getErrorMessage()}</p>
        <div className="flex gap-2 pt-2">
          {connectionId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReconnect}
              disabled={isReconnecting}
            >
              {isReconnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <Plug className="w-4 h-4 mr-2" />
                  Reconnect
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};


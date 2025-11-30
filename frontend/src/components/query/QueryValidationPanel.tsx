/**
 * Query Validation Panel
 * Provides real-time syntax checking and error highlighting
 */

import { useState, useEffect } from 'react';
import { useValidateQuery } from '@/hooks/useQueryValidation';
import { useConnection } from '@/contexts/ConnectionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueryValidationPanelProps {
  query: string;
  onQueryChange?: (query: string) => void;
}

export function QueryValidationPanel({ query, onQueryChange }: QueryValidationPanelProps) {
  const { activeConnection } = useConnection();
  const [lastValidatedQuery, setLastValidatedQuery] = useState('');
  const validateMutation = useValidateQuery();

  // Auto-validate when query changes (debounced)
  useEffect(() => {
    if (!activeConnection || !query.trim()) return;

    const timer = setTimeout(() => {
      if (query !== lastValidatedQuery) {
        setLastValidatedQuery(query);
        validateMutation.mutate({
          connectionId: activeConnection.id,
          query,
        });
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query, activeConnection?.id]);

  const handleManualValidate = () => {
    if (activeConnection && query.trim()) {
      validateMutation.mutate({
        connectionId: activeConnection.id,
        query,
      });
    }
  };

  if (!activeConnection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Query Validation</CardTitle>
          <CardDescription>Connect to a database to validate queries</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const validation = validateMutation.data;
  const isValid = validation?.isValid ?? null;
  const isPending = validateMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Query Validation</CardTitle>
            <CardDescription>
              Real-time syntax checking and error detection
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualValidate}
            disabled={isPending || !query.trim()}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              'Validate'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isPending && validation && (
          <div className="space-y-4">
            {/* Validation Status */}
            <div className="flex items-center gap-2">
              {isValid ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-500">Query is valid</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-red-500">Query has errors</span>
                </>
              )}
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errors</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="max-h-[200px] mt-2">
                    <div className="space-y-2">
                      {validation.errors.map((error, idx) => (
                        <div key={idx} className="text-sm">
                          {error.line && error.column && (
                            <Badge variant="destructive" className="mr-2">
                              Line {error.line}, Col {error.column}
                            </Badge>
                          )}
                          {error.message}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warnings</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="max-h-[200px] mt-2">
                    <div className="space-y-2">
                      {validation.warnings.map((warning, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="font-medium">{warning.message}</div>
                          {warning.suggestion && (
                            <div className="text-muted-foreground mt-1">
                              💡 {warning.suggestion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {/* Suggestions */}
            {validation.suggestions.length > 0 && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertTitle>Suggestions</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="max-h-[200px] mt-2">
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {validation.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {isValid && validation.errors.length === 0 && validation.warnings.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                <p>Query is syntactically correct and ready to execute</p>
              </div>
            )}
          </div>
        )}

        {!isPending && !validation && query.trim() && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Click "Validate" to check query syntax</p>
          </div>
        )}

        {!query.trim() && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Enter a query to validate</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


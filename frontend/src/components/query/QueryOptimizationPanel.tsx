/**
 * Query Optimization Panel
 * Analyzes query performance and provides optimization recommendations
 */

import { useState } from 'react';
import { useOptimizeQuery } from '@/hooks/useQueryValidation';
import { useConnection } from '@/contexts/ConnectionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  TrendingUp,
  Loader2,
  AlertCircle,
  Lightbulb,
  BarChart3,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QueryOptimizationPanelProps {
  query: string;
}

export function QueryOptimizationPanel({ query }: QueryOptimizationPanelProps) {
  const { activeConnection } = useConnection();
  const [analyze, setAnalyze] = useState(true);
  const optimizeMutation = useOptimizeQuery();

  const handleOptimize = () => {
    if (activeConnection && query.trim()) {
      optimizeMutation.mutate({
        connectionId: activeConnection.id,
        query,
        analyze,
      });
    }
  };

  if (!activeConnection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Query Optimization</CardTitle>
          <CardDescription>Connect to a database to analyze queries</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const result = optimizeMutation.data;
  const isPending = optimizeMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Query Optimization</CardTitle>
            <CardDescription>
              Analyze performance and get optimization recommendations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="analyze"
                checked={analyze}
                onCheckedChange={(checked) => setAnalyze(!!checked)}
              />
              <Label htmlFor="analyze" className="text-sm cursor-pointer">
                Analyze
              </Label>
            </div>
            <Button
              onClick={handleOptimize}
              disabled={isPending || !query.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isPending && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Analyzing query...</span>
          </div>
        )}

        {!isPending && result && (
          <Tabs defaultValue="recommendations" className="space-y-4">
            <TabsList>
              <TabsTrigger value="recommendations">
                Recommendations ({result.recommendations.length})
              </TabsTrigger>
              <TabsTrigger value="plan">Execution Plan</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-4">
              {result.recommendations.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {result.recommendations.map((rec, idx) => (
                      <Alert
                        key={idx}
                        className={cn(
                          'border-l-4',
                          rec.priority === 'high' && 'border-l-red-500',
                          rec.priority === 'medium' && 'border-l-yellow-500',
                          rec.priority === 'low' && 'border-l-blue-500',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-4 w-4 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={
                                  rec.priority === 'high'
                                    ? 'destructive'
                                    : rec.priority === 'medium'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {rec.priority} priority
                              </Badge>
                              <Badge variant="outline">{rec.type}</Badge>
                            </div>
                            <AlertDescription>
                              <div className="font-medium mb-1">{rec.message}</div>
                              <div className="text-sm text-muted-foreground mb-2">
                                {rec.suggestion}
                              </div>
                              {rec.estimatedImpact && (
                                <div className="text-xs text-muted-foreground">
                                  Estimated impact: {rec.estimatedImpact}
                                </div>
                              )}
                            </AlertDescription>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No optimization recommendations. Query looks good!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="plan" className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="font-medium">Execution Plan</span>
                </div>
                <ScrollArea className="h-[400px]">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {result.originalPlan.plan}
                  </pre>
                </ScrollArea>
              </div>
              {result.originalPlan.planningTime && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Planning Time</div>
                    <div className="text-lg font-semibold">
                      {result.originalPlan.planningTime.toFixed(2)} ms
                    </div>
                  </div>
                  {result.originalPlan.executionTime && (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">Execution Time</div>
                      <div className="text-lg font-semibold">
                        {result.originalPlan.executionTime.toFixed(2)} ms
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {result.performanceMetrics.estimatedCost !== undefined && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Estimated Cost</div>
                    <div className="text-2xl font-bold">
                      {result.performanceMetrics.estimatedCost.toFixed(2)}
                    </div>
                  </div>
                )}
                {result.performanceMetrics.executionTime !== undefined && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Execution Time</div>
                    <div className="text-2xl font-bold">
                      {result.performanceMetrics.executionTime.toFixed(2)} ms
                    </div>
                  </div>
                )}
                {result.performanceMetrics.rowsExamined !== undefined && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Rows Examined</div>
                    <div className="text-2xl font-bold">
                      {result.performanceMetrics.rowsExamined.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {!isPending && !result && query.trim() && (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Click "Optimize" to analyze query performance</p>
          </div>
        )}

        {!query.trim() && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Enter a query to optimize</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


/**
 * Index Recommendations Dashboard Page
 */

import { useState } from 'react';
import { useIndexAnalysis, useIndexRecommendations, useIndexUsageStats } from '@/hooks/useIndexRecommendations';
import { useConnection } from '@/contexts/ConnectionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Copy,
  Database,
  Loader2,
  BarChart3,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';

export default function IndexRecommendations() {
  const { activeConnection } = useConnection();
  const [selectedSchema, setSelectedSchema] = useState<string | undefined>(undefined);
  
  const { data: analysis, isLoading: analysisLoading, error: analysisError } = useIndexAnalysis(
    activeConnection?.id,
    selectedSchema,
  );
  
  const { data: recommendations, isLoading: recLoading } = useIndexRecommendations(
    activeConnection?.id,
    selectedSchema,
  );
  
  const { data: usageStats, isLoading: statsLoading } = useIndexUsageStats(
    activeConnection?.id,
    selectedSchema,
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Index statement copied to clipboard',
    });
  };

  if (!activeConnection) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please connect to a database to view index recommendations.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Index Recommendations"
        description="Analyze query patterns and optimize database performance"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        actions={
          <Select value={selectedSchema || 'all'} onValueChange={(v) => setSelectedSchema(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All schemas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All schemas</SelectItem>
              {analysis?.schemas?.map((schema) => (
                <SelectItem key={schema} value={schema}>
                  {schema}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <div className="container mx-auto p-6 space-y-6 flex-1 overflow-auto">

      {analysisError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load index analysis: {analysisError instanceof Error ? analysisError.message : 'Unknown error'}. 
            Please ensure the database connection is active and try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards with ghost loading */}
      <div className="relative">
        {/* Real content with fade transition */}
        <div
          className={cn(
            "transition-opacity duration-300 ease-in-out",
            analysisLoading ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100"
          )}
        >
          {analysis && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Indexes</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analysis.summary.totalIndexes}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unused Indexes</CardTitle>
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {analysis.summary.unusedIndexes}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recommended</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500">
                    {analysis.summary.recommendedIndexes}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {analysis.summary.highPriorityRecommendations}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        {/* Ghost loading for summary cards */}
        {analysisLoading && (
          <div className="transition-opacity duration-300 ease-in-out opacity-100">
            <div className="grid gap-4 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {!analysisLoading && !analysis && !analysisError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No index data available. Make sure the database connection is active and has indexes.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="usage">Usage Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Index Recommendations</CardTitle>
              <CardDescription>
                Suggested indexes based on query patterns and performance analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recLoading ? (
                // Ghost loading for recommendations
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={`ghost-rec-${i}`} className="border-l-4 border-l-primary animate-pulse">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-64" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : recommendations && recommendations.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {recommendations.map((rec, idx) => (
                      <Card key={idx} className="border-l-4 border-l-primary">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {rec.schema}.{rec.table}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                Columns: {rec.columns.join(', ')}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  rec.estimatedBenefit === 'high'
                                    ? 'destructive'
                                    : rec.estimatedBenefit === 'medium'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {rec.estimatedBenefit} priority
                              </Badge>
                              <Badge variant="outline">{rec.indexType}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground">{rec.reason}</p>
                          <div className="bg-muted p-3 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <code className="text-sm font-mono">{rec.createStatement}</code>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(rec.createStatement)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No index recommendations at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Index Usage Statistics</CardTitle>
              <CardDescription>
                Monitor index usage and identify unused indexes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                // Ghost loading for usage stats
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={`ghost-stat-${i}`} className="p-4 rounded-lg border animate-pulse">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <div className="grid grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, j) => (
                              <Skeleton key={`ghost-stat-item-${i}-${j}`} className="h-4 w-full" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : usageStats && usageStats.length > 0 ? (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {usageStats.map((stat, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${
                          !stat.isUsed ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {stat.schema}.{stat.table}
                              </span>
                              <span className="text-muted-foreground">.{stat.indexName}</span>
                              {!stat.isUsed && (
                                <Badge variant="outline" className="text-orange-600">
                                  Unused
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-4 gap-4 mt-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Size:</span>{' '}
                                <span className="font-medium">{stat.indexSize}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Scans:</span>{' '}
                                <span className="font-medium">{stat.indexScans}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Read:</span>{' '}
                                <span className="font-medium">{stat.tuplesRead}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fetched:</span>{' '}
                                <span className="font-medium">{stat.tuplesFetched}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No index usage statistics available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}


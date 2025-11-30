/**
 * React Query hooks for Index Recommendations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { indexRecommendationsService } from '@/lib/api/services/index-recommendations.service';
import type {
  IndexAnalysisResponse,
  IndexRecommendation,
  IndexUsageStat,
  QueryPattern,
} from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';

export function useIndexAnalysis(connectionId: string | undefined, schema?: string) {
  return useQuery<IndexAnalysisResponse>({
    queryKey: ['index-analysis', connectionId, schema],
    queryFn: () => indexRecommendationsService.getIndexAnalysis(connectionId!, schema),
    enabled: !!connectionId,
    staleTime: 60000, // 1 minute
  });
}

export function useIndexRecommendations(connectionId: string | undefined, schema?: string) {
  return useQuery<IndexRecommendation[]>({
    queryKey: ['index-recommendations', connectionId, schema],
    queryFn: () => indexRecommendationsService.getSuggestions(connectionId!, schema),
    enabled: !!connectionId,
    staleTime: 60000,
  });
}

export function useIndexUsageStats(connectionId: string | undefined, schema?: string) {
  return useQuery<IndexUsageStat[]>({
    queryKey: ['index-usage-stats', connectionId, schema],
    queryFn: () => indexRecommendationsService.getUsageStats(connectionId!, schema),
    enabled: !!connectionId,
    staleTime: 60000,
  });
}

export function useQueryPatterns(connectionId: string | undefined, limit?: number) {
  return useQuery<QueryPattern[]>({
    queryKey: ['query-patterns', connectionId, limit],
    queryFn: () => indexRecommendationsService.getQueryPatterns(connectionId!, limit),
    enabled: !!connectionId,
    staleTime: 30000, // 30 seconds
  });
}

export function useGenerateIndexStatement() {
  return useMutation({
    mutationFn: ({
      connectionId,
      schema,
      table,
      columns,
      indexName,
      unique,
    }: {
      connectionId: string;
      schema: string;
      table: string;
      columns: string[];
      indexName?: string;
      unique?: boolean;
    }) =>
      indexRecommendationsService.generateStatement(
        connectionId,
        schema,
        table,
        columns,
        indexName,
        unique,
      ),
    onSuccess: (data) => {
      // Copy to clipboard
      navigator.clipboard.writeText(data.statement);
      toast({
        title: 'Index statement generated',
        description: 'CREATE INDEX statement copied to clipboard',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate index statement',
        variant: 'destructive',
      });
    },
  });
}


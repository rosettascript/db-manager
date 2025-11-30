/**
 * React Query hooks for Query Validation and Optimization
 */

import { useMutation } from '@tanstack/react-query';
import { queriesService } from '@/lib/api/services/queries.service';
import type {
  QueryValidationResult,
  QueryOptimizationResult,
} from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';

export function useValidateQuery() {
  return useMutation({
    mutationFn: ({
      connectionId,
      query,
    }: {
      connectionId: string;
      query: string;
    }) => queriesService.validateQuery(connectionId, query),
    onError: (error: any) => {
      toast({
        title: 'Validation error',
        description: error.message || 'Failed to validate query',
        variant: 'destructive',
      });
    },
  });
}

export function useOptimizeQuery() {
  return useMutation({
    mutationFn: ({
      connectionId,
      query,
      analyze = false,
    }: {
      connectionId: string;
      query: string;
      analyze?: boolean;
    }) => queriesService.optimizeQuery(connectionId, query, analyze),
    onError: (error: any) => {
      toast({
        title: 'Optimization error',
        description: error.message || 'Failed to optimize query',
        variant: 'destructive',
      });
    },
  });
}


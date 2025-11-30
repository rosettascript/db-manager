/**
 * React Query hooks for Query Snippets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { querySnippetsService } from '@/lib/api/services/query-snippets.service';
import type {
  QuerySnippet,
  CreateQuerySnippetDto,
  UpdateQuerySnippetDto,
} from '@/lib/api/types';
import { toast } from '@/hooks/use-toast';

export function useQuerySnippets(options: { category?: string; search?: string } = {}) {
  return useQuery<QuerySnippet[]>({
    queryKey: ['query-snippets', options],
    queryFn: () => querySnippetsService.getAllSnippets(options),
    staleTime: 60000,
  });
}

export function useQuerySnippet(id: string | undefined) {
  return useQuery<QuerySnippet>({
    queryKey: ['query-snippet', id],
    queryFn: () => querySnippetsService.getSnippetById(id!),
    enabled: !!id,
  });
}

export function useQuerySnippetsByCategory(category: string) {
  return useQuery<QuerySnippet[]>({
    queryKey: ['query-snippets', 'category', category],
    queryFn: () => querySnippetsService.getSnippetsByCategory(category),
    enabled: !!category,
  });
}

export function useSnippetCategories() {
  return useQuery<string[]>({
    queryKey: ['snippet-categories'],
    queryFn: () => querySnippetsService.getCategories(),
    staleTime: 300000, // 5 minutes
  });
}

export function useCreateSnippet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateQuerySnippetDto) => querySnippetsService.createSnippet(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['query-snippets'] });
      queryClient.invalidateQueries({ queryKey: ['snippet-categories'] });
      toast({
        title: 'Snippet created',
        description: 'Query snippet has been created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create snippet',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSnippet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateQuerySnippetDto }) =>
      querySnippetsService.updateSnippet(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['query-snippets'] });
      queryClient.invalidateQueries({ queryKey: ['query-snippet', variables.id] });
      toast({
        title: 'Snippet updated',
        description: 'Query snippet has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update snippet',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSnippet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => querySnippetsService.deleteSnippet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['query-snippets'] });
      toast({
        title: 'Snippet deleted',
        description: 'Query snippet has been deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete snippet',
        variant: 'destructive',
      });
    },
  });
}


/**
 * React Query hooks for Search
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { searchService } from '@/lib/api/services/search.service';
import type {
  GlobalSearchResponse,
  ColumnSearchResponse,
  ColumnAutocompleteResult,
} from '@/lib/api/types';

export function useGlobalSearch(
  connectionId: string | undefined,
  query: string,
  options: {
    searchTables?: boolean;
    searchColumnNames?: boolean;
    searchDataValues?: boolean;
    schemas?: string[];
    limit?: number;
  } = {},
) {
  return useQuery<GlobalSearchResponse>({
    queryKey: ['global-search', connectionId, query, options],
    queryFn: () => searchService.globalSearch(connectionId!, query, options),
    enabled: !!connectionId && !!query && query.length >= 2,
    staleTime: 30000, // 30 seconds
  });
}

export function useFindTablesWithColumns(
  connectionId: string | undefined,
  columns: string[],
  options: {
    schemas?: string[];
    matchAll?: boolean;
  } = {},
) {
  return useQuery<ColumnSearchResponse>({
    queryKey: ['tables-with-columns', connectionId, columns, options],
    queryFn: () => searchService.findTablesWithColumns(connectionId!, columns, options),
    enabled: !!connectionId && columns.length > 0,
    staleTime: 60000,
  });
}

export function useColumnAutocomplete(
  connectionId: string | undefined,
  query: string,
  options: {
    schemas?: string[];
    limit?: number;
  } = {},
) {
  return useQuery<ColumnAutocompleteResult[]>({
    queryKey: ['column-autocomplete', connectionId, query, options],
    queryFn: () => searchService.columnAutocomplete(connectionId!, query, options),
    enabled: !!connectionId && !!query && query.length >= 2,
    staleTime: 60000,
  });
}

export function useFilterColumnsByType(
  connectionId: string | undefined,
  options: {
    dataTypes?: string[];
    schemas?: string[];
    nullable?: boolean;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
  } = {},
) {
  return useQuery<ColumnSearchResponse>({
    queryKey: ['columns-by-type', connectionId, options],
    queryFn: () => searchService.filterColumnsByType(connectionId!, options),
    enabled: !!connectionId,
    staleTime: 60000,
  });
}


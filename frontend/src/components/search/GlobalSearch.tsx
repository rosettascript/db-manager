/**
 * Global Search Component
 * Provides search across tables, columns, and data values
 */

import { useState, useEffect } from 'react';
import { Search, X, Table2, Columns, Database, Loader2 } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useSearch';
import { useConnection } from '@/contexts/ConnectionContext';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const { activeConnection } = useConnection();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOptions, setSearchOptions] = useState({
    searchTables: true,
    searchColumnNames: true,
    searchDataValues: true,
  });
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: results, isLoading } = useGlobalSearch(
    activeConnection?.id,
    debouncedQuery,
    searchOptions,
  );

  useEffect(() => {
    if (open) {
      setSearchQuery('');
    }
  }, [open]);

  const handleResultClick = (result: any) => {
    if (result.type === 'table') {
      navigate(`/table/${result.schema}.${result.table}`);
      onOpenChange(false);
    }
  };

  const groupedResults = results?.results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, typeof results.results>) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Global Search</DialogTitle>
          <DialogDescription>
            Search across tables, columns, and data values (Ctrl+Shift+F)
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tables, columns, data values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-4 items-center">
            <Label className="text-sm font-medium">Search in:</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="search-tables"
                  checked={searchOptions.searchTables}
                  onCheckedChange={(checked) =>
                    setSearchOptions({ ...searchOptions, searchTables: !!checked })
                  }
                />
                <Label htmlFor="search-tables" className="text-sm cursor-pointer">
                  Tables
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="search-columns"
                  checked={searchOptions.searchColumnNames}
                  onCheckedChange={(checked) =>
                    setSearchOptions({ ...searchOptions, searchColumnNames: !!checked })
                  }
                />
                <Label htmlFor="search-columns" className="text-sm cursor-pointer">
                  Columns
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="search-data"
                  checked={searchOptions.searchDataValues}
                  onCheckedChange={(checked) =>
                    setSearchOptions({ ...searchOptions, searchDataValues: !!checked })
                  }
                />
                <Label htmlFor="search-data" className="text-sm cursor-pointer">
                  Data
                </Label>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && debouncedQuery && results && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Found {results.total} result{results.total !== 1 ? 's' : ''} in{' '}
                  {results.searchTime}ms
                </span>
              </div>

              <ScrollArea className="h-[400px]">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList>
                    <TabsTrigger value="all">All ({results.total})</TabsTrigger>
                    {groupedResults.table && (
                      <TabsTrigger value="tables">
                        Tables ({groupedResults.table.length})
                      </TabsTrigger>
                    )}
                    {groupedResults.column && (
                      <TabsTrigger value="columns">
                        Columns ({groupedResults.column.length})
                      </TabsTrigger>
                    )}
                    {groupedResults.data && (
                      <TabsTrigger value="data">
                        Data ({groupedResults.data.length})
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <div className="space-y-2">
                      {results.results.map((result, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors',
                            result.type === 'table' && 'border-primary/20'
                          )}
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex items-start gap-3">
                            {result.type === 'table' && (
                              <Table2 className="w-4 h-4 mt-0.5 text-primary" />
                            )}
                            {result.type === 'column' && (
                              <Columns className="w-4 h-4 mt-0.5 text-blue-500" />
                            )}
                            {result.type === 'data' && (
                              <Database className="w-4 h-4 mt-0.5 text-green-500" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {result.type}
                                </Badge>
                                <span className="font-medium">
                                  {result.schema}.{result.table}
                                </span>
                              </div>
                              {result.column && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Column: {result.column}
                                </div>
                              )}
                              {result.value && (
                                <div className="text-sm text-muted-foreground mt-1 truncate">
                                  Value: {result.value}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {groupedResults.table && (
                    <TabsContent value="tables" className="mt-4">
                      <div className="space-y-2">
                        {groupedResults.table.map((result, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border border-primary/20 cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => handleResultClick(result)}
                          >
                            <div className="flex items-center gap-3">
                              <Table2 className="w-4 h-4 text-primary" />
                              <span className="font-medium">
                                {result.schema}.{result.table}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )}

                  {groupedResults.column && (
                    <TabsContent value="columns" className="mt-4">
                      <div className="space-y-2">
                        {groupedResults.column.map((result, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Columns className="w-4 h-4 text-blue-500" />
                              <div>
                                <span className="font-medium">
                                  {result.schema}.{result.table}
                                </span>
                                <span className="text-muted-foreground">.{result.column}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )}

                  {groupedResults.data && (
                    <TabsContent value="data" className="mt-4">
                      <div className="space-y-2">
                        {groupedResults.data.map((result, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => handleResultClick(result)}
                          >
                            <div className="flex items-start gap-3">
                              <Database className="w-4 h-4 mt-0.5 text-green-500" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">
                                  {result.schema}.{result.table}
                                </div>
                                {result.column && (
                                  <div className="text-sm text-muted-foreground">
                                    {result.column}: {result.value}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </ScrollArea>
            </div>
          )}

          {!isLoading && debouncedQuery && results && results.total === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No results found for &quot;{debouncedQuery}&quot;
            </div>
          )}

          {!debouncedQuery && (
            <div className="text-center py-8 text-muted-foreground">
              Start typing to search across tables, columns, and data values
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


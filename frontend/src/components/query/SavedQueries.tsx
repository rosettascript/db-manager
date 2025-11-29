import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Search, Play, Trash2, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryHistoryService } from "@/lib/api";
import type { SavedQuery } from "@/lib/api/types";
import { NoSavedQueriesEmptyState } from "@/components/empty/EmptyState";

interface SavedQueriesProps {
  connectionId: string | null;
  onLoadQuery: (query: string) => void;
}

export const SavedQueries = ({ connectionId, onLoadQuery }: SavedQueriesProps) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Fetch saved queries
  const {
    data: queries = [],
    isLoading,
    isError,
    error,
  } = useQuery<SavedQuery[]>({
    queryKey: ['saved-queries', connectionId],
    queryFn: async () => {
      if (!connectionId) {
        return [];
      }
      return queryHistoryService.getSavedQueries(connectionId);
    },
    enabled: !!connectionId && isOpen, // Only fetch when sheet is open
    staleTime: 30000, // 30 seconds
  });

  // Delete saved query mutation
  const deleteMutation = useMutation({
    mutationFn: async (queryId: string) => {
      if (!connectionId) {
        throw new Error("No connection ID");
      }
      return queryHistoryService.deleteSavedQuery(connectionId, queryId);
    },
    onSuccess: (_, queryId) => {
      const deletedQuery = queries.find((q) => q.id === queryId);
      queryClient.invalidateQueries({ queryKey: ['saved-queries', connectionId] });
      toast.success(`Deleted query: ${deletedQuery?.name || 'Query'}`);
    },
    onError: (error: any) => {
      toast.error("Failed to delete query", {
        description: error.message || "Unknown error",
      });
    },
  });

  // Filter queries by search
  const filteredQueries = useMemo(() => {
    if (!searchQuery.trim()) {
      return queries;
    }
    const searchLower = searchQuery.toLowerCase();
    return queries.filter(
      (q) =>
        q.name.toLowerCase().includes(searchLower) ||
        q.query.toLowerCase().includes(searchLower) ||
        q.description?.toLowerCase().includes(searchLower) ||
        q.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  }, [queries, searchQuery]);

  const handleLoad = (query: string, name: string) => {
    onLoadQuery(query);
    setIsOpen(false); // Close sheet after loading
    toast.success(`Loaded query: ${name}`);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={!connectionId}>
          <BookMarked className="w-4 h-4" />
          Saved Queries
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Saved Queries</SheetTitle>
          <SheetDescription>
            Load your saved SQL queries or delete old ones
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {!connectionId ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No active connection</p>
              <p className="text-sm mt-1">Please connect to a database first</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-muted-foreground">Loading saved queries...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              <p>Failed to load saved queries</p>
              <p className="text-sm mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search saved queries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                {filteredQueries.length === 0 ? (
                  searchQuery.trim() ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No saved queries match your search</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="mt-4"
                      >
                        Clear Search
                      </Button>
                    </div>
                  ) : (
                    <NoSavedQueriesEmptyState />
                  )
                ) : (
                  filteredQueries.map((query) => {
                    const createdAt = new Date(query.createdAt);
                    
                    return (
                      <Card
                        key={query.id}
                        className="hover:border-primary/50 transition-colors"
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">{query.name}</h3>
                                {query.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {query.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {createdAt.toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleLoad(query.query, query.name)}
                                >
                                  <Play className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(query.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            <pre className="text-xs font-mono bg-code-bg p-3 rounded overflow-x-auto max-h-24 overflow-y-auto">
                              {query.query}
                            </pre>

                            {query.tags && query.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {query.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

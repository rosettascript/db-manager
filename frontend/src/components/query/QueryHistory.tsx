import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { queryHistoryService } from "@/lib/api";
import type { QueryHistoryItem } from "@/lib/api/types";
import { NoQueryHistoryEmptyState } from "@/components/empty/EmptyState";

interface QueryHistoryProps {
  connectionId: string;
  onLoadQuery: (query: string) => void;
  onClearHistory: () => void;
}

export const QueryHistory = ({ connectionId, onLoadQuery, onClearHistory }: QueryHistoryProps) => {
  const {
    data: history = [],
    isLoading,
    refetch,
  } = useQuery<QueryHistoryItem[]>({
    queryKey: ['query-history', connectionId],
    queryFn: () => queryHistoryService.getQueryHistory(connectionId, 50, 0),
    staleTime: 10000, // 10 seconds
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
        <p className="text-muted-foreground">Loading query history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return <NoQueryHistoryEmptyState />;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">
          RECENT QUERIES ({history.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearHistory}
          className="gap-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
          Clear History
        </Button>
      </div>

      {history.map((item) => {
        const timestamp = new Date(item.timestamp);
        const rowCount = item.rowCount || item.rowsAffected || 0;
        
        return (
          <Card
            key={item.id}
            className="cursor-pointer hover:border-primary/50 transition-colors"
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <code className="text-sm font-mono block truncate">
                    {item.query}
                  </code>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {timestamp.toLocaleString()}
                    </span>
                    {item.success ? (
                      <Badge variant="default" className="text-xs">
                        {rowCount} rows
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        Failed
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {item.executionTime}ms
                    </Badge>
                    {item.error && (
                      <Badge variant="destructive" className="text-xs">
                        Error
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onLoadQuery(item.query);
                    toast.success("Query loaded from history");
                  }}
                >
                  <Play className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

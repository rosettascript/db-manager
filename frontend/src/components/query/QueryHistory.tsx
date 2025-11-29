import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  executionTime: number;
  rowsAffected: number;
  success: boolean;
}

interface QueryHistoryProps {
  history: QueryHistoryItem[];
  onLoadQuery: (query: string) => void;
  onClearHistory: () => void;
}

export const QueryHistory = ({ history, onLoadQuery, onClearHistory }: QueryHistoryProps) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>No query history yet</p>
        <p className="text-sm mt-1">Run a query to see it here</p>
      </div>
    );
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

      {history.map((item) => (
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
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                  <Badge
                    variant={item.success ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {item.rowsAffected} rows
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {item.executionTime}ms
                  </Badge>
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
      ))}
    </div>
  );
};

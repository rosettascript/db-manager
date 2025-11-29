import { useState } from "react";
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
import { BookMarked, Search, Play, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface SavedQuery {
  id: string;
  name: string;
  query: string;
  createdAt: Date;
  tags?: string[];
}

interface SavedQueriesProps {
  onLoadQuery: (query: string) => void;
}

const mockSavedQueries: SavedQuery[] = [
  {
    id: "1",
    name: "Top 10 Users by Orders",
    query: "SELECT u.id, u.username, COUNT(o.id) as order_count\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nGROUP BY u.id, u.username\nORDER BY order_count DESC\nLIMIT 10;",
    createdAt: new Date("2025-01-15"),
    tags: ["users", "orders", "analytics"],
  },
  {
    id: "2",
    name: "Products Low on Stock",
    query: "SELECT id, name, stock_quantity, price\nFROM products\nWHERE stock_quantity < 10\nORDER BY stock_quantity ASC;",
    createdAt: new Date("2025-01-18"),
    tags: ["products", "inventory"],
  },
  {
    id: "3",
    name: "Revenue by Month",
    query: "SELECT\n  DATE_TRUNC('month', created_at) as month,\n  SUM(total_amount) as revenue\nFROM orders\nWHERE status = 'delivered'\nGROUP BY month\nORDER BY month DESC;",
    createdAt: new Date("2025-01-20"),
    tags: ["orders", "analytics", "revenue"],
  },
];

export const SavedQueries = ({ onLoadQuery }: SavedQueriesProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [queries, setQueries] = useState<SavedQuery[]>(mockSavedQueries);

  const filteredQueries = queries.filter(
    (q) =>
      q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleLoad = (query: string, name: string) => {
    onLoadQuery(query);
    toast.success(`Loaded query: ${name}`);
  };

  const handleDelete = (id: string) => {
    const query = queries.find((q) => q.id === id);
    setQueries(queries.filter((q) => q.id !== id));
    toast.success(`Deleted query: ${query?.name}`);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
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
              <div className="text-center py-12 text-muted-foreground">
                <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No saved queries found</p>
              </div>
            ) : (
              filteredQueries.map((query) => (
                <Card
                  key={query.id}
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{query.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {query.createdAt.toLocaleDateString()}
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
                          >
                            <Trash2 className="w-4 h-4" />
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
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

import { useState, useEffect, useMemo } from "react";
import { Play, Save, Download, Trash2, Code2, History, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SQLHighlightedEditor } from "@/components/query/SQLHighlightedEditor";
import { SavedQueries } from "@/components/query/SavedQueries";
import { QueryHistory } from "@/components/query/QueryHistory";
import { ExportDialog } from "@/components/data-viewer/ExportDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const QueryBuilder = () => {
  const [query, setQuery] = useState(
    "SELECT u.id, u.username, u.email, COUNT(o.id) as order_count\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nGROUP BY u.id, u.username, u.email\nORDER BY order_count DESC\nLIMIT 10;"
  );
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState(42);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState("");
  
  // Load query history from localStorage
  const [queryHistory, setQueryHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("queryHistory");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (error) {
      console.error("Failed to load query history:", error);
    }
    
    // Default history
    return [
      {
        id: "1",
        query: "SELECT * FROM users WHERE email LIKE '%@example.com' LIMIT 50",
        timestamp: new Date(Date.now() - 120000),
        executionTime: 35,
        rowsAffected: 50,
        success: true,
      },
      {
        id: "2",
        query: "SELECT COUNT(*) FROM orders WHERE status = 'delivered'",
        timestamp: new Date(Date.now() - 300000),
        executionTime: 12,
        rowsAffected: 1,
        success: true,
      },
    ];
  });

  // Persist query history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("queryHistory", JSON.stringify(queryHistory));
    } catch (error) {
      console.error("Failed to save query history:", error);
    }
  }, [queryHistory]);

  // Memoize mock results to prevent recreation on every render
  const mockResults = useMemo(() => [
    {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      username: "johndoe",
      email: "john.doe@example.com",
      order_count: "15",
    },
    {
      id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      username: "janesmith",
      email: "jane.smith@example.com",
      order_count: "12",
    },
    {
      id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
      username: "bobwilson",
      email: "bob.wilson@example.com",
      order_count: "8",
    },
  ], []);

  const handleRun = () => {
    setIsRunning(true);
    const startTime = Date.now();
    
    // Add to history
    const newHistoryItem = {
      id: Date.now().toString(),
      query,
      timestamp: new Date(),
      executionTime: 0,
      rowsAffected: mockResults.length,
      success: true,
    };
    
    setTimeout(() => {
      const time = Date.now() - startTime;
      setExecutionTime(time);
      setQueryHistory(prev => [{ ...newHistoryItem, executionTime: time }, ...prev.slice(0, 49)]);
      setIsRunning(false);
      toast.success("Query executed successfully", {
        description: `${mockResults.length} rows returned in ${time}ms`,
      });
    }, 1000);
  };

  const handleSave = () => {
    if (!queryName.trim()) {
      toast.error("Please enter a query name");
      return;
    }
    toast.success(`Query "${queryName}" saved successfully`);
    setSaveDialogOpen(false);
    setQueryName("");
  };

  const handleClearHistory = () => {
    setQueryHistory([]);
    toast.success("Query history cleared");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Query Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Execute SQL queries and analyze results
            </p>
          </div>
          <div className="flex gap-2">
            <SavedQueries onLoadQuery={setQuery} />
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Query
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Query</DialogTitle>
                  <DialogDescription>
                    Give your query a name to save it for later use
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="query-name">Query Name</Label>
                    <Input
                      id="query-name"
                      placeholder="My useful query"
                      value={queryName}
                      onChange={(e) => setQueryName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
            <ExportDialog />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setQuery("")}
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border p-6 pb-4">
          <SQLHighlightedEditor
            value={query}
            onChange={setQuery}
            onExecute={handleRun}
            isExecuting={isRunning}
          />
        </div>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="results" className="h-full flex flex-col">
            <div className="border-b border-border px-6">
              <TabsList>
                <TabsTrigger value="results" className="gap-2">
                  <Play className="w-3 h-3" />
                  Results
                </TabsTrigger>
                <TabsTrigger value="explain" className="gap-2">
                  <Code2 className="w-3 h-3" />
                  Explain Plan
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-3 h-3" />
                  History ({queryHistory.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="results" className="mt-0 p-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Query Results</CardTitle>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{mockResults.length} rows</Badge>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          Executed in {executionTime}ms
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-table-header hover:bg-table-header">
                            <TableHead className="font-semibold">id</TableHead>
                            <TableHead className="font-semibold">username</TableHead>
                            <TableHead className="font-semibold">email</TableHead>
                            <TableHead className="font-semibold">order_count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockResults.map((row, idx) => (
                            <TableRow key={idx} className="hover:bg-table-row-hover">
                              <TableCell className="font-mono text-sm">{row.id}</TableCell>
                              <TableCell className="font-mono text-sm">{row.username}</TableCell>
                              <TableCell className="font-mono text-sm">{row.email}</TableCell>
                              <TableCell className="font-mono text-sm">{row.order_count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="explain" className="mt-0 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Query Execution Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-mono text-sm bg-code-bg p-4 rounded space-y-2">
                      <div className="text-muted-foreground">
                        → Hash Join (cost=45.32..125.67 rows=1000 width=96)
                      </div>
                      <div className="pl-4 text-muted-foreground">
                        → Seq Scan on users u (cost=0.00..32.40 rows=1000 width=64)
                      </div>
                      <div className="pl-4 text-muted-foreground">
                        → Hash (cost=28.50..28.50 rows=500 width=32)
                      </div>
                      <div className="pl-8 text-muted-foreground">
                        → Seq Scan on orders o (cost=0.00..28.50 rows=500 width=32)
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>Total execution time: 42ms</p>
                      <p>Planning time: 1.2ms</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-0 p-6">
                <QueryHistory
                  history={queryHistory}
                  onLoadQuery={setQuery}
                  onClearHistory={handleClearHistory}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default QueryBuilder;

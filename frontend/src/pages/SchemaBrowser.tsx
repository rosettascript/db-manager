import { useState, useMemo } from "react";
import { Search, Database, Table2, RefreshCcw } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockTables, mockSchemas } from "@/lib/mockData";
import { NavLink } from "@/components/NavLink";

const SchemaBrowser = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Debounce search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Memoized filtered tables
  const filteredTables = useMemo(() => {
    if (!debouncedSearchQuery) return mockTables;
    
    const query = debouncedSearchQuery.toLowerCase();
    return mockTables.filter(
      (table) =>
        table.name.toLowerCase().includes(query) ||
        table.columns.some((col) => col.name.toLowerCase().includes(query))
    );
  }, [debouncedSearchQuery]);

  // Memoized statistics
  const stats = useMemo(() => {
    const totalTables = mockTables.length;
    const totalRows = mockTables.reduce((sum, table) => sum + table.rowCount, 0);
    const totalSize = mockTables.reduce((sum, table) => {
      const sizeNum = parseFloat(table.size);
      const unit = table.size.includes("MB") ? 1 : 0.001;
      return sum + sizeNum * unit;
    }, 0);
    
    return { totalTables, totalRows, totalSize };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Schema Browser</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Explore database structure and relationships
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Refresh Schema
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Schemas</p>
                  <p className="text-2xl font-bold">{mockSchemas.length}</p>
                </div>
                <Database className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tables</p>
                  <p className="text-2xl font-bold">{stats.totalTables}</p>
                </div>
                <Table2 className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                  <p className="text-2xl font-bold">{stats.totalRows.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Database Size</p>
                  <p className="text-2xl font-bold">{stats.totalSize.toFixed(1)} MB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tables and columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredTables.map((table, idx) => (
            <Card
              key={table.id}
              className="hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
              style={{ animation: `fade-in-up 0.4s ease-out ${idx * 0.1}s both` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Table2 className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">
                        <NavLink to={`/table/${table.id}`} className="hover:text-primary">
                          {table.schema}.{table.name}
                        </NavLink>
                      </CardTitle>
                    </div>
                    <CardDescription className="mt-2">
                      {table.columns.length} columns • {table.rowCount.toLocaleString()} rows •{" "}
                      {table.size}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {table.foreignKeys.length > 0 && (
                      <Badge variant="outline">{table.foreignKeys.length} FK</Badge>
                    )}
                    {table.indexes.length > 0 && (
                      <Badge variant="outline">{table.indexes.length} Indexes</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">COLUMNS</div>
                  <div className="grid grid-cols-2 gap-2">
                    {table.columns.slice(0, 8).map((column) => (
                      <div
                        key={column.name}
                        className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                      >
                        <span className="font-mono font-medium">{column.name}</span>
                        <span className="text-xs text-muted-foreground">{column.type}</span>
                        {column.isPrimaryKey && (
                          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                            PK
                          </Badge>
                        )}
                        {column.isForeignKey && (
                          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                            FK
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                  {table.columns.length > 8 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      + {table.columns.length - 8} more columns
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchemaBrowser;

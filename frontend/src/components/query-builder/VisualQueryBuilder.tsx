import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Table2, Link, Filter as FilterIcon, SortAsc } from "lucide-react";
import { mockTables } from "@/lib/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VisualQueryBuilderProps {
  onGenerateSQL: (sql: string) => void;
}

export const VisualQueryBuilder = ({ onGenerateSQL }: VisualQueryBuilderProps) => {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>({});

  const handleAddTable = (tableId: string) => {
    if (!selectedTables.includes(tableId)) {
      setSelectedTables([...selectedTables, tableId]);
    }
  };

  const handleRemoveTable = (tableId: string) => {
    setSelectedTables(selectedTables.filter(id => id !== tableId));
    const newColumns = { ...selectedColumns };
    delete newColumns[tableId];
    setSelectedColumns(newColumns);
  };

  const handleToggleColumn = (tableId: string, columnName: string) => {
    const columns = selectedColumns[tableId] || [];
    setSelectedColumns({
      ...selectedColumns,
      [tableId]: columns.includes(columnName)
        ? columns.filter(c => c !== columnName)
        : [...columns, columnName],
    });
  };

  const generateSQL = () => {
    if (selectedTables.length === 0) return;

    const tables = selectedTables
      .map(id => mockTables.find(t => t.id === id))
      .filter(Boolean);

    const allColumns = tables.flatMap(table => {
      const cols = selectedColumns[table!.id] || [];
      return cols.map(col => `${table!.name}.${col}`);
    });

    const sql = `SELECT ${allColumns.length > 0 ? allColumns.join(", ") : "*"}
FROM ${tables[0]!.name}${tables.length > 1 ? `\nJOIN ${tables.slice(1).map(t => t!.name).join(", ")}` : ""}
LIMIT 100;`;

    onGenerateSQL(sql);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Build Query Visually</CardTitle>
            <Button onClick={generateSQL} disabled={selectedTables.length === 0}>
              Generate SQL
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Table2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="mb-4">No tables selected</p>
              <Select onValueChange={handleAddTable}>
                <SelectTrigger className="max-w-xs mx-auto">
                  <SelectValue placeholder="Select a table to start" />
                </SelectTrigger>
                <SelectContent>
                  {mockTables.map(table => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.schema}.{table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedTables.map((tableId, idx) => {
                const table = mockTables.find(t => t.id === tableId);
                if (!table) return null;

                const cols = selectedColumns[tableId] || [];

                return (
                  <Card key={tableId} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Table2 className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{table.name}</span>
                          <Badge variant="outline">{table.schema}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTable(tableId)}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        SELECT COLUMNS ({cols.length} selected)
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {table.columns.map(column => (
                          <div
                            key={column.name}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleToggleColumn(tableId, column.name)}
                          >
                            <Checkbox
                              checked={cols.includes(column.name)}
                              onCheckedChange={() => handleToggleColumn(tableId, column.name)}
                            />
                            <span className="text-sm font-mono truncate">
                              {column.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Select onValueChange={handleAddTable}>
                <SelectTrigger>
                  <Plus className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Add another table" />
                </SelectTrigger>
                <SelectContent>
                  {mockTables
                    .filter(t => !selectedTables.includes(t.id))
                    .map(table => (
                      <SelectItem key={table.id} value={table.id}>
                        {table.schema}.{table.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Button variant="outline" className="gap-2" disabled>
          <Link className="w-4 h-4" />
          Add Joins
        </Button>
        <Button variant="outline" className="gap-2" disabled>
          <FilterIcon className="w-4 h-4" />
          Add Filters
        </Button>
        <Button variant="outline" className="gap-2" disabled>
          <SortAsc className="w-4 h-4" />
          Add Sorting
        </Button>
      </div>
    </div>
  );
};

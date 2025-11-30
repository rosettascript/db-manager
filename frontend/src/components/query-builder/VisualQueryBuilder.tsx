import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Table2, Link, Filter as FilterIcon, SortAsc, X, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService } from "@/lib/api";
import type { Table } from "@/lib/api/types";
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

interface SelectedTable {
  tableId: string;
  schema: string;
  tableName: string;
}

interface JoinCondition {
  id: string;
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
}

interface FilterCondition {
  id: string;
  table: string;
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';
  value: string;
}

interface SortCondition {
  id: string;
  table: string;
  column: string;
  direction: 'ASC' | 'DESC';
}

export const VisualQueryBuilder = ({ onGenerateSQL }: VisualQueryBuilderProps) => {
  const { activeConnection } = useConnection();
  const [selectedTables, setSelectedTables] = useState<SelectedTable[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>({});
  const [joins, setJoins] = useState<JoinCondition[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sorts, setSorts] = useState<SortCondition[]>([]);
  const [limit, setLimit] = useState<string>('100');

  // Fetch tables from real database
  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ['tables', activeConnection?.id],
    queryFn: () => schemasService.getTables(activeConnection!.id),
    enabled: !!activeConnection,
    staleTime: 60000,
  });

  const handleAddTable = (tableId: string) => {
    const table = tables.find(t => `${t.schema}.${t.name}` === tableId);
    if (!table) return;
    
    const newTable: SelectedTable = {
      tableId,
      schema: table.schema,
      tableName: table.name,
    };
    
    if (!selectedTables.some(t => t.tableId === tableId)) {
      setSelectedTables([...selectedTables, newTable]);
    }
  };

  const handleRemoveTable = (tableId: string) => {
    setSelectedTables(selectedTables.filter(t => t.tableId !== tableId));
    const newColumns = { ...selectedColumns };
    delete newColumns[tableId];
    setSelectedColumns(newColumns);
    
    // Remove related joins, filters, and sorts
    setJoins(joins.filter(j => j.leftTable !== tableId && j.rightTable !== tableId));
    setFilters(filters.filter(f => f.table !== tableId));
    setSorts(sorts.filter(s => s.table !== tableId));
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

  const handleAddJoin = () => {
    if (selectedTables.length < 2) return;
    
    const newJoin: JoinCondition = {
      id: `join_${Date.now()}`,
      leftTable: selectedTables[0].tableId,
      leftColumn: '',
      rightTable: selectedTables[1].tableId,
      rightColumn: '',
      type: 'INNER',
    };
    setJoins([...joins, newJoin]);
  };

  const handleRemoveJoin = (joinId: string) => {
    setJoins(joins.filter(j => j.id !== joinId));
  };

  const handleUpdateJoin = (joinId: string, updates: Partial<JoinCondition>) => {
    setJoins(joins.map(j => j.id === joinId ? { ...j, ...updates } : j));
  };

  const handleAddFilter = () => {
    if (selectedTables.length === 0) return;
    
    const newFilter: FilterCondition = {
      id: `filter_${Date.now()}`,
      table: selectedTables[0].tableId,
      column: '',
      operator: '=',
      value: '',
    };
    setFilters([...filters, newFilter]);
  };

  const handleRemoveFilter = (filterId: string) => {
    setFilters(filters.filter(f => f.id !== filterId));
  };

  const handleUpdateFilter = (filterId: string, updates: Partial<FilterCondition>) => {
    setFilters(filters.map(f => f.id === filterId ? { ...f, ...updates } : f));
  };

  const handleAddSort = () => {
    if (selectedTables.length === 0) return;
    
    const newSort: SortCondition = {
      id: `sort_${Date.now()}`,
      table: selectedTables[0].tableId,
      column: '',
      direction: 'ASC',
    };
    setSorts([...sorts, newSort]);
  };

  const handleRemoveSort = (sortId: string) => {
    setSorts(sorts.filter(s => s.id !== sortId));
  };

  const handleUpdateSort = (sortId: string, updates: Partial<SortCondition>) => {
    setSorts(sorts.map(s => s.id === sortId ? { ...s, ...updates } : s));
  };

  const generateSQL = () => {
    if (selectedTables.length === 0) return;

    // Build SELECT clause
    const allColumns: string[] = [];
    selectedTables.forEach(table => {
      const cols = selectedColumns[table.tableId] || [];
      if (cols.length === 0) {
        // If no columns selected, use all columns
        const tableData = tables.find(t => `${t.schema}.${t.name}` === table.tableId);
        if (tableData) {
          tableData.columns.forEach(col => {
            allColumns.push(`"${table.schema}"."${table.tableName}"."${col.name}"`);
          });
        }
      } else {
        cols.forEach(col => {
          allColumns.push(`"${table.schema}"."${table.tableName}"."${col}"`);
        });
      }
    });
    
    const selectClause = allColumns.length > 0 
      ? allColumns.join(", ")
      : "*";

    // Build FROM clause
    const fromTable = selectedTables[0];
    const fromClause = `"${fromTable.schema}"."${fromTable.tableName}"`;

    // Build JOIN clauses
    const joinClauses: string[] = [];
    joins.forEach(join => {
      if (!join.leftColumn || !join.rightColumn) return;
      
      const leftTable = selectedTables.find(t => t.tableId === join.leftTable);
      const rightTable = selectedTables.find(t => t.tableId === join.rightTable);
      if (!leftTable || !rightTable) return;
      
      const joinType = join.type === 'INNER' ? 'INNER JOIN' 
        : join.type === 'LEFT' ? 'LEFT JOIN'
        : join.type === 'RIGHT' ? 'RIGHT JOIN'
        : 'FULL JOIN';
      
      joinClauses.push(
        `${joinType} "${rightTable.schema}"."${rightTable.tableName}" ON ` +
        `"${leftTable.schema}"."${leftTable.tableName}"."${join.leftColumn}" = ` +
        `"${rightTable.schema}"."${rightTable.tableName}"."${join.rightColumn}"`
      );
    });

    // Build WHERE clause
    const whereConditions: string[] = [];
    filters.forEach(filter => {
      if (!filter.column) return;
      
      const table = selectedTables.find(t => t.tableId === filter.table);
      if (!table) return;
      
      const columnRef = `"${table.schema}"."${table.tableName}"."${filter.column}"`;
      
      if (filter.operator === 'IS NULL' || filter.operator === 'IS NOT NULL') {
        whereConditions.push(`${columnRef} ${filter.operator}`);
      } else if (filter.operator === 'IN') {
        const values = filter.value.split(',').map(v => `'${v.trim()}'`).join(', ');
        whereConditions.push(`${columnRef} IN (${values})`);
      } else if (filter.value) {
        whereConditions.push(`${columnRef} ${filter.operator} '${filter.value}'`);
      }
    });
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Build ORDER BY clause
    const orderByConditions: string[] = [];
    sorts.forEach(sort => {
      if (!sort.column) return;
      
      const table = selectedTables.find(t => t.tableId === sort.table);
      if (!table) return;
      
      orderByConditions.push(
        `"${table.schema}"."${table.tableName}"."${sort.column}" ${sort.direction}`
      );
    });
    const orderByClause = orderByConditions.length > 0
      ? `ORDER BY ${orderByConditions.join(', ')}`
      : '';

    // Build LIMIT clause
    const limitClause = limit ? `LIMIT ${parseInt(limit) || 100}` : '';

    // Combine all clauses
    const sql = [
      `SELECT ${selectClause}`,
      `FROM ${fromClause}`,
      ...joinClauses,
      whereClause,
      orderByClause,
      limitClause,
    ]
      .filter(clause => clause.length > 0)
      .join('\n') + ';';

    onGenerateSQL(sql);
  };

  const getTableData = (tableId: string): Table | undefined => {
    return tables.find(t => `${t.schema}.${t.name}` === tableId);
  };

  const getTableColumns = (tableId: string) => {
    const table = getTableData(tableId);
    return table?.columns || [];
  };

  if (!activeConnection) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Please connect to a database to use the visual query builder</p>
        </CardContent>
      </Card>
    );
  }

  if (tablesLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>Loading tables...</p>
        </CardContent>
      </Card>
    );
  }

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
                  {tables.map(table => (
                    <SelectItem key={`${table.schema}.${table.name}`} value={`${table.schema}.${table.name}`}>
                      {table.schema}.{table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedTables.map((table) => {
                const tableData = getTableData(table.tableId);
                const cols = selectedColumns[table.tableId] || [];

                return (
                  <Card key={table.tableId} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Table2 className="w-4 h-4 text-primary" />
                          <span className="font-semibold">{table.tableName}</span>
                          <Badge variant="outline">{table.schema}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTable(table.tableId)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        SELECT COLUMNS ({cols.length} selected)
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {tableData?.columns.map(column => (
                          <div
                            key={column.name}
                            className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleToggleColumn(table.tableId, column.name)}
                          >
                            <Checkbox
                              checked={cols.includes(column.name)}
                              onCheckedChange={() => handleToggleColumn(table.tableId, column.name)}
                            />
                            <span className="text-sm font-mono truncate" title={column.type}>
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
                  {tables
                    .filter(t => !selectedTables.some(st => st.tableId === `${t.schema}.${t.name}`))
                    .map(table => (
                      <SelectItem key={`${table.schema}.${table.name}`} value={`${table.schema}.${table.name}`}>
                        {table.schema}.{table.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* JOIN Builder */}
      {selectedTables.length >= 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Link className="w-4 h-4" />
                Joins
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddJoin}>
                <Plus className="w-4 h-4 mr-2" />
                Add Join
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {joins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No joins defined. Click "Add Join" to create one.
              </p>
            ) : (
              joins.map(join => {
                const leftTable = selectedTables.find(t => t.tableId === join.leftTable);
                const rightTable = selectedTables.find(t => t.tableId === join.rightTable);
                const leftColumns = getTableColumns(join.leftTable);
                const rightColumns = getTableColumns(join.rightTable);

                return (
                  <Card key={join.id} className="border">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Select
                          value={join.type}
                          onValueChange={(value: JoinCondition['type']) => 
                            handleUpdateJoin(join.id, { type: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INNER">INNER JOIN</SelectItem>
                            <SelectItem value="LEFT">LEFT JOIN</SelectItem>
                            <SelectItem value="RIGHT">RIGHT JOIN</SelectItem>
                            <SelectItem value="FULL">FULL JOIN</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveJoin(join.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">{leftTable?.tableName}</Label>
                          <Select
                            value={join.leftColumn}
                            onValueChange={(value) => handleUpdateJoin(join.id, { leftColumn: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              {leftColumns.map(col => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">{rightTable?.tableName}</Label>
                          <Select
                            value={join.rightColumn}
                            onValueChange={(value) => handleUpdateJoin(join.id, { rightColumn: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              {rightColumns.map(col => (
                                <SelectItem key={col.name} value={col.name}>
                                  {col.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* WHERE/Filter Builder */}
      {selectedTables.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FilterIcon className="w-4 h-4" />
                Filters (WHERE)
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddFilter}>
                <Plus className="w-4 h-4 mr-2" />
                Add Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No filters defined. Click "Add Filter" to create one.
              </p>
            ) : (
              filters.map(filter => {
                const table = selectedTables.find(t => t.tableId === filter.table);
                const columns = getTableColumns(filter.table);

                return (
                  <Card key={filter.id} className="border">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Select
                          value={filter.table}
                          onValueChange={(value) => handleUpdateFilter(filter.id, { table: value, column: '' })}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedTables.map(t => (
                              <SelectItem key={t.tableId} value={t.tableId}>
                                {t.tableName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFilter(filter.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={filter.column}
                          onValueChange={(value) => handleUpdateFilter(filter.id, { column: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map(col => (
                              <SelectItem key={col.name} value={col.name}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={filter.operator}
                          onValueChange={(value: FilterCondition['operator']) => 
                            handleUpdateFilter(filter.id, { operator: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="=">=</SelectItem>
                            <SelectItem value="!=">!=</SelectItem>
                            <SelectItem value=">">&gt;</SelectItem>
                            <SelectItem value="<">&lt;</SelectItem>
                            <SelectItem value=">=">&gt;=</SelectItem>
                            <SelectItem value="<=">&lt;=</SelectItem>
                            <SelectItem value="LIKE">LIKE</SelectItem>
                            <SelectItem value="IN">IN</SelectItem>
                            <SelectItem value="IS NULL">IS NULL</SelectItem>
                            <SelectItem value="IS NOT NULL">IS NOT NULL</SelectItem>
                          </SelectContent>
                        </Select>
                        {filter.operator !== 'IS NULL' && filter.operator !== 'IS NOT NULL' && (
                          <Input
                            placeholder={filter.operator === 'IN' ? 'value1, value2' : 'Value'}
                            value={filter.value}
                            onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* ORDER BY Builder */}
      {selectedTables.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <SortAsc className="w-4 h-4" />
                Sorting (ORDER BY)
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddSort}>
                <Plus className="w-4 h-4 mr-2" />
                Add Sort
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sorts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No sorting defined. Click "Add Sort" to create one.
              </p>
            ) : (
              sorts.map(sort => {
                const table = selectedTables.find(t => t.tableId === sort.table);
                const columns = getTableColumns(sort.table);

                return (
                  <Card key={sort.id} className="border">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <Select
                          value={sort.table}
                          onValueChange={(value) => handleUpdateSort(sort.id, { table: value, column: '' })}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedTables.map(t => (
                              <SelectItem key={t.tableId} value={t.tableId}>
                                {t.tableName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={sort.column}
                          onValueChange={(value) => handleUpdateSort(sort.id, { column: value })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map(col => (
                              <SelectItem key={col.name} value={col.name}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={sort.direction}
                          onValueChange={(value: 'ASC' | 'DESC') => 
                            handleUpdateSort(sort.id, { direction: value })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ASC">ASC</SelectItem>
                            <SelectItem value="DESC">DESC</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSort(sort.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* LIMIT */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limit Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="number"
            placeholder="100"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            min="1"
          />
        </CardContent>
      </Card>
    </div>
  );
};

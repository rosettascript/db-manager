import { useState } from "react";
import {
  Database,
  Table2,
  Workflow,
  Code2,
  FileSearch,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockSchemas } from "@/lib/mockData";
import { NavLink } from "@/components/NavLink";

export const Sidebar = () => {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(["public"]));
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedSchemas(newExpanded);
  };

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        <NavLink
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent transition-all duration-200 hover:translate-x-1"
          activeClassName="bg-sidebar-accent"
        >
          <FileSearch className="w-4 h-4" />
          Schema Browser
        </NavLink>
        <NavLink
          to="/diagram"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent transition-all duration-200 hover:translate-x-1"
          activeClassName="bg-sidebar-accent"
        >
          <Workflow className="w-4 h-4" />
          ER Diagram
        </NavLink>
        <NavLink
          to="/query"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent transition-all duration-200 hover:translate-x-1"
          activeClassName="bg-sidebar-accent"
        >
          <Code2 className="w-4 h-4" />
          Query Builder
        </NavLink>
      </nav>

      <div className="flex-1 overflow-y-auto border-t border-sidebar-border">
        <div className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">DATABASE</div>
          {mockSchemas.map((schema) => (
            <div key={schema.name} className="mb-2">
              <button
                onClick={() => toggleSchema(schema.name)}
                className="flex items-center gap-1 w-full px-2 py-1.5 text-sm hover:bg-sidebar-accent rounded-md transition-colors"
              >
                {expandedSchemas.has(schema.name) ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <Database className="w-3 h-3" />
                <span className="font-medium">{schema.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {schema.tables.length}
                </span>
              </button>

              {expandedSchemas.has(schema.name) && (
                <div className="ml-4 mt-1 space-y-0.5 animate-fade-in">
                  {schema.tables.map((table, idx) => (
                    <div
                      key={table.id}
                      style={{ animation: `fade-in 0.2s ease-out ${idx * 0.05}s both` }}
                    >
                      <NavLink
                        to={`/table/${table.id}`}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-sidebar-accent rounded-md transition-colors"
                        activeClassName="bg-sidebar-accent"
                      >
                        <Table2 className="w-3 h-3" />
                        <span className="flex-1 truncate">{table.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {table.rowCount.toLocaleString()}
                        </span>
                      </NavLink>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Key, GripVertical } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Table } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export type TableNodeData = {
  table: Table;
  isHighlighted?: boolean;
  expanded?: boolean;
};

const FlowTableNodeComponent = ({ data, selected }: NodeProps<TableNodeData>) => {
  const { table, isHighlighted, expanded = false } = data;

  // Force re-render when expanded changes by using it in a way that affects rendering
  const visibleColumns = expanded ? table.columns : table.columns.slice(0, 10);

  return (
    <>
      {/* Connection handles */}
      <Handle type="target" position={Position.Left} className="!bg-accent !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-primary !w-3 !h-3" />

      <Card
        className={cn(
          "w-80 shadow-lg transition-all duration-200",
          selected && "ring-4 ring-primary ring-offset-2 ring-offset-background shadow-2xl",
          isHighlighted && "ring-4 ring-accent ring-offset-2 ring-offset-background shadow-xl",
          "hover:shadow-xl",
          "hover:cursor-pointer active:cursor-grabbing"
        )}
      >
        <CardHeader className="pb-3 bg-primary/5 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">{table.name}</CardTitle>
            </div>
            <div className="flex gap-1">
              {table.foreignKeys.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {table.foreignKeys.length} FK
                </Badge>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {table.rowCount.toLocaleString()} rows • {table.size}
          </div>
        </CardHeader>
        <CardContent className="pt-3 pb-3">
          <div className={cn(
            "space-y-1.5",
            expanded ? "" : "max-h-48 overflow-y-auto"
          )}>
            {visibleColumns.map((column, idx) => (
              <div
                key={column.name}
                className={cn(
                  "flex items-center gap-2 text-sm py-1 px-2 rounded transition-colors",
                  "hover:bg-muted/50"
                )}
                style={{
                  animation: `fade-in 0.3s ease-out ${idx * 0.05}s both`,
                }}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {column.isPrimaryKey && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse-glow" />
                  )}
                  {column.isForeignKey && !column.isPrimaryKey && (
                    <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  )}
                  <span className="font-mono text-xs font-medium truncate">
                    {column.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {column.type.split("(")[0]}
                </span>
              </div>
            ))}
            {!expanded && table.columns.length > 10 && (
              <div className="text-xs text-muted-foreground text-center py-1">
                + {table.columns.length - 10} more
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// Custom comparison function to ensure re-render when expanded state changes
export const FlowTableNode = memo(FlowTableNodeComponent, (prevProps, nextProps) => {
  // Re-render if expanded state changes
  if (prevProps.data.expanded !== nextProps.data.expanded) {
    return false; // false means "not equal, re-render"
  }
  // Re-render if table data changes
  if (prevProps.data.table !== nextProps.data.table) {
    return false;
  }
  // Re-render if highlighted state changes
  if (prevProps.data.isHighlighted !== nextProps.data.isHighlighted) {
    return false;
  }
  // Re-render if selected state changes
  if (prevProps.selected !== nextProps.selected) {
    return false;
  }
  // Otherwise, skip re-render
  return true; // true means "equal, skip re-render"
});

FlowTableNode.displayName = "FlowTableNode";

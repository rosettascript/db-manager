import { useState } from "react";
import { Key, GripVertical } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface TableNodeProps {
  table: Table;
  position: { x: number; y: number };
  onDragStart: (e: React.MouseEvent, tableId: string) => void;
  onDrag: (e: React.MouseEvent) => void;
  onDragEnd: () => void;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: (tableId: string) => void;
  onHover: (tableId: string | null) => void;
}

export const TableNode = ({
  table,
  position,
  onDragStart,
  onDrag,
  onDragEnd,
  isSelected,
  isHighlighted,
  onSelect,
  onHover,
}: TableNodeProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    onDragStart(e, table.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      onDrag(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    onDragEnd();
  };

  return (
    <Card
      className={cn(
        "absolute w-80 shadow-lg transition-all duration-200 cursor-move",
        isDragging && "shadow-2xl scale-105 cursor-grabbing",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isHighlighted && "ring-2 ring-accent ring-offset-2 shadow-xl",
        !isDragging && "hover:shadow-xl hover:scale-[1.02]"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: "none",
      }}
      onClick={() => onSelect(table.id)}
      onMouseEnter={() => onHover(table.id)}
      onMouseLeave={() => onHover(null)}
    >
      <CardHeader
        className="pb-3 bg-primary/5 border-b border-border cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
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
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {table.columns.slice(0, 10).map((column, idx) => (
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
          {table.columns.length > 10 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              + {table.columns.length - 10} more
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X, GripVertical, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Table, ForeignKey } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

interface RelationshipPopupProps {
  table: Table;
  allNodes: Array<{ id: string; data: { table: Table } }>;
  onClose: () => void;
  onNodeSelect?: (nodeId: string) => void;
}

interface Relationship {
  type: "outgoing" | "incoming";
  foreignKey: ForeignKey;
  sourceTable: Table;
  targetTable: Table;
}

export const RelationshipPopup = ({
  table,
  allNodes,
  onClose,
  onNodeSelect,
}: RelationshipPopupProps) => {
  // Position on the right side by default, centered vertically
  const getInitialPosition = () => {
    const popupWidth = 400;
    const popupHeight = 500; // Approximate height
    const padding = 20;
    return {
      x: Math.max(20, window.innerWidth - popupWidth - padding),
      y: Math.max(50, (window.innerHeight - popupHeight) / 2),
    };
  };
  const [position, setPosition] = useState(getInitialPosition());

  // Update position on window resize to keep it on the right and centered
  useEffect(() => {
    const handleResize = () => {
      const popupWidth = 400;
      const popupHeight = 500; // Approximate height
      const padding = 20;
      setPosition((prev) => ({
        x: Math.max(20, window.innerWidth - popupWidth - padding),
        y: Math.max(50, (window.innerHeight - popupHeight) / 2),
      }));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Calculate relationships
  const relationships = useMemo(() => {
    const rels: Relationship[] = [];

    // Find outgoing relationships (foreign keys from this table)
    table.foreignKeys?.forEach((fk) => {
      const referencedTableName = fk.referencedTable;
      const referencedSchema = fk.referencedSchema || table.schema;
      
      // Find the target table node
      const targetNode = allNodes.find(
        (node) =>
          node.data.table.name === referencedTableName &&
          node.data.table.schema === referencedSchema
      );

      if (targetNode) {
        rels.push({
          type: "outgoing",
          foreignKey: fk,
          sourceTable: table,
          targetTable: targetNode.data.table,
        });
      }
    });

    // Find incoming relationships (foreign keys pointing to this table)
    allNodes.forEach((node) => {
      if (node.data.table.id === table.id) return;

      node.data.table.foreignKeys?.forEach((fk) => {
        const referencedTableName = fk.referencedTable;
        const referencedSchema = fk.referencedSchema || node.data.table.schema;

        if (
          referencedTableName === table.name &&
          referencedSchema === table.schema
        ) {
          rels.push({
            type: "incoming",
            foreignKey: fk,
            sourceTable: node.data.table,
            targetTable: table,
          });
        }
      });
    });

    return rels;
  }, [table, allNodes]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!headerRef.current?.contains(e.target as Node)) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);

  // Handle drag move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 300, e.clientY - dragStart.y));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleNodeClick = (nodeId: string) => {
    onNodeSelect?.(nodeId);
    onClose();
  };

  const outgoingRels = relationships.filter((r) => r.type === "outgoing");
  const incomingRels = relationships.filter((r) => r.type === "incoming");

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-[400px] bg-card border border-border rounded-lg shadow-2xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "default",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Draggable header */}
      <div
        ref={headerRef}
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <div>
            <h3 className="font-semibold text-sm">{table.name}</h3>
            <p className="text-xs text-muted-foreground">{table.schema}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
        {/* Outgoing relationships */}
        {outgoingRels.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-sm">References To</h4>
              <span className="text-xs text-muted-foreground">
                ({outgoingRels.length})
              </span>
            </div>
            <div className="space-y-2">
              {outgoingRels.map((rel, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-md border border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={(e) => {
                    e.stopPropagation();
                    const targetNode = allNodes.find(
                      (n) => n.data.table.id === rel.targetTable.id
                    );
                    if (targetNode) handleNodeClick(targetNode.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {rel.targetTable.schema}.{rel.targetTable.name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      <span className="font-medium">FK:</span> {rel.foreignKey.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>
                        {rel.foreignKey.columns.join(", ")}
                      </span>
                      <ArrowRight className="w-3 h-3" />
                      <span>
                        {rel.foreignKey.referencedColumns.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incoming relationships */}
        {incomingRels.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowLeft className="w-4 h-4 text-accent" />
              <h4 className="font-medium text-sm">Referenced By</h4>
              <span className="text-xs text-muted-foreground">
                ({incomingRels.length})
              </span>
            </div>
            <div className="space-y-2">
              {incomingRels.map((rel, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-md border border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const sourceNode = allNodes.find(
                      (n) => n.data.table.id === rel.sourceTable.id
                    );
                    if (sourceNode) handleNodeClick(sourceNode.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {rel.sourceTable.schema}.{rel.sourceTable.name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      <span className="font-medium">FK:</span> {rel.foreignKey.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <span>
                        {rel.foreignKey.columns.join(", ")}
                      </span>
                      <ArrowRight className="w-3 h-3" />
                      <span>
                        {rel.foreignKey.referencedColumns.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No relationships */}
        {outgoingRels.length === 0 && incomingRels.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No relationships found</p>
            <p className="text-xs mt-1">
              This table has no foreign key relationships
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


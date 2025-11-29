/**
 * Diagram Node interface (for ReactFlow)
 */
export interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    table: {
      id: string;
      name: string;
      schema: string;
      rowCount?: number;
      size?: string;
      columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        defaultValue?: string;
        isPrimaryKey: boolean;
        isForeignKey: boolean;
      }>;
      indexes?: Array<{
        name: string;
        type: string;
        columns: string[];
        unique: boolean;
      }>;
      foreignKeys?: Array<{
        name: string;
        columns: string[];
        referencedTable: string;
        referencedColumns: string[];
      }>;
    };
    isHighlighted?: boolean;
  };
}

/**
 * Diagram Edge interface (for ReactFlow)
 */
export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  label?: string;
  labelStyle?: { fontSize: number; fontWeight: number };
  style?: {
    stroke: string;
    strokeWidth: number;
    opacity?: number;
  };
  markerEnd?: {
    type: string;
    color: string;
  };
}

/**
 * Diagram response interface
 */
export interface DiagramResponse {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

/**
 * Relationship response interface
 */
export interface RelationshipResponse {
  outgoing: Array<{
    constraintName: string;
    columns: string[];
    referencedSchema: string;
    referencedTable: string;
    referencedColumns: string[];
  }>;
  incoming: Array<{
    constraintName: string;
    schema: string;
    table: string;
    columns: string[];
    referencedColumns: string[];
  }>;
}


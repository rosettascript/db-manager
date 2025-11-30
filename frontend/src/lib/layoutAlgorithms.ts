import { Node, Edge } from "reactflow";
import type { ElkNode } from "elkjs";

// Lazy load ELK.js only when hierarchical layout is needed
let elkInstance: any = null;
let elkPromise: Promise<any> | null = null;

const getELK = async () => {
  if (elkInstance) {
    return elkInstance;
  }
  
  if (!elkPromise) {
    elkPromise = (async () => {
      const ELK = (await import("elkjs/lib/elk.bundled.js")).default;
      elkInstance = new ELK();
      return elkInstance;
    })();
  }
  
  return elkPromise;
};

export type LayoutAlgorithm = "force" | "hierarchical" | "circular" | "grid";

// Calculate estimated node height based on column count and expanded state
const estimateNodeHeight = (node: Node, expanded: boolean): number => {
  const columnCount = (node.data as any)?.table?.columns?.length || 10;
  const visibleColumns = expanded ? columnCount : Math.min(columnCount, 10);
  
  // Base height: header (~80px) + padding (~20px) = ~100px
  // Each column row: ~30px
  // Add extra padding for expanded nodes
  const baseHeight = 100;
  const columnHeight = visibleColumns * 30;
  const extraPadding = expanded ? 40 : 0;
  
  return baseHeight + columnHeight + extraPadding;
};

// Force-directed layout (simple grid-based)
export const forceLayout = (nodes: Node[], expanded: boolean = false): Node[] => {
  // Calculate dynamic spacing based on node heights
  const maxHeight = Math.max(...nodes.map(node => estimateNodeHeight(node, expanded)));
  const verticalSpacing = Math.max(350, maxHeight + 50); // At least 50px gap between nodes
  
  return nodes.map((node, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return {
      ...node,
      position: {
        x: 100 + col * 400,
        y: 100 + row * verticalSpacing,
      },
    };
  });
};

// Hierarchical layout using ELK
export const hierarchicalLayout = async (
  nodes: Node[],
  edges: Edge[],
  expanded: boolean = false
): Promise<Node[]> => {
  const elkNodes: ElkNode["children"] = nodes.map((node) => ({
    id: node.id,
    width: 320,
    height: estimateNodeHeight(node, expanded),
  }));

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  // Calculate dynamic spacing based on node heights
  const maxHeight = Math.max(...nodes.map(node => estimateNodeHeight(node, expanded)));
  const nodeSpacing = Math.max(80, maxHeight * 0.2); // 20% of max height as spacing
  const layerSpacing = Math.max(100, maxHeight * 0.3); // 30% of max height between layers

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": String(nodeSpacing),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(layerSpacing),
    },
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    const elk = await getELK();
    const layout = await elk.layout(graph);

    return nodes.map((node) => {
      const elkNode = layout.children?.find((n) => n.id === node.id);
      if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
        return {
          ...node,
          position: {
            x: elkNode.x,
            y: elkNode.y,
          },
        };
      }
      return node;
    });
  } catch (error) {
    console.error("Layout error:", error);
    return forceLayout(nodes, expanded);
  }
};

// Circular layout
export const circularLayout = (nodes: Node[], expanded: boolean = false): Node[] => {
  // Calculate dynamic radius based on node heights
  const maxHeight = Math.max(...nodes.map(node => estimateNodeHeight(node, expanded)));
  const baseRadius = Math.max(400, nodes.length * 50);
  const radius = expanded ? baseRadius + (maxHeight * 0.5) : baseRadius;
  
  const angleStep = (2 * Math.PI) / nodes.length;
  const centerX = 600;
  const centerY = 400;

  return nodes.map((node, idx) => {
    const angle = idx * angleStep;
    const nodeHeight = estimateNodeHeight(node, expanded);
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle) - 160,
        y: centerY + radius * Math.sin(angle) - (nodeHeight / 2),
      },
    };
  });
};

// Grid layout
export const gridLayout = (nodes: Node[], expanded: boolean = false): Node[] => {
  // Calculate dynamic spacing based on node heights
  const maxHeight = Math.max(...nodes.map(node => estimateNodeHeight(node, expanded)));
  const verticalSpacing = Math.max(350, maxHeight + 50); // At least 50px gap between nodes
  const horizontalSpacing = 400; // Keep horizontal spacing consistent
  
  const cols = Math.ceil(Math.sqrt(nodes.length));
  return nodes.map((node, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      ...node,
      position: {
        x: 100 + col * horizontalSpacing,
        y: 100 + row * verticalSpacing,
      },
    };
  });
};

export const applyLayout = async (
  algorithm: LayoutAlgorithm,
  nodes: Node[],
  edges: Edge[],
  expanded: boolean = false
): Promise<Node[]> => {
  switch (algorithm) {
    case "hierarchical":
      return await hierarchicalLayout(nodes, edges, expanded);
    case "circular":
      return circularLayout(nodes, expanded);
    case "grid":
      return gridLayout(nodes, expanded);
    case "force":
    default:
      return forceLayout(nodes, expanded);
  }
};

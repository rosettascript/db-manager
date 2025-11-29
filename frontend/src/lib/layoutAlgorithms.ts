import { Node, Edge } from "reactflow";
import ELK, { ElkNode } from "elkjs/lib/elk.bundled.js";

const elk = new ELK();

export type LayoutAlgorithm = "force" | "hierarchical" | "circular" | "grid";

// Force-directed layout (simple grid-based)
export const forceLayout = (nodes: Node[]): Node[] => {
  return nodes.map((node, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return {
      ...node,
      position: {
        x: 100 + col * 400,
        y: 100 + row * 350,
      },
    };
  });
};

// Hierarchical layout using ELK
export const hierarchicalLayout = async (
  nodes: Node[],
  edges: Edge[]
): Promise<Node[]> => {
  const elkNodes: ElkNode["children"] = nodes.map((node) => ({
    id: node.id,
    width: 320,
    height: 300,
  }));

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
    },
    children: elkNodes,
    edges: elkEdges,
  };

  try {
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
    return forceLayout(nodes);
  }
};

// Circular layout
export const circularLayout = (nodes: Node[]): Node[] => {
  const radius = Math.max(400, nodes.length * 50);
  const angleStep = (2 * Math.PI) / nodes.length;
  const centerX = 600;
  const centerY = 400;

  return nodes.map((node, idx) => {
    const angle = idx * angleStep;
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle) - 160,
        y: centerY + radius * Math.sin(angle) - 150,
      },
    };
  });
};

// Grid layout
export const gridLayout = (nodes: Node[]): Node[] => {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  return nodes.map((node, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      ...node,
      position: {
        x: 100 + col * 400,
        y: 100 + row * 350,
      },
    };
  });
};

export const applyLayout = async (
  algorithm: LayoutAlgorithm,
  nodes: Node[],
  edges: Edge[]
): Promise<Node[]> => {
  switch (algorithm) {
    case "hierarchical":
      return await hierarchicalLayout(nodes, edges);
    case "circular":
      return circularLayout(nodes);
    case "grid":
      return gridLayout(nodes);
    case "force":
    default:
      return forceLayout(nodes);
  }
};

import { useState, useCallback, useMemo, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionLineType,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng, toSvg } from "html-to-image";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Layout,
  Move,
  Grid3X3,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockTables } from "@/lib/mockData";
import { FlowTableNode, TableNodeData } from "@/components/diagram/FlowTableNode";
import { DiagramFilters } from "@/components/diagram/DiagramFilters";
import { toast } from "sonner";
import {
  applyLayout,
  LayoutAlgorithm,
} from "@/lib/layoutAlgorithms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nodeTypes = {
  tableNode: FlowTableNode,
};

const ERDiagramContent = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  
  const [showRelationships, setShowRelationships] = useState(true);
  const [showIsolatedTables, setShowIsolatedTables] = useState(true);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>(["public"]);
  const [currentLayout, setCurrentLayout] = useState<LayoutAlgorithm>("grid");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Initialize nodes from mockTables
  const initialNodes: Node<TableNodeData>[] = useMemo(() => {
    return mockTables.map((table, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      return {
        id: table.id,
        type: "tableNode",
        position: { x: 100 + col * 400, y: 100 + row * 350 },
        data: {
          table,
          isHighlighted: false,
        },
      };
    });
  }, []);

  // Initialize edges from foreign keys
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    mockTables.forEach((table) => {
      table.foreignKeys.forEach((fk) => {
        const targetTable = mockTables.find((t) => t.name === fk.referencedTable);
        if (targetTable) {
          edges.push({
            id: `${table.id}-${targetTable.id}-${fk.columns.join(",")}`,
            source: table.id,
            target: targetTable.id,
            type: "smoothstep",
            animated: false,
            label: fk.columns.join(", "),
            labelStyle: { fontSize: 10, fontWeight: 500 },
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: "hsl(var(--primary))",
            },
          });
        }
      });
    });
    return edges;
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update highlighted state based on hover
  const updateHighlightedNodes = useCallback((nodeId: string | null) => {
    if (!nodeId) {
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: { ...node.data, isHighlighted: false },
        }))
      );
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          animated: false,
          style: { ...edge.style, strokeWidth: 2, opacity: 0.6 },
        }))
      );
      return;
    }

    // Find connected nodes
    const connectedNodes = new Set<string>([nodeId]);
    const connectedEdges = new Set<string>();
    
    edges.forEach((edge) => {
      if (edge.source === nodeId) {
        connectedNodes.add(edge.target);
        connectedEdges.add(edge.id);
      }
      if (edge.target === nodeId) {
        connectedNodes.add(edge.source);
        connectedEdges.add(edge.id);
      }
    });

    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHighlighted: connectedNodes.has(node.id),
        },
      }))
    );

    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: connectedEdges.has(edge.id),
        style: {
          ...edge.style,
          strokeWidth: connectedEdges.has(edge.id) ? 3 : 2,
          opacity: connectedEdges.has(edge.id) ? 1 : 0.3,
          stroke: connectedEdges.has(edge.id)
            ? "hsl(var(--accent))"
            : "hsl(var(--primary))",
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: connectedEdges.has(edge.id)
            ? "hsl(var(--accent))"
            : "hsl(var(--primary))",
        },
      }))
    );
  }, [edges, setNodes, setEdges]);

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setHoveredNode(node.id);
      updateHighlightedNodes(node.id);
    },
    [updateHighlightedNodes]
  );

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
    updateHighlightedNodes(null);
  }, [updateHighlightedNodes]);

  const handleAutoLayout = useCallback(
    async (algorithm: LayoutAlgorithm) => {
      setCurrentLayout(algorithm);
      const layoutedNodes = await applyLayout(algorithm, nodes, edges);
      setNodes(layoutedNodes);
      
      // Fit view after a short delay to ensure layout is applied
      setTimeout(() => {
        fitView({ duration: 400, padding: 0.1 });
      }, 100);
      
      const layoutNames = {
        grid: "Grid",
        force: "Force-Directed",
        hierarchical: "Hierarchical",
        circular: "Circular",
      };
      toast.success(`Applied ${layoutNames[algorithm]} layout`);
    },
    [nodes, edges, setNodes, fitView]
  );

  const handleFitView = useCallback(() => {
    fitView({ duration: 400, padding: 0.1 });
    toast.success("Fit to view");
  }, [fitView]);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleExportPNG = useCallback(async () => {
    if (!reactFlowWrapper.current) return;

    try {
      const dataUrl = await toPng(reactFlowWrapper.current, {
        backgroundColor: "white",
        filter: (node) => {
          // Exclude controls and other UI elements
          if (node.classList?.contains("react-flow__controls")) return false;
          if (node.classList?.contains("react-flow__minimap")) return false;
          if (node.classList?.contains("react-flow__panel")) return false;
          return true;
        },
      });

      const link = document.createElement("a");
      link.download = `er-diagram-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Exported as PNG");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export diagram");
    }
  }, []);

  const handleExportSVG = useCallback(async () => {
    if (!reactFlowWrapper.current) return;

    try {
      const dataUrl = await toSvg(reactFlowWrapper.current, {
        backgroundColor: "white",
        filter: (node) => {
          if (node.classList?.contains("react-flow__controls")) return false;
          if (node.classList?.contains("react-flow__minimap")) return false;
          if (node.classList?.contains("react-flow__panel")) return false;
          return true;
        },
      });

      const link = document.createElement("a");
      link.download = `er-diagram-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
      toast.success("Exported as SVG");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export diagram");
    }
  }, []);

  // Filter edges based on showRelationships
  const visibleEdges = useMemo(() => {
    return showRelationships ? edges : [];
  }, [edges, showRelationships]);

  return (
    <div className="h-full flex flex-col bg-muted/20">
      <div className="border-b border-border bg-card px-6 py-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ER Diagram</h1>
            <p className="text-sm text-muted-foreground mt-1">
              High-performance visualization with virtual rendering • Drag tables to reposition
            </p>
          </div>
          <div className="flex gap-2">
            <DiagramFilters
              schemas={["public"]}
              selectedSchemas={selectedSchemas}
              onToggleSchema={(schema) => {
                setSelectedSchemas((prev) =>
                  prev.includes(schema)
                    ? prev.filter((s) => s !== schema)
                    : [...prev, schema]
                );
              }}
              showRelationships={showRelationships}
              onToggleRelationships={setShowRelationships}
              showIsolatedTables={showIsolatedTables}
              onToggleIsolatedTables={setShowIsolatedTables}
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Layout className="w-4 h-4" />
                  Layout
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAutoLayout("grid")}>
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Grid Layout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAutoLayout("hierarchical")}>
                  <Layers className="w-4 h-4 mr-2" />
                  Hierarchical Layout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAutoLayout("circular")}>
                  <Layout className="w-4 h-4 mr-2" />
                  Circular Layout
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAutoLayout("force")}>
                  <Move className="w-4 h-4 mr-2" />
                  Force-Directed Layout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleFitView}>
              <Maximize className="w-4 h-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPNG}>
                  Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSVG}>
                  Export as SVG
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          minZoom={0.1}
          maxZoom={2}
          defaultEdgeOptions={{
            type: "smoothstep",
            animated: false,
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              if (node.data?.isHighlighted) return "hsl(var(--accent))";
              return "hsl(var(--primary))";
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
            className="!bg-card/95 !border !border-border"
          />
          <Panel position="bottom-left" className="bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary animate-pulse-glow" />
                <span className="text-muted-foreground">Primary Key</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span className="text-muted-foreground">Foreign Key</span>
              </div>
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Drag tables • Mouse wheel to zoom • {mockTables.length} tables
                </span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
};

const ERDiagram = () => {
  return (
    <ReactFlowProvider>
      <ERDiagramContent />
    </ReactFlowProvider>
  );
};

export default ERDiagram;

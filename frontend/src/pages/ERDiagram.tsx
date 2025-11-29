import { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@/contexts/ConnectionContext";
import { diagramService, schemasService } from "@/lib/api";
import type { DiagramNode, DiagramEdge, Table } from "@/lib/api/types";

const nodeTypes = {
  tableNode: FlowTableNode,
};

const ERDiagramContent = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const { activeConnection } = useConnection();
  
  const [showRelationships, setShowRelationships] = useState(true);
  const [showIsolatedTables, setShowIsolatedTables] = useState(true);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([]);
  const [currentLayout, setCurrentLayout] = useState<LayoutAlgorithm>("grid");
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Fetch available schemas for filtering
  const {
    data: schemas = [],
    isLoading: schemasLoading,
  } = useQuery({
    queryKey: ['schemas', activeConnection?.id],
    queryFn: () => schemasService.getSchemas(activeConnection!.id),
    enabled: !!activeConnection,
    staleTime: 60000,
  });

  // Auto-select first schema if none selected and schemas are available
  useEffect(() => {
    if (selectedSchemas.length === 0 && schemas.length > 0 && !schemasLoading) {
      setSelectedSchemas([schemas[0].name]);
    }
  }, [schemas, selectedSchemas.length, schemasLoading]);

  // Fetch diagram data
  const {
    data: diagramData,
    isLoading: diagramLoading,
    error: diagramError,
    refetch: refetchDiagram,
  } = useQuery({
    queryKey: ['diagram', activeConnection?.id, [...selectedSchemas].sort().join(','), showIsolatedTables],
    queryFn: () => diagramService.getDiagram(activeConnection!.id, {
      schemas: selectedSchemas.length > 0 ? selectedSchemas : undefined,
      showIsolatedTables,
    }),
    enabled: !!activeConnection && selectedSchemas.length > 0,
    staleTime: 60000, // 1 minute
  });

  // Transform API nodes to ReactFlow format
  const apiNodes: Node<TableNodeData>[] = useMemo(() => {
    if (!diagramData?.nodes || !Array.isArray(diagramData.nodes)) {
      return [];
    }
    
    return diagramData.nodes.map((apiNode: DiagramNode) => {
      // Transform table data to match FlowTableNode expectations
      const table: Table = {
        id: apiNode.data.table.id,
        name: apiNode.data.table.name,
        schema: apiNode.data.table.schema,
        rowCount: apiNode.data.table.rowCount || 0,
        size: apiNode.data.table.size || "0 KB",
        sizeBytes: 0,
        columns: apiNode.data.table.columns || [],
        indexes: apiNode.data.table.indexes || [],
        foreignKeys: apiNode.data.table.foreignKeys || [],
      };

      return {
        id: apiNode.id,
        type: apiNode.type || "tableNode",
        position: apiNode.position,
        data: {
          table,
          isHighlighted: apiNode.data.isHighlighted || false,
        },
      };
    });
  }, [diagramData]);

  // Transform API edges to ReactFlow format
  const apiEdges: Edge[] = useMemo(() => {
    if (!diagramData?.edges || !Array.isArray(diagramData.edges)) {
      return [];
    }
    
    return diagramData.edges.map((apiEdge: DiagramEdge) => ({
      id: apiEdge.id,
      source: apiEdge.source,
      target: apiEdge.target,
      type: apiEdge.type || "smoothstep",
      animated: apiEdge.animated || false,
      label: apiEdge.label,
      labelStyle: apiEdge.labelStyle || { fontSize: 10, fontWeight: 500 },
      style: {
        stroke: "hsl(var(--primary))",
        strokeWidth: 2,
        opacity: 0.6,
        ...apiEdge.style,
      },
      markerEnd: apiEdge.markerEnd || {
        type: MarkerType.ArrowClosed,
        color: "hsl(var(--primary))",
      },
    }));
  }, [diagramData]);

  // Initialize with empty arrays, will be updated when API data arrives
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Get storage key for this connection and schema combination
  const storageKey = useMemo(() => {
    if (!activeConnection?.id || selectedSchemas.length === 0) {
      return null;
    }
    return `er-diagram-positions-${activeConnection.id}-${[...selectedSchemas].sort().join(',')}`;
  }, [activeConnection?.id, selectedSchemas]);

  // Load saved positions from localStorage
  const loadSavedPositions = useCallback(() => {
    if (!storageKey) return null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved) as Record<string, { x: number; y: number }>;
      }
    } catch (error) {
      console.error('Failed to load saved positions:', error);
    }
    return null;
  }, [storageKey]);

  // Save positions to localStorage
  const savePositions = useCallback((nodePositions: Record<string, { x: number; y: number }>) => {
    if (!storageKey || Object.keys(nodePositions).length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(nodePositions));
    } catch (error) {
      console.error('Failed to save positions:', error);
    }
  }, [storageKey]);

  // Clear saved positions (e.g., when applying a layout)
  const clearSavedPositions = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear saved positions:', error);
    }
  }, [storageKey]);

  // Update nodes and edges when API data changes
  useEffect(() => {
    if (apiNodes.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Load saved positions
    const savedPositions = loadSavedPositions();
    
    // Merge API nodes with saved positions (only for nodes that exist)
    const nodesWithSavedPositions = apiNodes.map((node) => {
      if (savedPositions && savedPositions[node.id]) {
        return {
          ...node,
          position: savedPositions[node.id],
        };
      }
      return node;
    });
    
    // Clean up saved positions for nodes that no longer exist
    if (savedPositions) {
      const existingNodeIds = new Set(apiNodes.map(n => n.id));
      const positionsToKeep: Record<string, { x: number; y: number }> = {};
      Object.keys(savedPositions).forEach(nodeId => {
        if (existingNodeIds.has(nodeId)) {
          positionsToKeep[nodeId] = savedPositions[nodeId];
        }
      });
      if (Object.keys(positionsToKeep).length !== Object.keys(savedPositions).length) {
        // Some nodes were removed, update saved positions
        if (Object.keys(positionsToKeep).length > 0) {
          savePositions(positionsToKeep);
        } else {
          clearSavedPositions();
        }
      }
    }

    setNodes(nodesWithSavedPositions);
    setEdges(apiEdges);
    
    // Fit view after nodes are set (only if we have nodes and no saved positions)
    // If we have saved positions, don't auto-fit as user has manually positioned nodes
    if (apiNodes.length > 0 && !savedPositions) {
      setTimeout(() => {
        fitView({ duration: 400, padding: 0.1 });
      }, 200);
    }
  }, [apiNodes, apiEdges, setNodes, setEdges, fitView, loadSavedPositions]);

  // Save positions whenever nodes change (debounced)
  useEffect(() => {
    if (nodes.length === 0 || !storageKey) return;

    // Debounce saving to avoid too many writes
    const timeoutId = setTimeout(() => {
      const positions: Record<string, { x: number; y: number }> = {};
      nodes.forEach((node) => {
        if (node.position) {
          positions[node.id] = {
            x: node.position.x,
            y: node.position.y,
          };
        }
      });
      savePositions(positions);
    }, 500); // Save 500ms after last change

    return () => clearTimeout(timeoutId);
  }, [nodes, storageKey, savePositions]);

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

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchDiagram();
    toast.success("Diagram refreshed");
  }, [refetchDiagram]);

  // Handle isolated tables toggle - this will trigger a refetch
  const handleToggleIsolatedTables = useCallback((value: boolean) => {
    setShowIsolatedTables(value);
  }, []);

  const isLoading = diagramLoading || schemasLoading;
  const hasError = !!diagramError;
  const hasNoConnection = !activeConnection;
  const hasNoSchemas = selectedSchemas.length === 0 && schemas.length > 0;

  // Get schema names for filter
  const schemaNames = useMemo(() => schemas.map(s => s.name), [schemas]);


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
              schemas={schemaNames}
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
              onToggleIsolatedTables={handleToggleIsolatedTables}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={!activeConnection || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </>
              )}
            </Button>
            
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
        {hasNoConnection ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">No active connection</p>
              <p className="text-sm mt-1">Please connect to a database first</p>
            </div>
          </div>
        ) : hasNoSchemas ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">No schemas selected</p>
              <p className="text-sm mt-1">Select at least one schema to view the diagram</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading diagram...</p>
            </div>
          </div>
        ) : hasError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-destructive">
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">Failed to load diagram</p>
              <p className="text-sm mt-1">
                {diagramError instanceof Error
                  ? diagramError.message
                  : "Unknown error occurred"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-4 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">No tables found</p>
              <p className="text-sm mt-1">No tables match the selected filters</p>
            </div>
          </div>
        ) : (
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
                  Drag tables • Mouse wheel to zoom • {nodes.length} table{nodes.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </Panel>
        </ReactFlow>
        )}
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

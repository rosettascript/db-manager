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
  Maximize2,
  Download,
  Layout,
  Move,
  Grid3X3,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

// Default node types
const nodeTypes = {
  tableNode: FlowTableNode,
};

// Separate component for fullscreen view to avoid ReactFlow context conflicts
const FullscreenDiagramView = ({
  nodes,
  edges,
  onNodeMouseEnter,
  onNodeMouseLeave,
  onNodeClick,
  onPaneClick,
  expanded,
  fitTrigger,
}: {
  nodes: Node<TableNodeData>[];
  edges: Edge[];
  onNodeMouseEnter: (event: React.MouseEvent, node: Node) => void;
  onNodeMouseLeave: () => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onPaneClick: () => void;
  expanded: boolean;
  fitTrigger: number;
}) => {
  const [fullscreenNodes, setFullscreenNodes, onFullscreenNodesChange] = useNodesState(nodes);
  const [fullscreenEdges, setFullscreenEdges, onFullscreenEdgesChange] = useEdgesState(edges);
  const { fitView } = useReactFlow();

  // Sync nodes and edges when they change
  useEffect(() => {
    setFullscreenNodes(nodes);
  }, [nodes, setFullscreenNodes]);

  useEffect(() => {
    setFullscreenEdges(edges);
  }, [edges, setFullscreenEdges]);

  // Fit view when trigger changes
  useEffect(() => {
    if (fitTrigger > 0) {
      fitView({ duration: 0, padding: 0.1 });
    }
  }, [fitTrigger, fitView]);

  return (
    <ReactFlow
      nodes={fullscreenNodes}
      edges={fullscreenEdges}
      onNodesChange={onFullscreenNodesChange}
      onEdgesChange={onFullscreenEdgesChange}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
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
  );
};

const ERDiagramContent = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut, getViewport, setViewport, getNode } = useReactFlow();
  const { activeConnection } = useConnection();
  
  const [showRelationships, setShowRelationships] = useState(true);
  const [showIsolatedTables, setShowIsolatedTables] = useState(true);
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>([]);
  const [currentLayout, setCurrentLayout] = useState<LayoutAlgorithm>("grid");
  const [hasExplicitLayout, setHasExplicitLayout] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [clickedNode, setClickedNode] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nodesExpanded, setNodesExpanded] = useState(false);
  const [fullscreenFitTrigger, setFullscreenFitTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fullscreenDiagramRef = useRef<HTMLDivElement>(null);

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
      // Silently handle parse errors
    }
    return null;
  }, [storageKey]);

  // Save positions to localStorage
  const savePositions = useCallback((nodePositions: Record<string, { x: number; y: number }>) => {
    if (!storageKey || Object.keys(nodePositions).length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(nodePositions));
    } catch (error) {
      // Silently handle storage errors
    }
  }, [storageKey]);

  // Clear saved positions (e.g., when applying a layout)
  const clearSavedPositions = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      // Silently handle storage errors
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
      const nodeWithPosition = savedPositions && savedPositions[node.id]
        ? {
            ...node,
            position: savedPositions[node.id],
          }
        : node;
      
      // Add expanded state to node data
      return {
        ...nodeWithPosition,
        data: {
          ...nodeWithPosition.data,
          expanded: nodesExpanded,
        },
      };
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
  }, [apiNodes, apiEdges, setNodes, setEdges, fitView, loadSavedPositions, nodesExpanded]);

  // Update expanded state in existing nodes when nodesExpanded changes
  // This ensures nodes are updated even if the state changes from other sources
  useEffect(() => {
    if (nodes.length === 0) return;
    
    setNodes((nds) => {
      // Check if any node needs updating
      const needsUpdate = nds.some(node => node.data?.expanded !== nodesExpanded);
      if (!needsUpdate) return nds;
      
      // Update all nodes with the new expanded state
      return nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          expanded: nodesExpanded,
        },
      }));
    });
  }, [nodesExpanded, setNodes, nodes.length]);

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

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setHoveredNode(node.id);
      // Effect will handle highlighting (click takes priority over hover)
    },
    []
  );

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
    // Effect will handle highlighting (click takes priority over hover)
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Toggle selection: if clicking the same node, deselect it; otherwise select the new node
      if (clickedNode === node.id) {
        setClickedNode(null);
      } else {
        setClickedNode(node.id);
      }
      // Effect will handle highlighting
    },
    [clickedNode]
  );

  const onPaneClick = useCallback(() => {
    // Clicking on empty space deselects the clicked node
    setClickedNode(null);
  }, []);

  // Use a ref to store the current edges to avoid infinite loops
  const edgesRef = useRef<Edge[]>([]);
  
  // Update the ref whenever edges change
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Update highlights when clickedNode or hoveredNode changes
  useEffect(() => {
    // Click takes priority over hover
    const activeNodeId = clickedNode || hoveredNode;
    
    if (!activeNodeId) {
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

    // Find connected nodes using the ref to avoid dependency on edges
    const currentEdges = edgesRef.current;
    const connectedNodes = new Set<string>([activeNodeId]);
    const connectedEdges = new Set<string>();
    
    currentEdges.forEach((edge) => {
      if (edge.source === activeNodeId) {
        connectedNodes.add(edge.target);
        connectedEdges.add(edge.id);
      }
      if (edge.target === activeNodeId) {
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
  }, [clickedNode, hoveredNode, setNodes, setEdges]);

  const handleAutoLayout = useCallback(
    async (algorithm: LayoutAlgorithm) => {
      setCurrentLayout(algorithm);
      setHasExplicitLayout(true);
      // Pass expanded state to layout algorithms so they can adjust spacing
      const layoutedNodes = await applyLayout(algorithm, nodes, edges, nodesExpanded);
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
      toast.success(`Applied ${layoutNames[algorithm]} layout${nodesExpanded ? ' (expanded nodes)' : ''}`);
    },
    [nodes, edges, setNodes, fitView, nodesExpanded]
  );

  const handleFitView = useCallback(() => {
    fitView({ duration: 400, padding: 0.1 });
    toast.success("Fit to view");
  }, [fitView]);

  // Focus on a specific node by ID
  const focusOnNode = useCallback((nodeId: string) => {
    const node = getNode(nodeId);
    if (!node || !node.position) return;

    // Use fitView to focus on the specific node with padding
    // This will automatically calculate the best zoom and position
    fitView({ 
      nodes: [{ id: nodeId }],
      duration: 500,
      padding: 0.2, // 20% padding around the node
      maxZoom: 1.5, // Don't zoom in too much
      minZoom: 0.3,
    });
    
    // Also highlight the node by selecting it
    setClickedNode(nodeId);
    
    // Keep it highlighted for a few seconds so user can see it
    setTimeout(() => {
      // User can manually deselect if they want
    }, 3000);
  }, [getNode, fitView]);

  // Handle search - filter nodes and focus on first match
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim() || nodes.length === 0) {
      setClickedNode(null);
      return;
    }

    // Search for nodes matching the query (case-insensitive)
    const searchLower = query.toLowerCase().trim();
    const matchingNodes = nodes.filter((node) => {
      const tableName = node.data?.table?.name?.toLowerCase() || "";
      const schemaName = node.data?.table?.schema?.toLowerCase() || "";
      const fullName = `${schemaName}.${tableName}`;
      return tableName.includes(searchLower) || fullName.includes(searchLower);
    });

    if (matchingNodes.length > 0) {
      // Focus on the first matching node
      const firstMatch = matchingNodes[0];
      focusOnNode(firstMatch.id);
      
      if (matchingNodes.length > 1) {
        toast.info(`Found ${matchingNodes.length} tables. Showing first match: ${firstMatch.data?.table?.name}`, {
          duration: 2000,
        });
      } else {
        toast.success(`Focused on: ${firstMatch.data?.table?.name}`, {
          duration: 1500,
        });
      }
    } else {
      toast.error(`No table found matching "${query}"`, {
        duration: 2000,
      });
    }
  }, [nodes, focusOnNode]);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleExportPNG = useCallback(async () => {
    if (!reactFlowWrapper.current || isExporting || nodes.length === 0) return;

    setIsExporting(true);
    setExportProgress(0);

    // Show loading toast with progress bar
    const toastId = toast.loading("Preparing export...", {
      description: (
        <div className="w-full mt-2">
          <Progress value={0} className="h-2" />
        </div>
      ),
    });

    let currentViewport: any = null;

    try {
      // Save current viewport to restore later
      currentViewport = getViewport();

      // Temporarily fit the view to capture the entire diagram
      fitView({ duration: 0, padding: 0.1 });

      // Wait for the fit to complete (ReactFlow needs a moment to update)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Find the ReactFlow elements
      const reactFlowViewport = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement;
      const reactFlowPane = reactFlowWrapper.current.querySelector('.react-flow__renderer') as HTMLElement;

      if (!reactFlowViewport || !reactFlowPane) {
        toast.error("Could not find diagram element", { id: toastId });
        setIsExporting(false);
        return;
      }


      // Start progress animation
      let currentProgress = 0;
      let progressInterval: NodeJS.Timeout | null = null;
      let isExportComplete = false;
      
      const updateProgress = () => {
        if (!isExportComplete && currentProgress < 95) {
          let increment: number;
          if (currentProgress < 30) {
            increment = 4 + Math.random() * 3;
          } else if (currentProgress < 70) {
            increment = 2 + Math.random() * 2;
          } else {
            increment = 0.5 + Math.random() * 1;
          }
          currentProgress = Math.min(currentProgress + increment, 95);
          setExportProgress(currentProgress);
          toast.loading("Generating high-quality image...", {
            id: toastId,
            description: (
              <div className="w-full mt-2 space-y-1">
                <Progress value={currentProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">{Math.round(currentProgress)}%</p>
              </div>
            ),
          });
        }
      };

      progressInterval = setInterval(updateProgress, 150);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Since SVG export works, use it and convert to PNG properly
      // Find the ReactFlow viewport (same as SVG export)
      const targetElement = reactFlowViewport || reactFlowWrapper.current;
      
      if (!targetElement) {
        toast.error("Could not find diagram element", { id: toastId });
        setIsExporting(false);
        return;
      }
      
      // Export as SVG first (which we know works and captures everything)
      const svgDataUrl = await toSvg(targetElement, {
        backgroundColor: "white",
        quality: 1.0,
        filter: (node) => {
          if (node.classList?.contains("react-flow__controls")) return false;
          if (node.classList?.contains("react-flow__minimap")) return false;
          if (node.classList?.contains("react-flow__panel")) return false;
          if (node.classList?.contains("react-flow__background")) return true;
          return true;
        },
      });
      
      // Parse SVG to get actual dimensions
      let svgText = '';
      if (svgDataUrl.includes('base64')) {
        // Base64 encoded
        const base64Data = svgDataUrl.split(',')[1];
        svgText = atob(base64Data);
      } else {
        // URL encoded
        svgText = decodeURIComponent(svgDataUrl.split(',')[1] || '');
      }
      
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;
      
      // Get dimensions from SVG
      let svgWidth = parseFloat(svgElement.getAttribute('width') || '0');
      let svgHeight = parseFloat(svgElement.getAttribute('height') || '0');

      // If no explicit width/height, try viewBox
      if (!svgWidth || !svgHeight || svgWidth === 0 || svgHeight === 0) {
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(/\s+|,/).filter(p => p).map(parseFloat);
          if (parts.length >= 4) {
            svgWidth = parts[2];
            svgHeight = parts[3];
          }
        }
      }

      // Final fallback: use viewport dimensions
      if (!svgWidth || !svgHeight || svgWidth === 0 || svgHeight === 0) {
        const viewportRect = reactFlowViewport.getBoundingClientRect();
        svgWidth = viewportRect.width || 2000;
        svgHeight = viewportRect.height || 2000;
      }

      // Convert SVG to PNG with high quality
      const pixelRatio = 5; // Ultra-high quality
      
      // Create an image from the SVG
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Wait for image to load
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = svgDataUrl;
      });
      
      // Use the actual SVG dimensions for canvas
      const canvas = document.createElement('canvas');
      canvas.width = svgWidth * pixelRatio;
      canvas.height = svgHeight * pixelRatio;
      
      // Draw the SVG image to canvas at high resolution
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Fill the ENTIRE canvas with white background first
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw the SVG image at full size
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to PNG
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      
      // Mark export as complete
      isExportComplete = true;
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setExportProgress(100);
      
      // Show completion briefly
      toast.loading("Finalizing export...", {
        id: toastId,
        description: (
          <div className="w-full mt-2 space-y-1">
            <Progress value={100} className="h-2" />
            <p className="text-xs text-muted-foreground">100%</p>
          </div>
        ),
      });

      // Small delay to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 200));

      const link = document.createElement("a");
      link.download = `er-diagram-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      // Restore the original viewport
      setViewport(currentViewport);

      toast.success("Exported as ultra-high quality PNG (5x resolution)", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    } catch (error) {
      // Restore viewport even on error
      setViewport(currentViewport);
      toast.error("Failed to export diagram", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting]);

  const handleExportSVG = useCallback(async () => {
    if (!reactFlowWrapper.current || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);

    // Show loading toast with progress bar
    const toastId = toast.loading("Preparing export...", {
      description: (
        <div className="w-full mt-2">
          <Progress value={0} className="h-2" />
        </div>
      ),
    });

    try {
      // Find the ReactFlow viewport or use the wrapper as fallback
      const reactFlowViewport = reactFlowWrapper.current.querySelector('.react-flow__viewport') as HTMLElement;
      const targetElement = reactFlowViewport || reactFlowWrapper.current;
      
      if (!targetElement) {
        toast.error("Could not find diagram element", { id: toastId });
        setIsExporting(false);
        return;
      }

      // Start progress animation immediately and keep it running
      let currentProgress = 0;
      let progressInterval: NodeJS.Timeout | null = null;
      let isExportComplete = false;
      
      // Function to update progress
      const updateProgress = () => {
        if (!isExportComplete && currentProgress < 95) {
          // Variable speed: faster at start, slower near end
          let increment: number;
          if (currentProgress < 30) {
            increment = 4 + Math.random() * 3; // Fast start
          } else if (currentProgress < 70) {
            increment = 2 + Math.random() * 2; // Medium speed
          } else {
            increment = 0.5 + Math.random() * 1; // Slow near end
          }
          currentProgress = Math.min(currentProgress + increment, 95);
          setExportProgress(currentProgress);
          toast.loading("Generating vector image...", {
            id: toastId,
            description: (
              <div className="w-full mt-2 space-y-1">
                <Progress value={currentProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">{Math.round(currentProgress)}%</p>
              </div>
            ),
          });
        }
      };

      // Start progress animation immediately
      progressInterval = setInterval(updateProgress, 150);

      // Small delay to ensure progress bar is visible before starting export
      await new Promise(resolve => setTimeout(resolve, 200));

      // SVG is vectorized, so it scales perfectly at any zoom level
      const dataUrl = await toSvg(targetElement, {
        backgroundColor: "white",
        quality: 1.0,
        filter: (node) => {
          // Exclude controls and other UI elements
          if (node.classList?.contains("react-flow__controls")) return false;
          if (node.classList?.contains("react-flow__minimap")) return false;
          if (node.classList?.contains("react-flow__panel")) return false;
          // Include background for better visual context
          if (node.classList?.contains("react-flow__background")) return true;
          return true;
        },
      });

      // Mark export as complete and finish progress
      isExportComplete = true;
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setExportProgress(100);
      
      // Show completion briefly
      toast.loading("Finalizing export...", {
        id: toastId,
        description: (
          <div className="w-full mt-2 space-y-1">
            <Progress value={100} className="h-2" />
            <p className="text-xs text-muted-foreground">100%</p>
          </div>
        ),
      });

      // Small delay to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 300));

      const link = document.createElement("a");
      link.download = `er-diagram-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
      
      toast.success("Exported as SVG (vectorized, perfect for zooming!)", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    } catch (error) {
      toast.error("Failed to export diagram", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting]);

  // Export from fullscreen view
  const handleExportFullscreenPNG = useCallback(async () => {
    if (!fullscreenDiagramRef.current || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);

    const toastId = toast.loading("Preparing export...", {
      description: (
        <div className="w-full mt-2">
          <Progress value={0} className="h-2" />
        </div>
      ),
    });

    try {
      // Trigger fit view in fullscreen
      setFullscreenFitTrigger(prev => prev + 1);

      // Wait for fit to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const reactFlowViewport = fullscreenDiagramRef.current.querySelector('.react-flow__viewport') as HTMLElement;
      const targetElement = reactFlowViewport || fullscreenDiagramRef.current;

      if (!targetElement) {
        toast.error("Could not find diagram element", { id: toastId });
        setIsExporting(false);
        return;
      }

      let currentProgress = 0;
      let progressInterval: NodeJS.Timeout | null = null;
      let isExportComplete = false;

      const updateProgress = () => {
        if (!isExportComplete && currentProgress < 95) {
          let increment: number;
          if (currentProgress < 30) {
            increment = 4 + Math.random() * 3;
          } else if (currentProgress < 70) {
            increment = 2 + Math.random() * 2;
          } else {
            increment = 0.5 + Math.random() * 1;
          }
          currentProgress = Math.min(currentProgress + increment, 95);
          setExportProgress(currentProgress);
          toast.loading("Generating ultra-high quality image...", {
            id: toastId,
            description: (
              <div className="w-full mt-2 space-y-1">
                <Progress value={currentProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">{Math.round(currentProgress)}%</p>
              </div>
            ),
          });
        }
      };

      progressInterval = setInterval(updateProgress, 150);
      await new Promise(resolve => setTimeout(resolve, 200));

      // Use SVG export method for consistent full diagram capture
      const svgDataUrl = await toSvg(targetElement, {
        backgroundColor: "white",
        quality: 1.0,
        filter: (node) => {
          if (node.classList?.contains("react-flow__controls")) return false;
          if (node.classList?.contains("react-flow__minimap")) return false;
          if (node.classList?.contains("react-flow__panel")) return false;
          if (node.classList?.contains("react-flow__background")) return true;
          return true;
        },
      });

      // Parse SVG to get actual dimensions
      let svgText = '';
      if (svgDataUrl.includes('base64')) {
        const base64Data = svgDataUrl.split(',')[1];
        svgText = atob(base64Data);
      } else {
        svgText = decodeURIComponent(svgDataUrl.split(',')[1] || '');
      }

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;

      let svgWidth = parseFloat(svgElement.getAttribute('width') || '0');
      let svgHeight = parseFloat(svgElement.getAttribute('height') || '0');

      if (!svgWidth || !svgHeight || svgWidth === 0 || svgHeight === 0) {
        const viewBox = svgElement.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(/\s+|,/).filter(p => p).map(parseFloat);
          if (parts.length >= 4) {
            svgWidth = parts[2];
            svgHeight = parts[3];
          }
        }
      }

      if (!svgWidth || !svgHeight || svgWidth === 0 || svgHeight === 0) {
        const viewportRect = reactFlowViewport.getBoundingClientRect();
        svgWidth = viewportRect.width || 2000;
        svgHeight = viewportRect.height || 2000;
      }

      const pixelRatio = 6; // Maximum quality for fullscreen export

      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = svgDataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = svgWidth * pixelRatio;
      canvas.height = svgHeight * pixelRatio;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/png', 1.0);

      isExportComplete = true;
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setExportProgress(100);
      
      toast.loading("Finalizing export...", {
        id: toastId,
        description: (
          <div className="w-full mt-2 space-y-1">
            <Progress value={100} className="h-2" />
            <p className="text-xs text-muted-foreground">100%</p>
          </div>
        ),
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      const link = document.createElement("a");
      link.download = `er-diagram-fullscreen-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success("Exported as ultra-high quality PNG (4x resolution)", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    } catch (error) {
      toast.error("Failed to export diagram", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting]);

  const handleExportFullscreenSVG = useCallback(async () => {
    if (!fullscreenDiagramRef.current || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);

    const toastId = toast.loading("Preparing export...", {
      description: (
        <div className="w-full mt-2">
          <Progress value={0} className="h-2" />
        </div>
      ),
    });

    try {
      const reactFlowViewport = fullscreenDiagramRef.current.querySelector('.react-flow__viewport') as HTMLElement;
      const targetElement = reactFlowViewport || fullscreenDiagramRef.current;
      
      if (!targetElement) {
        toast.error("Could not find diagram element", { id: toastId });
        setIsExporting(false);
        return;
      }

      let currentProgress = 0;
      let progressInterval: NodeJS.Timeout | null = null;
      let isExportComplete = false;
      
      const updateProgress = () => {
        if (!isExportComplete && currentProgress < 95) {
          let increment: number;
          if (currentProgress < 30) {
            increment = 4 + Math.random() * 3;
          } else if (currentProgress < 70) {
            increment = 2 + Math.random() * 2;
          } else {
            increment = 0.5 + Math.random() * 1;
          }
          currentProgress = Math.min(currentProgress + increment, 95);
          setExportProgress(currentProgress);
          toast.loading("Generating vector image...", {
            id: toastId,
            description: (
              <div className="w-full mt-2 space-y-1">
                <Progress value={currentProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">{Math.round(currentProgress)}%</p>
              </div>
            ),
          });
        }
      };

      progressInterval = setInterval(updateProgress, 150);
      await new Promise(resolve => setTimeout(resolve, 200));

      const dataUrl = await toSvg(targetElement, {
        backgroundColor: "white",
        quality: 1.0,
        filter: (node) => {
          if (node.classList?.contains("react-flow__controls")) return false;
          if (node.classList?.contains("react-flow__minimap")) return false;
          if (node.classList?.contains("react-flow__panel")) return false;
          if (node.classList?.contains("react-flow__background")) return true;
          return true;
        },
      });

      isExportComplete = true;
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setExportProgress(100);
      
      toast.loading("Finalizing export...", {
        id: toastId,
        description: (
          <div className="w-full mt-2 space-y-1">
            <Progress value={100} className="h-2" />
            <p className="text-xs text-muted-foreground">100%</p>
          </div>
        ),
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      const link = document.createElement("a");
      link.download = `er-diagram-fullscreen-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
      
      toast.success("Exported as SVG (vectorized, perfect for zooming!)", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    } catch (error) {
      toast.error("Failed to export diagram", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting]);

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

  // Use stable node types - expanded state is passed through node data
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Keyboard shortcut for search (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl+K (Windows/Linux) or Cmd+K (Mac) is pressed
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Only focus if search input exists and we have nodes
        if (searchInputRef.current && nodes.length > 0) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
      // Allow Escape to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        setClickedNode(null);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes.length]);


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
            
            {/* Search input */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search tables... (Ctrl+K)"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  // Clear selection when search is cleared
                  if (!value.trim()) {
                    setClickedNode(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch(searchQuery);
                  } else if (e.key === "Escape") {
                    setSearchQuery("");
                    setClickedNode(null);
                    searchInputRef.current?.blur();
                  }
                }}
                className="pl-9 pr-8 h-9"
                disabled={nodes.length === 0}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setClickedNode(null);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
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
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={async () => {
                const newExpandedState = !nodesExpanded;
                setNodesExpanded(newExpandedState);
                
                // First, update all nodes with the new expanded state
                const updatedNodes = nodes.map((node) => ({
                  ...node,
                  data: {
                    ...node.data,
                    expanded: newExpandedState,
                  },
                }));
                
                // Only reapply layout if one was explicitly applied (not just the default)
                // This prevents resetting to grid when user has manually positioned nodes
                if (updatedNodes.length > 0 && hasExplicitLayout && currentLayout) {
                  try {
                    const layoutedNodes = await applyLayout(currentLayout, updatedNodes, edges, newExpandedState);
                    setNodes(layoutedNodes);
                    
                    setTimeout(() => {
                      fitView({ duration: 400, padding: 0.1 });
                    }, 100);
                  } catch (error) {
                    // If layout fails, still update nodes with expanded state
                    setNodes(updatedNodes);
                  }
                } else {
                  // If no explicit layout was applied, just update nodes with expanded state
                  // This preserves manual positioning or default layout
                  setNodes(updatedNodes);
                }
                
                toast.success(newExpandedState ? "Expanded all table nodes - all columns visible" : "Collapsed table nodes");
              }}
              disabled={nodes.length === 0}
            >
              <Maximize2 className="w-4 h-4" />
              {nodesExpanded ? "Collapse" : "Expand All"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setIsFullscreen(true)}
              disabled={nodes.length === 0}
            >
              <Maximize className="w-4 h-4" />
              Fullscreen
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPNG} disabled={isExporting}>
                  <div className="flex flex-col w-full">
                    <div className="flex items-center gap-2">
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Export as PNG</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Ultra-high resolution (5x)</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportSVG} disabled={isExporting}>
                  <div className="flex flex-col w-full">
                    <div className="flex items-center gap-2">
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span>Export as SVG</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Vector format (perfect for zooming)</span>
                  </div>
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
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={memoizedNodeTypes}
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

      {/* Fullscreen Diagram Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0 pr-12">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                ER Diagram - Full View
              </DialogTitle>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" disabled={isExporting}>
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportFullscreenPNG} disabled={isExporting}>
                      <div className="flex flex-col">
                        <span>Export as PNG</span>
                        <span className="text-xs text-muted-foreground">Ultra-high resolution (4x)</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportFullscreenSVG} disabled={isExporting}>
                      <div className="flex flex-col">
                        <span>Export as SVG</span>
                        <span className="text-xs text-muted-foreground">Vector format (perfect for zooming)</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 relative" ref={fullscreenDiagramRef}>
            <ReactFlowProvider>
              <FullscreenDiagramView
                nodes={nodes}
                edges={visibleEdges}
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                expanded={nodesExpanded}
                fitTrigger={fullscreenFitTrigger}
              />
            </ReactFlowProvider>
          </div>
        </DialogContent>
      </Dialog>
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

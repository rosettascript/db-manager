import { useMemo, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import type { ChartDataResponse, ChartType } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";

interface ChartViewerProps {
  chartData: ChartDataResponse;
  height?: number;
}

// Terminal/Hacker theme colors matching the app theme
// Matrix green primary, amber accent, cyan info, and variations
const COLORS = [
  'hsl(120, 100%, 50%)',  // Matrix green primary
  'hsl(45, 100%, 50%)',   // Amber accent
  'hsl(180, 100%, 50%)',  // Cyan info
  'hsl(120, 100%, 70%)',  // Bright green
  'hsl(45, 100%, 65%)',   // Bright amber
  'hsl(180, 100%, 65%)',  // Bright cyan
  'hsl(120, 70%, 60%)',   // Muted green
  'hsl(45, 70%, 55%)',    // Muted amber
];

export const ChartViewer = ({ chartData, height = 400 }: ChartViewerProps) => {
  const { chartType, data, metadata, error } = chartData;
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Transform data for different chart types
  const transformedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((point) => ({
      name: String(point.x || point.label || ''),
      ...(typeof point.y === 'number'
        ? { value: point.y }
        : Array.isArray(point.y)
        ? point.y.reduce((acc, val, idx) => {
            const colName = metadata?.yAxisColumns?.[idx] || `Series ${idx + 1}`;
            acc[colName] = val;
            return acc;
          }, {} as Record<string, number>)
        : {}),
    }));
  }, [data, metadata]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>No data available for chart</p>
        </CardContent>
      </Card>
    );
  }

  const yAxisColumns = metadata?.yAxisColumns || [];
  const isMultiSeries = yAxisColumns.length > 1;

  // Export chart as PNG
  const handleExportPNG = async () => {
    if (!chartContainerRef.current) return;

    try {
      // Use html2canvas-like approach or canvas API
      // For now, we'll use a simple approach with canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error("Failed to export chart");
        return;
      }

      // Get SVG from the chart container
      const svgElement = chartContainerRef.current.querySelector('svg');
      if (!svgElement) {
        toast.error("Chart element not found");
        return;
      }

      // Convert SVG to PNG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chart-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Chart exported as PNG");
          }
        });
        URL.revokeObjectURL(svgUrl);
      };
      img.src = svgUrl;
    } catch (error: any) {
      toast.error("Failed to export chart", {
        description: error.message || "Unknown error",
      });
    }
  };

  // Export chart as SVG
  const handleExportSVG = () => {
    if (!chartContainerRef.current) return;

    try {
      const svgElement = chartContainerRef.current.querySelector('svg');
      if (!svgElement) {
        toast.error("Chart element not found");
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chart-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Chart exported as SVG");
    } catch (error: any) {
      toast.error("Failed to export chart", {
        description: error.message || "Unknown error",
      });
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={transformedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
              />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0',
                  color: 'hsl(var(--foreground))',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                  boxShadow: '0 0 10px hsl(var(--primary) / 0.2)',
                }}
                labelStyle={{ color: 'hsl(var(--primary))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'transparent', stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeOpacity: 0.5 }}
              />
              {isMultiSeries ? (
                <Legend 
                  wrapperStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                  iconType="square"
                />
              ) : null}
              {yAxisColumns.map((col, idx) => (
                <Bar
                  key={col}
                  dataKey={col}
                  fill={COLORS[idx % COLORS.length]}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={1}
                  radius={[0, 0, 0, 0]}
                  style={{ filter: `drop-shadow(0 0 3px ${COLORS[idx % COLORS.length]})` }}
                />
              ))}
              {!isMultiSeries && (
                <Bar 
                  dataKey="value" 
                  fill={COLORS[0]} 
                  stroke={COLORS[0]}
                  strokeWidth={1}
                  radius={[0, 0, 0, 0]}
                  style={{ filter: `drop-shadow(0 0 3px ${COLORS[0]})` }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={transformedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))"
                strokeOpacity={0.3}
              />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                stroke="hsl(var(--foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0',
                  color: 'hsl(var(--foreground))',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                  boxShadow: '0 0 10px hsl(var(--primary) / 0.2)',
                }}
                labelStyle={{ color: 'hsl(var(--primary))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={{ fill: 'transparent', stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeOpacity: 0.5 }}
              />
              {isMultiSeries ? (
                <Legend 
                  wrapperStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                  iconType="line"
                />
              ) : null}
              {yAxisColumns.map((col, idx) => (
                <Line
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={3}
                  dot={{ fill: COLORS[idx % COLORS.length], r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                  activeDot={{ r: 6, fill: COLORS[idx % COLORS.length] }}
                  style={{ filter: `drop-shadow(0 0 4px ${COLORS[idx % COLORS.length]})` }}
                />
              ))}
              {!isMultiSeries && (
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={COLORS[0]} 
                  strokeWidth={3}
                  dot={{ fill: COLORS[0], r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                  activeDot={{ r: 6, fill: COLORS[0] }}
                  style={{ filter: `drop-shadow(0 0 4px ${COLORS[0]})` }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={transformedData}
                dataKey={isMultiSeries ? yAxisColumns[0] : "value"}
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={Math.min(height / 3, 150)}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.3))' }}
              >
                {transformedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                    style={{ filter: `drop-shadow(0 0 3px ${COLORS[index % COLORS.length]})` }}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0',
                  color: 'hsl(var(--foreground))',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                  boxShadow: '0 0 10px hsl(var(--primary) / 0.2)',
                }}
                labelStyle={{ color: 'hsl(var(--primary))' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
                cursor={false}
              />
              <Legend 
                wrapperStyle={{ color: 'hsl(var(--foreground))', fontFamily: 'JetBrains Mono', fontSize: '12px' }}
                iconType="square"
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            Chart type "{chartType}" not yet implemented
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">
            {metadata?.xAxisColumn && metadata.yAxisColumns
              ? `${metadata.xAxisColumn} vs ${metadata.yAxisColumns.join(', ')}`
              : 'Chart'}
            {metadata?.aggregation && (
              <span className="ml-2 text-xs text-muted-foreground">
                ({metadata.aggregation})
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSVG}
              className="gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              SVG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPNG}
              className="gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              PNG
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent ref={chartContainerRef} className="terminal-chart-container">
        {renderChart()}
      </CardContent>
    </Card>
  );
};



import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { ChartOptions, ChartType, AggregationFunction, Column } from "@/lib/api/types";
import { BarChart3, Loader2 } from "lucide-react";

interface ChartBuilderProps {
  columns: Column[];
  availableColumns?: string[]; // For query results
  onGenerateChart: (options: ChartOptions) => void;
  isLoading?: boolean;
}

export const ChartBuilder = ({
  columns,
  availableColumns,
  onGenerateChart,
  isLoading = false,
}: ChartBuilderProps) => {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [xAxisColumn, setXAxisColumn] = useState<string>("");
  const [yAxisColumns, setYAxisColumns] = useState<string[]>([]);
  const [aggregation, setAggregation] = useState<AggregationFunction>("COUNT");
  const [limit, setLimit] = useState<number>(100);

  // Get available column names
  const columnNames = useMemo(() => {
    if (availableColumns && availableColumns.length > 0) {
      return availableColumns;
    }
    return columns.map((col) => col.name);
  }, [columns, availableColumns]);

  // Auto-detect numeric columns for Y-axis
  const numericColumns = useMemo(() => {
    return columnNames.filter((name) => {
      const col = columns.find((c) => c.name === name);
      if (!col) return false;
      const type = col.type.toLowerCase();
      return (
        type.includes('int') ||
        type.includes('decimal') ||
        type.includes('numeric') ||
        type.includes('float') ||
        type.includes('double') ||
        type.includes('real') ||
        type.includes('serial') ||
        type.includes('money')
      );
    });
  }, [columns, columnNames]);

  // Auto-detect categorical columns for X-axis
  const categoricalColumns = useMemo(() => {
    return columnNames.filter((name) => {
      const col = columns.find((c) => c.name === name);
      if (!col) return true; // Include if column info not available
      const type = col.type.toLowerCase();
      return (
        type.includes('varchar') ||
        type.includes('text') ||
        type.includes('char') ||
        type.includes('date') ||
        type.includes('timestamp') ||
        type.includes('enum') ||
        type.includes('bool')
      );
    });
  }, [columns, columnNames]);

  const handleGenerate = () => {
    if (!xAxisColumn || yAxisColumns.length === 0) {
      return;
    }

    onGenerateChart({
      chartType,
      xAxisColumn,
      yAxisColumns,
      aggregation: chartType === 'pie' ? undefined : aggregation,
      limit,
    });
  };

  const handleYAxisToggle = (columnName: string, checked: boolean) => {
    if (checked) {
      setYAxisColumns([...yAxisColumns, columnName]);
    } else {
      setYAxisColumns(yAxisColumns.filter((col) => col !== columnName));
    }
  };

  const canGenerate = xAxisColumn && yAxisColumns.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Chart Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Chart Type</Label>
            <Select value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="scatter">Scatter Plot</SelectItem>
                <SelectItem value="histogram">Histogram</SelectItem>
                <SelectItem value="timeseries">Time Series</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>X-Axis Column</Label>
            <Select value={xAxisColumn} onValueChange={setXAxisColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columnNames.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {chartType !== 'pie' && (
          <div className="space-y-2">
            <Label>Aggregation</Label>
            <Select
              value={aggregation}
              onValueChange={(value) => setAggregation(value as AggregationFunction)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COUNT">Count</SelectItem>
                <SelectItem value="SUM">Sum</SelectItem>
                <SelectItem value="AVG">Average</SelectItem>
                <SelectItem value="MIN">Minimum</SelectItem>
                <SelectItem value="MAX">Maximum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Y-Axis Columns</Label>
          <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
            {numericColumns.length > 0 ? (
              numericColumns.map((col) => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox
                    id={`y-axis-${col}`}
                    checked={yAxisColumns.includes(col)}
                    onCheckedChange={(checked) =>
                      handleYAxisToggle(col, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`y-axis-${col}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {col}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No numeric columns found. Select any column:
              </p>
            )}
            {numericColumns.length === 0 &&
              columnNames.map((col) => (
                <div key={col} className="flex items-center space-x-2">
                  <Checkbox
                    id={`y-axis-${col}`}
                    checked={yAxisColumns.includes(col)}
                    onCheckedChange={(checked) =>
                      handleYAxisToggle(col, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`y-axis-${col}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {col}
                  </label>
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Limit (max data points)</Label>
          <input
            type="number"
            min={1}
            max={10000}
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Chart...
            </>
          ) : (
            "Generate Chart"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};











import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit } from "lucide-react";
import type { Column, ColumnUpdate } from "@/lib/api/types";

interface BulkUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (updates: ColumnUpdate[]) => void;
  rowCount: number;
  columns: Column[];
  selectedRowsData?: Record<string, any>[]; // Array of selected row data
  isUpdating?: boolean;
}

export const BulkUpdateDialog = ({
  open,
  onOpenChange,
  onConfirm,
  rowCount,
  columns,
  selectedRowsData = [],
  isUpdating = false,
}: BulkUpdateDialogProps) => {
  const [updates, setUpdates] = useState<ColumnUpdate[]>([]);

  // Filter out primary key columns (can't update them)
  const updatableColumns = columns.filter((col) => !col.isPrimaryKey);

  const handleAddUpdate = () => {
    if (updatableColumns.length > 0) {
      setUpdates([...updates, { column: updatableColumns[0].name, value: "" }]);
    }
  };

  const handleRemoveUpdate = (index: number) => {
    setUpdates(updates.filter((_, i) => i !== index));
  };

  const handleUpdateChange = (index: number, field: "column" | "value", value: string) => {
    const newUpdates = [...updates];
    newUpdates[index] = { ...newUpdates[index], [field]: value };
    setUpdates(newUpdates);
  };

  const handleConfirm = () => {
    // Filter out empty updates
    const validUpdates = updates.filter((u) => u.column && u.value !== "");
    if (validUpdates.length > 0) {
      onConfirm(validUpdates);
    }
  };

  const handleClose = () => {
    setUpdates([]);
    onOpenChange(false);
  };

  // Get column type for input type hint
  const getInputType = (columnName: string): string => {
    const column = columns.find((c) => c.name === columnName);
    if (!column) return "text";
    
    const type = column.type.toLowerCase();
    if (type.includes("int") || type.includes("numeric") || type.includes("decimal")) {
      return "number";
    }
    if (type.includes("bool")) {
      return "text"; // We'll use a select for boolean
    }
    if (type.includes("date") || type.includes("time")) {
      return "text"; // Date/time input
    }
    return "text";
  };

  const isBooleanColumn = (columnName: string): boolean => {
    const column = columns.find((c) => c.name === columnName);
    return column?.type.toLowerCase().includes("bool") || false;
  };

  // Get current values for a column from selected rows
  const getCurrentValues = (columnName: string): string[] => {
    if (!selectedRowsData || selectedRowsData.length === 0) return [];
    
    const values = selectedRowsData
      .map(row => {
        const value = row[columnName];
        return value === null || value === undefined ? 'NULL' : String(value);
      })
      .filter((v, i, arr) => arr.indexOf(v) === i); // Get unique values
    
    return values;
  };
  
  // When column is selected, pre-fill with current value if all rows have the same value
  const handleColumnSelect = (index: number, columnName: string) => {
    const newUpdates = [...updates];
    const currentValues = getCurrentValues(columnName);
    
    // If all selected rows have the same value, pre-fill it
    if (currentValues.length === 1 && currentValues[0] !== 'NULL') {
      newUpdates[index] = { column: columnName, value: currentValues[0] };
    } else {
      newUpdates[index] = { column: columnName, value: "" };
    }
    
    setUpdates(newUpdates);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Edit className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Bulk Update {rowCount} row{rowCount !== 1 ? 's' : ''}</DialogTitle>
              <DialogDescription className="mt-1">
                Update columns for {rowCount === 1 ? "this row" : `these ${rowCount} rows`}. 
                Select columns and enter new values.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {updates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No columns selected for update</p>
              <p className="text-sm">Click "Add Column" to start updating</p>
            </div>
          ) : (
            updates.map((update, index) => {
              const column = columns.find((c) => c.name === update.column);
              const isBool = isBooleanColumn(update.column);
              
              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Column</Label>
                      <Select
                        value={update.column}
                        onValueChange={(value) => handleColumnSelect(index, value)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {updatableColumns.map((col) => (
                            <SelectItem key={col.name} value={col.name}>
                              {col.name} <span className="text-muted-foreground ml-2">({col.type})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Current Value</Label>
                      <div className="px-3 py-2 text-sm bg-muted rounded-md border min-h-[2.5rem] flex items-center">
                        {update.column ? (
                          (() => {
                            const currentValues = getCurrentValues(update.column);
                            if (currentValues.length === 0) {
                              return <span className="text-muted-foreground">No data</span>;
                            } else if (currentValues.length === 1) {
                              return <span className="font-mono truncate" title={currentValues[0]}>{currentValues[0]}</span>;
                            } else {
                              return (
                                <span className="text-muted-foreground" title={currentValues.join(", ")}>
                                  {currentValues.length} different values
                                </span>
                              );
                            }
                          })()
                        ) : (
                          <span className="text-muted-foreground">Select a column</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">New Value</Label>
                      <div className="flex flex-col gap-1">
                        {isBool ? (
                          <Select
                            value={update.value}
                            onValueChange={(value) => handleUpdateChange(index, "value", value)}
                            disabled={isUpdating}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={getInputType(update.column)}
                            value={update.value}
                            onChange={(e) => handleUpdateChange(index, "value", e.target.value)}
                            placeholder={column?.nullable ? "Enter value or leave empty for NULL" : "Enter value"}
                            disabled={isUpdating}
                          />
                        )}
                        {column?.nullable && (
                          <p className="text-xs text-muted-foreground">Leave empty to set NULL</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-end pb-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUpdate(index)}
                        disabled={isUpdating}
                        className="h-10 w-10"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddUpdate}
            disabled={isUpdating || updatableColumns.length === 0}
          >
            Add Column
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isUpdating || updates.length === 0 || updates.every((u) => !u.column || u.value === "")}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${rowCount} row${rowCount !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


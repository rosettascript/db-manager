import { useState, useEffect, useMemo } from "react";
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
import { Loader2, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Column } from "@/lib/api/types";

interface AddRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: Record<string, any>) => Promise<void>;
  columns: Column[];
  isInserting?: boolean;
}

export const AddRowDialog = ({
  open,
  onOpenChange,
  onConfirm,
  columns,
  isInserting = false,
}: AddRowDialogProps) => {
  // Filter out primary key columns (they'll be auto-generated or handled by the backend)
  // Memoize to prevent infinite loops in useEffect
  const insertableColumns = useMemo(
    () => columns.filter((col) => !col.isPrimaryKey),
    [columns]
  );
  
  // Initialize form data with empty values
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});


  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      const initialData: Record<string, string> = {};
      insertableColumns.forEach((col) => {
        initialData[col.name] = "";
      });
      
      setFormData(initialData);
      setErrors({});
    } else {
      setFormData({});
      setErrors({});
    }
  }, [open, insertableColumns]);

  // Get column type for input type hint
  const getInputType = (column: Column): string => {
    const type = column.type.toLowerCase();
    if (type.includes("int") || type.includes("numeric") || type.includes("decimal")) {
      return "number";
    }
    if (type.includes("date") && !type.includes("time")) {
      return "date";
    }
    if (type.includes("time")) {
      return "datetime-local";
    }
    return "text";
  };

  const isBooleanColumn = (column: Column): boolean => {
    return column.type.toLowerCase().includes("bool");
  };

  // Convert value based on column type
  const convertValue = (column: Column, value: string): any => {
    if (!value || value.trim() === "") {
      if (column.nullable) {
        return null;
      }
      return value;
    }

    const type = column.type.toLowerCase();
    
    // Handle numeric types
    if (type.includes("int") || type.includes("numeric") || type.includes("decimal") || type.includes("real") || type.includes("double") || type.includes("float")) {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }

    // Handle boolean types
    if (type.includes("bool")) {
      const lower = value.toLowerCase();
      return lower === "true" || lower === "1" || lower === "yes" || lower === "on";
    }

    // Default: return as string
    return value;
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    insertableColumns.forEach((col) => {
      const value = formData[col.name] || "";
      
      // Check required fields
      if (!col.nullable && (!value || value.trim() === "")) {
        newErrors[col.name] = "This field is required";
        return;
      }

      // Validate numeric types
      if (value && value.trim() !== "") {
        const type = col.type.toLowerCase();
        if (type.includes("int") || type.includes("numeric") || type.includes("decimal")) {
          if (isNaN(Number(value))) {
            newErrors[col.name] = "Invalid number";
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (columnName: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [columnName]: value };
      return newData;
    });
    // Clear error for this field
    if (errors[columnName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[columnName];
        return newErrors;
      });
    }
  };

  const handleConfirm = async () => {
    if (!validate()) {
      return;
    }

    // Convert form data to proper types
    const data: Record<string, any> = {};
    insertableColumns.forEach((col) => {
      const value = formData[col.name] || "";
      data[col.name] = convertValue(col, value);
    });

    await onConfirm(data);
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Row
          </DialogTitle>
          <DialogDescription>
            Fill in the fields below to add a new row. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {insertableColumns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No columns available for insertion.</p>
                <p className="text-sm mt-2">Primary key columns are automatically handled.</p>
              </div>
            ) : (
              insertableColumns.map((column) => {
                const value = formData[column.name] || "";
                const error = errors[column.name];
                const hasDefault = !!column.defaultValue;

                return (
                  <div key={column.name} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={column.name} className="text-sm font-medium">
                        {column.name}
                      </Label>
                      {!column.nullable && !hasDefault && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {hasDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default: {column.defaultValue}
                        </Badge>
                      )}
                      {column.isForeignKey && (
                        <Badge variant="outline" className="text-xs">
                          FK
                        </Badge>
                      )}
                    </div>
                    
                    {isBooleanColumn(column) ? (
                      <Select
                        value={value || "false"}
                        onValueChange={(val) => handleFieldChange(column.name, val)}
                      >
                        <SelectTrigger id={column.name} className={error ? "border-destructive" : ""}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={column.name}
                        type={getInputType(column)}
                        value={value}
                        onChange={(e) => {
                          handleFieldChange(column.name, e.target.value);
                        }}
                        placeholder={
                          column.nullable
                            ? "Leave empty for NULL"
                            : hasDefault
                            ? `Leave empty for default: ${column.defaultValue}`
                            : "Enter value"
                        }
                        className={error ? "border-destructive" : ""}
                      />
                    )}
                    
                    {error && (
                      <p className="text-xs text-destructive">{error}</p>
                    )}
                    
                    {column.type && (
                      <p className="text-xs text-muted-foreground">
                        Type: {column.type}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isInserting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isInserting || insertableColumns.length === 0}
          >
            {isInserting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Inserting...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Insert Row
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


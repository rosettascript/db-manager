import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Column } from "@/lib/api/types";

interface EditableCellProps {
  value: any;
  column: Column;
  isEditing: boolean;
  isSaving?: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (newValue: any) => Promise<void>;
  className?: string;
}

export const EditableCell = ({
  value,
  column,
  isEditing,
  isSaving = false,
  onStartEdit,
  onCancelEdit,
  onSave,
  className,
}: EditableCellProps) => {
  const [editValue, setEditValue] = useState<string>(value !== null && value !== undefined ? String(value) : "");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize edit value when starting to edit
  useEffect(() => {
    if (isEditing) {
      setEditValue(value !== null && value !== undefined ? String(value) : "");
      setError(null);
      // Focus input after a brief delay to ensure it's rendered
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isEditing, value]);

  // Convert value based on column type
  const convertValue = (rawValue: string): any => {
    if (!rawValue || rawValue.trim() === "") {
      if (column.nullable) {
        return null;
      }
      return rawValue;
    }

    const type = column.type.toLowerCase();
    
    // Handle numeric types
    if (type.includes("int") || type.includes("numeric") || type.includes("decimal") || type.includes("real") || type.includes("double") || type.includes("float")) {
      const num = Number(rawValue);
      return isNaN(num) ? rawValue : num;
    }

    // Handle boolean types
    if (type.includes("bool")) {
      const lower = rawValue.toLowerCase();
      return lower === "true" || lower === "1" || lower === "yes" || lower === "on";
    }

    // Handle date/time types
    if (type.includes("date") || type.includes("time")) {
      return rawValue; // Return as string, let backend handle conversion
    }

    // Default: return as string
    return rawValue;
  };

  // Validate value
  const validate = (val: string): string | null => {
    if (!column.nullable && (!val || val.trim() === "")) {
      return "This field is required";
    }

    const type = column.type.toLowerCase();
    
    // Validate numeric types
    if (type.includes("int") || type.includes("numeric") || type.includes("decimal")) {
      if (val && val.trim() !== "" && isNaN(Number(val))) {
        return "Invalid number";
      }
    }

    // Validate boolean types
    if (type.includes("bool")) {
      const lower = val.toLowerCase();
      const valid = ["true", "false", "1", "0", "yes", "no", "on", "off", ""].includes(lower);
      if (val && !valid) {
        return "Invalid boolean value";
      }
    }

    return null;
  };

  const handleSave = async () => {
    const validationError = validate(editValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const convertedValue = convertValue(editValue);
    await onSave(convertedValue);
  };

  const handleCancel = () => {
    setEditValue(value !== null && value !== undefined ? String(value) : "");
    setError(null);
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        className={cn("truncate cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded transition-colors", className)}
        onClick={onStartEdit}
        title="Click to edit"
      >
        {value !== null && value !== undefined ? String(value) : (
          <span className="text-muted-foreground italic">NULL</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex-1 relative">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-7 text-sm",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          disabled={isSaving}
        />
        {error && (
          <p className="absolute -bottom-5 left-0 text-xs text-destructive whitespace-nowrap">
            {error}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleSave}
          disabled={isSaving}
          title="Save (Enter)"
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Check className="w-3 h-3 text-green-600" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleCancel}
          disabled={isSaving}
          title="Cancel (Esc)"
        >
          <X className="w-3 h-3 text-red-600" />
        </Button>
      </div>
    </div>
  );
};






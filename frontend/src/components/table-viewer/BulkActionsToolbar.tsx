import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Download, X } from "lucide-react";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onUpdate: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClearSelection: () => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export const BulkActionsToolbar = ({
  selectedCount,
  onUpdate,
  onDelete,
  onExport,
  onClearSelection,
  isUpdating = false,
  isDeleting = false,
}: BulkActionsToolbarProps) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-md">
      <Badge variant="secondary" className="font-medium">
        {selectedCount} selected
      </Badge>
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onUpdate}
          disabled={isUpdating || isDeleting}
          className="gap-2"
        >
          <Edit className="w-3.5 h-3.5" />
          Update
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={isUpdating || isDeleting}
          className="gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          Export
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={isUpdating || isDeleting}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isUpdating || isDeleting}
          className="gap-2"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
};










import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { cascade: boolean; confirmName: string }) => void;
  schema: string;
  table: string;
  dependencies?: {
    hasDependencies: boolean;
    dependentTables: Array<{ schema: string; table: string; constraint: string }>;
  };
  isDeleting?: boolean;
}

export const DeleteTableDialog = ({
  open,
  onOpenChange,
  onConfirm,
  schema,
  table,
  dependencies,
  isDeleting = false,
}: DeleteTableDialogProps) => {
  const [confirmName, setConfirmName] = useState("");
  const [cascade, setCascade] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmName("");
      setCascade(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (confirmName === table) {
      onConfirm({ cascade, confirmName });
    }
  };

  const isConfirmValid = confirmName === table;
  const hasDependencies = dependencies?.hasDependencies || false;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Table</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                This action cannot be undone. This will permanently delete the table{" "}
                <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                  {schema}.{table}
                </code>{" "}
                from the database.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {hasDependencies && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="font-semibold mb-1">This table has dependencies:</div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {dependencies?.dependentTables.map((dep, idx) => (
                    <li key={idx}>
                      {dep.schema}.{dep.table}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-xs">
                  Enable CASCADE to delete dependent objects as well.
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-name" className="text-sm font-medium">
              Type the table name to confirm: <code className="font-mono text-xs">{table}</code>
            </Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={table}
              disabled={isDeleting}
              className="font-mono"
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmValid) {
                  handleConfirm();
                }
              }}
            />
          </div>

          {hasDependencies && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cascade"
                checked={cascade}
                onCheckedChange={(checked) => setCascade(checked === true)}
                disabled={isDeleting}
              />
              <Label
                htmlFor="cascade"
                className="text-sm cursor-pointer"
              >
                CASCADE (delete dependent objects)
              </Label>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Table"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


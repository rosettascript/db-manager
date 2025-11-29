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

interface DeleteSchemaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { cascade: boolean; confirmName: string }) => void;
  schema: string;
  dependencies?: {
    hasDependencies: boolean;
    objects: Array<{ type: string; name: string }>;
    dependentSchemas: string[];
  };
  isDeleting?: boolean;
}

export const DeleteSchemaDialog = ({
  open,
  onOpenChange,
  onConfirm,
  schema,
  dependencies,
  isDeleting = false,
}: DeleteSchemaDialogProps) => {
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
    if (confirmName === schema) {
      onConfirm({ cascade, confirmName });
    }
  };

  const isConfirmValid = confirmName === schema;
  const hasDependencies = dependencies?.hasDependencies || false;
  const objectCount = dependencies?.objects.length || 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Schema</AlertDialogTitle>
              <AlertDialogDescription className="mt-1">
                <strong className="text-destructive">WARNING:</strong> This will permanently delete the schema{" "}
                <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                  {schema}
                </code>{" "}
                and all its contents from the database. This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {hasDependencies && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <div className="font-semibold mb-1">
                  This schema contains {objectCount} object{objectCount !== 1 ? 's' : ''}:
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs max-h-32 overflow-y-auto">
                  {dependencies?.objects.slice(0, 10).map((obj, idx) => (
                    <li key={idx}>
                      {obj.type}: {obj.name}
                    </li>
                  ))}
                  {objectCount > 10 && (
                    <li className="text-muted-foreground">... and {objectCount - 10} more</li>
                  )}
                </ul>
                {dependencies?.dependentSchemas.length > 0 && (
                  <div className="mt-2">
                    <div className="font-semibold">Dependent schemas:</div>
                    <div className="text-xs">{dependencies.dependentSchemas.join(', ')}</div>
                  </div>
                )}
                <div className="mt-2 text-xs">
                  Enable CASCADE to delete all objects in the schema.
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-name" className="text-sm font-medium">
              Type the schema name to confirm: <code className="font-mono text-xs">{schema}</code>
            </Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={schema}
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
                CASCADE (delete all objects in schema)
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
              "Delete Schema"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


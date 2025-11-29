import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Connection, CreateConnectionDto, UpdateConnectionDto } from "@/lib/api/types";
import { connectionsService } from "@/lib/api/services/connections.service";
import { toast } from "sonner";

interface ConnectionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  connection?: Connection | null;
  onSuccess?: () => void;
  children?: React.ReactNode;
}

export const ConnectionDialog = ({
  open: controlledOpen,
  onOpenChange,
  connection,
  onSuccess,
  children,
}: ConnectionDialogProps) => {
  const [open, setOpen] = useState(controlledOpen ?? false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const queryClient = useQueryClient();
  const isEditMode = !!connection;

  const [formData, setFormData] = useState({
    name: "",
    host: "localhost",
    port: "5432",
    database: "",
    username: "",
    password: "",
    sslMode: "prefer" as const,
  });

  // Update form data when connection prop changes (edit mode)
  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name,
        host: connection.host,
        port: connection.port.toString(),
        database: connection.database,
        username: connection.username,
        password: "", // Never pre-fill password
        sslMode: "prefer" as const, // Default, will need to get from backend if available
      });
    } else {
      // Reset form for new connection
      setFormData({
        name: "",
        host: "localhost",
        port: "5432",
        database: "",
        username: "",
        password: "",
        sslMode: "prefer" as const,
      });
    }
    setTestResult(null);
  }, [connection, open]);

  // Sync controlled open state
  useEffect(() => {
    if (controlledOpen !== undefined) {
      setOpen(controlledOpen);
    }
  }, [controlledOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      setTestResult(null);
      setTesting(false);
    }
  };

  // Test connection mutation (only works for existing connections)
  const testMutation = useMutation({
    mutationFn: (id: string) => connectionsService.test(id),
    onSuccess: (result) => {
      setTestResult(result.success ? "success" : "error");
      toast[result.success ? "success" : "error"](
        result.success
          ? `Connection successful! (${result.connectionTime}ms)`
          : result.message || "Connection failed. Please check your credentials."
      );
    },
    onError: (error: any) => {
      setTestResult("error");
      toast.error(error.message || "Connection test failed");
    },
  });

  // Create connection mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateConnectionDto) => connectionsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success(`Connection "${formData.name}" created successfully`);
      handleOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create connection");
    },
  });

  // Update connection mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConnectionDto }) =>
      connectionsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success(`Connection "${formData.name}" updated successfully`);
      handleOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update connection");
    },
  });

  const handleTest = async () => {
    if (!connection?.id) {
      toast.error("Please save the connection first before testing");
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    testMutation.mutate(connection.id, {
      onSettled: () => {
        setTesting(false);
      },
    });
  };

  const handleSave = () => {
    // Validation
    if (!formData.name || !formData.host || !formData.database || !formData.username) {
      toast.error("Please fill in all required fields");
      return;
    }

    const port = parseInt(formData.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      toast.error("Please enter a valid port number (1-65535)");
      return;
    }

    if (!isEditMode && !formData.password) {
      toast.error("Password is required for new connections");
      return;
    }

    if (isEditMode && connection) {
      // Update existing connection
      const updateData: UpdateConnectionDto = {
        name: formData.name,
        host: formData.host,
        port,
        database: formData.database,
        username: formData.username,
        sslMode: formData.sslMode,
      };

      // Only include password if it's been changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      updateMutation.mutate({ id: connection.id, data: updateData });
    } else {
      // Create new connection
      const createData: CreateConnectionDto = {
        name: formData.name,
        host: formData.host,
        port,
        database: formData.database,
        username: formData.username,
        password: formData.password,
        sslMode: formData.sslMode,
      };

      createMutation.mutate(createData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const canTest = isEditMode && connection?.id && !isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <>{children}</>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            {isEditMode ? "Edit Database Connection" : "New Database Connection"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your PostgreSQL database connection settings."
              : "Configure your PostgreSQL database connection. All fields are required except SSL mode."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Connection Name *</Label>
              <Input
                id="name"
                placeholder="Production Database"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="host">Host *</Label>
              <Input
                id="host"
                placeholder="localhost"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="port">Port *</Label>
              <Input
                id="port"
                placeholder="5432"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="database">Database Name *</Label>
              <Input
                id="database"
                placeholder="mydb"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="postgres"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="password">
                Password {isEditMode ? "(leave empty to keep current)" : "*"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={isEditMode ? "•••••••• (unchanged)" : "••••••••"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1.5"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="sslMode">SSL Mode</Label>
              <Select value={formData.sslMode} onValueChange={(value) => setFormData({ ...formData, sslMode: value })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disable">Disable</SelectItem>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="prefer">Prefer (default)</SelectItem>
                  <SelectItem value="require">Require</SelectItem>
                  <SelectItem value="verify-ca">Verify CA</SelectItem>
                  <SelectItem value="verify-full">Verify Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {testResult && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md ${
                testResult === "success"
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {testResult === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Connection successful</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {testMutation.error instanceof Error
                      ? testMutation.error.message
                      : "Connection failed"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!canTest || testing || testMutation.isPending}
          >
            {testing || testMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          {!canTest && isEditMode && (
            <p className="text-sm text-muted-foreground self-center">
              Save changes first to test connection
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Update Connection" : "Create Connection"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

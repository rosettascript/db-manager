import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { Database, Loader2, CheckCircle2, XCircle, Plus } from "lucide-react";
import { toast } from "sonner";

interface ConnectionDialogProps {
  children?: React.ReactNode;
}

export const ConnectionDialog = ({ children }: ConnectionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    host: "localhost",
    port: "5432",
    database: "",
    username: "",
    password: "",
    sslMode: "prefer",
  });

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const success = Math.random() > 0.3; // Mock success/failure
    setTestResult(success ? "success" : "error");
    setTesting(false);
    
    toast[success ? "success" : "error"](
      success ? "Connection successful!" : "Connection failed. Please check your credentials."
    );
  };

  const handleSave = () => {
    if (!formData.name || !formData.host || !formData.database || !formData.username) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    toast.success(`Connection "${formData.name}" saved successfully`);
    setOpen(false);
    
    // Reset form
    setFormData({
      name: "",
      host: "localhost",
      port: "5432",
      database: "",
      username: "",
      password: "",
      sslMode: "prefer",
    });
    setTestResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Connection
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            New Database Connection
          </DialogTitle>
          <DialogDescription>
            Configure your PostgreSQL database connection. All fields are required except SSL mode.
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
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
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
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              testResult === "success" 
                ? "bg-success/10 text-success border border-success/20" 
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {testResult === "success" ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Connection successful</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Connection failed</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Connection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

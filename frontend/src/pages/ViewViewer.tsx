import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, Eye, Loader2 } from "lucide-react";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService } from "@/lib/api/services/schemas.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";
import { ErrorDisplay } from "@/components/error/ErrorDisplay";
import { ConnectionErrorHandler } from "@/components/error/ConnectionErrorHandler";

const ViewViewer = () => {
  const { viewId } = useParams();
  const navigate = useNavigate();
  const { activeConnection } = useConnection();
  const [copied, setCopied] = useState(false);

  // Parse viewId: "schema.viewName"
  const parsedView = useQuery({
    queryKey: ['parseView', viewId],
    queryFn: () => {
      if (!viewId) return null;
      const parts = viewId.split('.');
      if (parts.length < 2) return null;
      return {
        schema: parts[0],
        name: parts.slice(1).join('.'),
      };
    },
    enabled: !!viewId,
  });

  const { data: viewDetails, isLoading, error } = useQuery({
    queryKey: ['viewDetails', activeConnection?.id, parsedView.data],
    queryFn: () => {
      if (!activeConnection || !parsedView.data) throw new Error("Missing connection or view data");
      return schemasService.getViewDetails(
        activeConnection.id,
        parsedView.data.schema,
        parsedView.data.name,
      );
    },
    enabled: !!activeConnection && !!parsedView.data && activeConnection.status === 'connected',
  });

  const copyDefinition = () => {
    if (!viewDetails?.definition) return;
    navigator.clipboard.writeText(viewDetails.definition);
    setCopied(true);
    toast.success("View definition copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeConnection) {
    return (
      <div className="p-6">
        <ErrorDisplay message="No active connection" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !viewDetails) {
    return (
      <div className="p-6">
        <ConnectionErrorHandler error={error} />
        <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Schema Browser
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/')} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="w-6 h-6" />
              {viewDetails.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {viewDetails.schema}
            </p>
          </div>
          <Button onClick={copyDefinition} variant="outline" size="sm">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>View Information</CardTitle>
              <CardDescription>Details about the view</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Schema</label>
                  <p className="text-sm">{viewDetails.schema}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner</label>
                  <p className="text-sm">{viewDetails.owner}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    View Definition
                  </CardTitle>
                  <CardDescription>The SQL query that defines this view</CardDescription>
                </div>
                <Button onClick={copyDefinition} variant="outline" size="sm">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
                {viewDetails.definition}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ViewViewer;


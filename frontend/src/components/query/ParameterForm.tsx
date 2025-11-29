import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SQLParameter, parseSQLParameters, getUniqueParameterNames } from "@/lib/sql/parameterParser";
import { cn } from "@/lib/utils";

interface ParameterFormProps {
  query: string;
  parameters: Record<string, any>;
  onParametersChange: (parameters: Record<string, any>) => void;
  isExecuting?: boolean;
}

export const ParameterForm = ({
  query,
  parameters,
  onParametersChange,
  isExecuting = false,
}: ParameterFormProps) => {
  const parsed = parseSQLParameters(query);
  const uniqueNames = getUniqueParameterNames(parsed.parameters);
  
  // For positional parameters, create names like ?1, ?2, etc.
  const allParameters = parsed.parameters.map((param, idx) => {
    if (param.name.startsWith('?')) {
      // Positional parameter - use the first occurrence as the key
      return {
        ...param,
        displayName: `Parameter ${param.index}`,
      };
    }
    return {
      ...param,
      displayName: param.name,
    };
  });

  // Get unique parameters (for named params, show once; for positional, show all)
  const uniqueParams = Array.from(
    new Map(
      allParameters.map(p => [p.name.startsWith('?') ? p.name : p.name, p])
    ).values()
  );

  const handleParameterChange = (paramName: string, value: any) => {
    onParametersChange({
      ...parameters,
      [paramName]: value,
    });
  };

  const handleTypeCoercion = (paramName: string, type: SQLParameter['type'], value: string) => {
    // Allow empty strings for now - backend will validate
    if (value === '') {
      handleParameterChange(paramName, '');
      return;
    }
    
    if (!value || value.trim() === '') {
      // Delete the parameter if truly empty
      const newParams = { ...parameters };
      delete newParams[paramName];
      onParametersChange(newParams);
      return;
    }

    let coercedValue: any = value;

    switch (type) {
      case 'number':
        const num = Number(value);
        coercedValue = isNaN(num) ? value : num;
        break;
      case 'boolean':
        coercedValue = value.toLowerCase() === 'true' || value === '1';
        break;
      case 'date':
        // Keep as string, let backend handle it
        coercedValue = value;
        break;
      default:
        coercedValue = value;
    }

    handleParameterChange(paramName, coercedValue);
  };

  const getParameterValue = (param: SQLParameter): string => {
    const value = parameters[param.name];
    if (value === undefined || value === null) return '';
    if (typeof value === 'boolean') return value.toString();
    return String(value);
  };

  if (!parsed.hasParameters) {
    return null;
  }

  const missingParams = uniqueParams.filter(
    param => !parameters[param.name] || parameters[param.name] === ''
  );

  return (
    <Card className="mb-8 border-primary/20 bg-primary/5" data-parameter-form>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Query Parameters
              <Badge variant="secondary">{uniqueParams.length}</Badge>
            </CardTitle>
            <CardDescription className="mt-1">
              Provide values for the parameters in your query
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        {missingParams.length > 0 && (
          <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm">
              Please provide values for: {missingParams.map(p => p.displayName).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          {uniqueParams.map((param) => {
            const value = getParameterValue(param);
            const isRequired = true; // All parameters are required for now

            return (
              <div key={param.name} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`param-${param.name}`} className="font-medium">
                    {param.displayName}
                  </Label>
                  {isRequired && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                  {param.type && param.type !== 'unknown' && (
                    <Badge variant="secondary" className="text-xs">
                      {param.type}
                    </Badge>
                  )}
                  <code className="text-xs text-muted-foreground ml-auto">
                    {param.originalText}
                  </code>
                </div>

                {param.type === 'boolean' ? (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`param-${param.name}`}
                      checked={parameters[param.name] === true}
                      onCheckedChange={(checked) =>
                        handleParameterChange(param.name, checked === true)
                      }
                    />
                    <Label htmlFor={`param-${param.name}`} className="cursor-pointer">
                      {parameters[param.name] ? 'True' : 'False'}
                    </Label>
                  </div>
                ) : param.type === 'date' ? (
                  <Input
                    id={`param-${param.name}`}
                    type="datetime-local"
                    value={value || ''}
                    onChange={(e) => handleTypeCoercion(param.name, param.type, e.target.value)}
                    className="font-mono"
                    placeholder={`Enter ${param.type} value`}
                  />
                ) : (
                  <Input
                    id={`param-${param.name}`}
                    type={param.type === 'number' ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => handleTypeCoercion(param.name, param.type, e.target.value)}
                    className="font-mono"
                    placeholder={`Enter ${param.type || 'value'}`}
                  />
                )}

                {param.type === 'string' && (
                  <p className="text-xs text-muted-foreground">
                    Use single quotes in SQL if needed: 'value'
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Execute button removed - use the Run button in the SQL editor instead for better UX */}
      </CardContent>
    </Card>
  );
};


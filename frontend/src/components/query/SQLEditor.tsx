import { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play, Square, Sparkles, AlignLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  isExecuting?: boolean;
}

export const SQLEditor = ({ value, onChange, onExecute, isExecuting }: SQLEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = () => {
    // Simple SQL formatting
    let formatted = value
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\s*,\s*/g, ",\n  ") // Commas on new lines
      .replace(/\s+(FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT)\s+/gi, "\n$1 ")
      .replace(/\s+(AND|OR)\s+/gi, "\n  $1 ")
      .trim();
    
    onChange(formatted);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Execute query with Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onExecute();
    }

    // Tab support
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            SQL Query Editor
          </CardTitle>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFormat}
                    className="gap-2"
                  >
                    <AlignLeft className="w-4 h-4" />
                    Format
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Format SQL (beautify)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={onExecute}
              disabled={isExecuting || !value.trim()}
              className="gap-2"
            >
              {isExecuting ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run (Ctrl+Enter)
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="font-mono text-sm min-h-[200px] bg-code-bg resize-none focus-visible:ring-primary"
          placeholder="-- Enter your SQL query here
-- Use Ctrl/Cmd + Enter to execute
-- Use Tab for indentation

SELECT * FROM users WHERE email LIKE '%@example.com' LIMIT 10;"
          spellCheck={false}
        />
        <div className="mt-2 text-xs text-muted-foreground flex justify-between">
          <span>Lines: {value.split("\n").length}</span>
          <span>Characters: {value.length}</span>
        </div>
      </CardContent>
    </Card>
  );
};

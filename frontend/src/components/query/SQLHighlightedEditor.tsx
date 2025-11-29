import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Square, Sparkles, AlignLeft } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SQLHighlightedEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  isExecuting?: boolean;
}

// SQL Keywords for highlighting
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'ON',
  'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP',
  'ALTER', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT',
  'NULL', 'NOT', 'AUTO_INCREMENT', 'SERIAL', 'CASCADE', 'RESTRICT',
  'UNION', 'ALL', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'EXISTS', 'ANY', 'SOME', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'TRUE', 'FALSE', 'IS', 'ISNULL', 'COALESCE', 'NULLIF',
  'CAST', 'CONVERT', 'EXTRACT', 'DATE', 'TIME', 'TIMESTAMP', 'INTERVAL',
  'WITH', 'RECURSIVE', 'RETURNING', 'USING', 'NATURAL', 'LATERAL'
];

const SQL_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CONCAT', 'SUBSTRING', 'TRIM',
  'UPPER', 'LOWER', 'LENGTH', 'REPLACE', 'ROUND', 'FLOOR', 'CEIL',
  'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
  'COALESCE', 'NULLIF', 'CAST', 'EXTRACT', 'DATE_TRUNC', 'TO_CHAR'
];

// Escape HTML entities helper
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// Token types for SQL highlighting
type TokenType = 'keyword' | 'string' | 'number' | 'comment' | 'function' | 'operator' | 'text';

interface Token {
  type: TokenType;
  value: string;
}

// Tokenize SQL code
const tokenizeSQL = (code: string): Token[] => {
  const tokens: Token[] = [];
  let remaining = code;
  
  const keywordSet = new Set(SQL_KEYWORDS.map(k => k.toUpperCase()));
  const functionSet = new Set(SQL_FUNCTIONS.map(f => f.toUpperCase()));
  
  while (remaining.length > 0) {
    let matched = false;
    
    // Check for single-line comment
    const singleCommentMatch = remaining.match(/^--[^\n]*/);
    if (singleCommentMatch) {
      tokens.push({ type: 'comment', value: singleCommentMatch[0] });
      remaining = remaining.slice(singleCommentMatch[0].length);
      matched = true;
      continue;
    }
    
    // Check for multi-line comment
    const multiCommentMatch = remaining.match(/^\/\*[\s\S]*?\*\//);
    if (multiCommentMatch) {
      tokens.push({ type: 'comment', value: multiCommentMatch[0] });
      remaining = remaining.slice(multiCommentMatch[0].length);
      matched = true;
      continue;
    }
    
    // Check for string (single quotes)
    const singleStringMatch = remaining.match(/^'(?:[^'\\]|\\.)*'/);
    if (singleStringMatch) {
      tokens.push({ type: 'string', value: singleStringMatch[0] });
      remaining = remaining.slice(singleStringMatch[0].length);
      matched = true;
      continue;
    }
    
    // Check for string (double quotes)
    const doubleStringMatch = remaining.match(/^"(?:[^"\\]|\\.)*"/);
    if (doubleStringMatch) {
      tokens.push({ type: 'string', value: doubleStringMatch[0] });
      remaining = remaining.slice(doubleStringMatch[0].length);
      matched = true;
      continue;
    }
    
    // Check for number
    const numberMatch = remaining.match(/^\d+(?:\.\d+)?/);
    if (numberMatch) {
      tokens.push({ type: 'number', value: numberMatch[0] });
      remaining = remaining.slice(numberMatch[0].length);
      matched = true;
      continue;
    }
    
    // Check for word (keyword, function, or identifier)
    const wordMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const upperWord = word.toUpperCase();
      
      // Check if it's a function (followed by parenthesis)
      const nextChar = remaining.slice(word.length).match(/^\s*\(/);
      if (functionSet.has(upperWord) && nextChar) {
        tokens.push({ type: 'function', value: word });
      } else if (keywordSet.has(upperWord)) {
        tokens.push({ type: 'keyword', value: word });
      } else {
        tokens.push({ type: 'text', value: word });
      }
      remaining = remaining.slice(word.length);
      matched = true;
      continue;
    }
    
    // Check for operators
    const operatorMatch = remaining.match(/^(!=|<>|<=|>=|<|>|=|\+|-|\*|\/|%|\|\|)/);
    if (operatorMatch) {
      tokens.push({ type: 'operator', value: operatorMatch[0] });
      remaining = remaining.slice(operatorMatch[0].length);
      matched = true;
      continue;
    }
    
    // Default: take one character as text
    if (!matched) {
      tokens.push({ type: 'text', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }
  
  return tokens;
};

// Syntax highlighting function
const highlightSQL = (code: string): string => {
  if (!code) return '';
  
  const tokens = tokenizeSQL(code);
  
  return tokens.map(token => {
    const escaped = escapeHtml(token.value);
    switch (token.type) {
      case 'keyword':
        return `<span class="sql-keyword">${escaped}</span>`;
      case 'string':
        return `<span class="sql-string">${escaped}</span>`;
      case 'number':
        return `<span class="sql-number">${escaped}</span>`;
      case 'comment':
        return `<span class="sql-comment">${escaped}</span>`;
      case 'function':
        return `<span class="sql-function">${escaped}</span>`;
      case 'operator':
        return `<span class="sql-operator">${escaped}</span>`;
      default:
        return escaped;
    }
  }).join('');
};

export const SQLHighlightedEditor = ({
  value,
  onChange,
  onExecute,
  isExecuting
}: SQLHighlightedEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  // Sync scroll between textarea and highlight overlay
  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current && lineNumbersRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Update line count
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(Math.max(lines, 1));
  }, [value]);

  const handleFormat = () => {
    // Simple SQL formatting
    let formatted = value
      .replace(/\s+/g, " ")
      .replace(/\s*,\s*/g, ",\n  ")
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
        <div className="relative rounded-lg border bg-code-bg overflow-hidden">
          {/* Line numbers */}
          <div
            ref={lineNumbersRef}
            className="absolute left-0 top-0 bottom-0 w-12 bg-muted/50 border-r border-border overflow-hidden select-none"
            aria-hidden="true"
          >
            <div className="py-3 px-2 text-right">
              {Array.from({ length: lineCount }, (_, i) => (
                <div
                  key={i}
                  className="text-xs text-muted-foreground leading-6 font-mono"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
          
          {/* Editor container */}
          <div className="relative ml-12">
            {/* Syntax highlighted overlay */}
            <pre
              ref={highlightRef}
              className={cn(
                "absolute inset-0 m-0 p-3 overflow-auto pointer-events-none",
                "font-mono text-sm leading-6 whitespace-pre-wrap break-words",
                "text-foreground"
              )}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: highlightSQL(value) + '\n' }}
            />
            
            {/* Actual textarea (transparent text) */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onScroll={syncScroll}
              className={cn(
                "relative w-full min-h-[200px] p-3 resize-none",
                "font-mono text-sm leading-6 bg-transparent",
                "text-transparent caret-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-r-lg",
                "placeholder:text-muted-foreground"
              )}
              placeholder="-- Enter your SQL query here
-- Use Ctrl/Cmd + Enter to execute
-- Use Tab for indentation

SELECT * FROM users WHERE email LIKE '%@example.com' LIMIT 10;"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground flex justify-between">
          <span>Lines: {lineCount}</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[hsl(210,100%,56%)]" />
              Keywords
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[hsl(142,70%,45%)]" />
              Strings
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[hsl(38,92%,50%)]" />
              Numbers
            </span>
            <span>Characters: {value.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

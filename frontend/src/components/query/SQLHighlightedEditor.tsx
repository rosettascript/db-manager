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
import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService, dataService } from "@/lib/api";
import type { Table, Schema } from "@/lib/api/types";
import { parseSQLContext, getAutocompleteSuggestions } from "@/lib/sql/autocomplete";
import { AutocompleteDropdown } from "./AutocompleteDropdown";
import type { AutocompleteSuggestion } from "@/lib/sql/autocomplete";
import { detectValuePattern, rankValues } from "@/lib/sql/valuePatternDetector";

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
  const { activeConnection } = useConnection();
  
  // Autocomplete state
  const [autocompleteVisible, setAutocompleteVisible] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] = useState(0);
  const [autocompletePosition, setAutocompletePosition] = useState<{ top: number; left: number } | null>(null);
  const isNavigatingAutocomplete = useRef(false);
  const lastCursorPosition = useRef(0);
  const autocompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Fetch schemas and tables for autocomplete
  const { data: schemas = [] } = useQuery<Schema[]>({
    queryKey: ['schemas', activeConnection?.id],
    queryFn: () => schemasService.getSchemas(activeConnection!.id),
    enabled: !!activeConnection,
    staleTime: 60000,
  });
  
  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['tables', activeConnection?.id],
    queryFn: () => schemasService.getTables(activeConnection!.id),
    enabled: !!activeConnection,
    staleTime: 60000,
  });

  // Native event listener for Ctrl+Shift+K to ensure it works before React handlers
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleNativeKeyDown = (e: KeyboardEvent) => {
      // Only handle if event target is the textarea
      if (e.target !== textarea) return;
      
      // Don't interfere with autocomplete navigation
      if (autocompleteVisible && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter" || e.key === "Tab" || e.key === "Escape")) {
        return; // Let React handler handle these
      }
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const lines = value.split('\n');
      const currentLineIndex = value.substring(0, start).split('\n').length - 1;
      
      // Delete line: Ctrl+Shift+K
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "K" || e.key === "k")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (lines.length > 1) {
          const newLines = [...lines];
          newLines.splice(currentLineIndex, 1);
          const newValue = newLines.join('\n');
          onChange(newValue);
          
          // Position cursor at the start of next line (or previous if deleted last line)
          const targetLineIndex = currentLineIndex < newLines.length ? currentLineIndex : currentLineIndex - 1;
          const newCursorPos = newLines.slice(0, targetLineIndex).join('\n').length + (targetLineIndex > 0 ? 1 : 0);
          
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
              textareaRef.current.focus();
            }
          });
        } else {
          // If only one line, just clear it
          onChange('');
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 0;
              textareaRef.current.focus();
            }
          });
        }
        return;
      }

      // Duplicate line: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const newLines = [...lines];
        newLines.splice(currentLineIndex + 1, 0, lines[currentLineIndex]);
        const newValue = newLines.join('\n');
        onChange(newValue);
        
        // Position cursor at the start of the duplicated line
        const newCursorPos = newLines.slice(0, currentLineIndex + 1).join('\n').length + 1;
        
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
            textareaRef.current.focus();
          }
        });
        return;
      }

      // Move line up: Alt+Up
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (currentLineIndex > 0) {
          const newLines = [...lines];
          [newLines[currentLineIndex - 1], newLines[currentLineIndex]] = [newLines[currentLineIndex], newLines[currentLineIndex - 1]];
          const newValue = newLines.join('\n');
          onChange(newValue);
          
          // Maintain cursor position relative to line start
          const lineStartPos = newLines.slice(0, currentLineIndex - 1).join('\n').length + (currentLineIndex > 1 ? 1 : 0);
          const cursorOffset = start - lines.slice(0, currentLineIndex).join('\n').length - (currentLineIndex > 0 ? 1 : 0);
          const newCursorPos = Math.min(lineStartPos + cursorOffset, lineStartPos + newLines[currentLineIndex - 1].length);
          
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
              textareaRef.current.focus();
            }
          });
        }
        return;
      }

      // Move line down: Alt+Down
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (currentLineIndex < lines.length - 1) {
          const newLines = [...lines];
          [newLines[currentLineIndex], newLines[currentLineIndex + 1]] = [newLines[currentLineIndex + 1], newLines[currentLineIndex]];
          const newValue = newLines.join('\n');
          onChange(newValue);
          
          // Maintain cursor position relative to line start
          const lineStartPos = newLines.slice(0, currentLineIndex + 1).join('\n').length + (currentLineIndex >= 0 ? 1 : 0);
          const cursorOffset = start - lines.slice(0, currentLineIndex).join('\n').length - (currentLineIndex > 0 ? 1 : 0);
          const newCursorPos = Math.min(lineStartPos + cursorOffset, lineStartPos + newLines[currentLineIndex + 1].length);
          
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
              textareaRef.current.focus();
            }
          });
        }
        return;
      }

      // Comment/uncomment line(s): Ctrl+/
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === "/" || e.key === "?")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Determine which lines to comment/uncomment
        const startLineIndex = value.substring(0, start).split('\n').length - 1;
        const endLineIndex = value.substring(0, end).split('\n').length - 1;
        const isMultiLine = startLineIndex !== endLineIndex || (start !== end && lines[startLineIndex].trim() !== lines[startLineIndex].substring(Math.min(start, end)));
        
        const newLines = [...lines];
        let hasComments = false;
        let hasUncommented = false;
        
        // Check if we're commenting or uncommenting
        for (let i = startLineIndex; i <= endLineIndex; i++) {
          const trimmedLine = newLines[i].trim();
          if (trimmedLine.startsWith('--')) {
            hasComments = true;
          } else if (trimmedLine.length > 0) {
            hasUncommented = true;
          }
        }
        
        const shouldComment = !hasComments || (hasComments && hasUncommented);
        
        // Apply comment/uncomment to selected lines
        for (let i = startLineIndex; i <= endLineIndex; i++) {
          if (newLines[i].trim().length === 0) continue; // Skip empty lines
          
          if (shouldComment) {
            // Comment the line
            const trimmed = newLines[i].trim();
            if (!trimmed.startsWith('--')) {
              const indent = newLines[i].match(/^(\s*)/)?.[0] || '';
              newLines[i] = indent + '-- ' + trimmed;
            }
          } else {
            // Uncomment the line
            const trimmed = newLines[i].trim();
            if (trimmed.startsWith('--')) {
              const uncommented = trimmed.substring(2).trim();
              const indent = newLines[i].match(/^(\s*)/)?.[0] || '';
              newLines[i] = indent + uncommented;
            }
          }
        }
        
        const newValue = newLines.join('\n');
        onChange(newValue);
        
        // Maintain cursor position (keep selection at start of first modified line)
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            // Calculate new cursor position - place at start of first modified line
            const lineStart = newLines.slice(0, startLineIndex).join('\n').length + (startLineIndex > 0 ? 1 : 0);
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = lineStart;
            textareaRef.current.focus();
          }
        });
        return;
      }
    };

    // Use capture phase to intercept before other handlers
    textarea.addEventListener('keydown', handleNativeKeyDown, true);

    return () => {
      textarea.removeEventListener('keydown', handleNativeKeyDown, true);
    };
  }, [value, onChange, autocompleteVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

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

  // Calculate autocomplete dropdown position
  const calculateAutocompletePosition = useCallback(() => {
    if (!textareaRef.current) return null;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, start);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    
    // Create a temporary span to measure text width
    const measureSpan = document.createElement('span');
    measureSpan.style.visibility = 'hidden';
    measureSpan.style.position = 'absolute';
    measureSpan.style.font = window.getComputedStyle(textarea).font;
    measureSpan.style.fontFamily = window.getComputedStyle(textarea).fontFamily;
    measureSpan.style.fontSize = window.getComputedStyle(textarea).fontSize;
    measureSpan.style.whiteSpace = 'pre';
    measureSpan.textContent = currentLine;
    document.body.appendChild(measureSpan);
    
    const textWidth = measureSpan.offsetWidth;
    const textHeight = measureSpan.offsetHeight;
    document.body.removeChild(measureSpan);
    
    // Get textarea position
    const rect = textarea.getBoundingClientRect();
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;
    
    // Calculate line height (approximate)
    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 24;
    const charWidth = textWidth / Math.max(currentLine.length, 1);
    
    // Calculate position
    const left = rect.left + 48 + textWidth - scrollLeft + window.scrollX; // 48 for line numbers
    const top = rect.top + (lines.length - 1) * lineHeight + lineHeight - scrollTop + window.scrollY;
    
    return { top, left };
  }, [value]);
  
  // Update autocomplete suggestions
  const updateAutocomplete = useCallback(async (cursorPos: number, forceShow: boolean = false) => {
    if (!activeConnection || !textareaRef.current) {
      setAutocompleteVisible(false);
      return;
    }
    
    const context = parseSQLContext(value, cursorPos);
    const schemaNames = schemas.map(s => s.name);
    
    // Convert tables to autocomplete format
    const tablesForAutocomplete = tables.map(table => ({
      name: table.name,
      schema: table.schema,
      columns: table.columns,
    }));
    
    let suggestions = getAutocompleteSuggestions(context, tablesForAutocomplete, schemaNames);
    
    // Helper function to fetch and rank column values
    const fetchColumnValues = async (
      columnInfo: { schema: string; table: string; column: string },
      valuePrefix: string | undefined
    ): Promise<AutocompleteSuggestion[]> => {
      try {
        const result = await dataService.getColumnValues(
          activeConnection!.id,
          columnInfo.schema,
          columnInfo.table,
          columnInfo.column,
          {
            search: valuePrefix && valuePrefix.length > 0 ? valuePrefix : undefined,
            limit: 50, // Get more values for pattern detection
          }
        );

        if (result.values.length === 0) {
          return [];
        }

        // Detect pattern in values
        const pattern = detectValuePattern(result.values);
        
        // Rank values using pattern-aware ranking
        const searchPrefix = (valuePrefix || '').toLowerCase();
        const rankedValues = rankValues(result.values, searchPrefix, pattern);
        
        // Limit to top 20 for display
        const topValues = rankedValues.slice(0, 20);
        
        // Build suggestions with pattern metadata
        const valueSuggestions: AutocompleteSuggestion[] = topValues.map(val => {
          let detail = `Value from ${columnInfo.column}`;
          
          // Add pattern info to detail
          if (pattern.pattern === 'enum' && pattern.metadata?.enumValues) {
            const enumCount = pattern.metadata.enumValues.length;
            detail += ` (${enumCount} distinct values)`;
          } else if (pattern.pattern === 'boolean') {
            detail += ' (boolean)';
          } else if (pattern.pattern === 'id') {
            detail += ' (ID)';
          } else if (pattern.pattern === 'date') {
            detail += ' (date)';
          }
          
          return {
            label: val,
            insertText: val,
            kind: 'value',
            detail,
          };
        });
        
        return valueSuggestions;
      } catch (error) {
        // If fetching values fails, return empty array
        return [];
      }
    };
    
    // If we're typing a value in WHERE clause, fetch column values
    if (context.whereColumn && context.whereValuePrefix !== undefined) {
      const valueSuggestions = await fetchColumnValues(
        context.whereColumn,
        context.whereValuePrefix
      );
      // Prepend value suggestions (they're more relevant)
      suggestions = [...valueSuggestions, ...suggestions];
    }
    
    // If we're typing a value in INSERT VALUES clause, fetch column values
    if (context.insertColumn && context.insertValuePrefix !== undefined) {
      const valueSuggestions = await fetchColumnValues(
        context.insertColumn,
        context.insertValuePrefix
      );
      // Prepend value suggestions
      suggestions = [...valueSuggestions, ...suggestions];
    }
    
    // If we're typing a value in UPDATE SET clause, fetch column values
    if (context.updateColumn && context.updateValuePrefix !== undefined) {
      const valueSuggestions = await fetchColumnValues(
        context.updateColumn,
        context.updateValuePrefix
      );
      // Prepend value suggestions
      suggestions = [...valueSuggestions, ...suggestions];
    }
    
    // Only show autocomplete if we have suggestions and meet display criteria
    // Trim currentWord to handle whitespace issues
    const trimmedCurrentWord = context.currentWord?.trim() || '';
    const hasCurrentWord = trimmedCurrentWord.length > 0;
    
    const shouldShow = forceShow || 
      (suggestions.length > 0 && hasCurrentWord) ||
      (suggestions.length > 0 && context.isAfterTrigger === true) ||
      (suggestions.length > 0 && (context.whereColumn !== undefined || 
                                   context.insertColumn !== undefined || 
                                   context.updateColumn !== undefined)) ||
      (suggestions.length > 0 && !hasCurrentWord && 
       (context.contextType === 'where' || context.contextType === 'order' || 
        context.contextType === 'group' || context.contextType === 'having')) ||
      // Always show in FROM context when there's a table (with or without current word)
      (suggestions.length > 0 && context.contextType === 'from' && context.tablesInQuery.length > 0);
    
    if (shouldShow && suggestions.length > 0) {
      // Only reset selectedIndex if we're not navigating
      if (!isNavigatingAutocomplete.current) {
        setAutocompleteSelectedIndex(0);
      }
      setAutocompleteSuggestions(suggestions);
      setAutocompleteVisible(true);
      const position = calculateAutocompletePosition();
      setAutocompletePosition(position);
    } else {
      setAutocompleteVisible(false);
      isNavigatingAutocomplete.current = false;
    }
  }, [value, activeConnection, schemas, tables, calculateAutocompletePosition]);
  
  // Insert autocomplete suggestion
  const insertSuggestion = useCallback((suggestion: AutocompleteSuggestion) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const context = parseSQLContext(value, start);
    
    let newValue: string;
    let newCursorPos: number;
    
    // Special handling for value suggestions (inside quotes in WHERE/INSERT/UPDATE clauses)
    if (suggestion.kind === 'value' && 
        (context.whereValuePrefix !== undefined || 
         context.insertValuePrefix !== undefined || 
         context.updateValuePrefix !== undefined)) {
      // Find the opening quote before cursor
      const beforeCursor = value.substring(0, start);
      const lastQuoteIndex = beforeCursor.lastIndexOf("'");
      
      if (lastQuoteIndex !== -1) {
        // Replace text between opening quote and cursor
        const beforeQuote = value.substring(0, lastQuoteIndex + 1);
        const afterCursor = value.substring(start);
        newValue = beforeQuote + suggestion.insertText + afterCursor;
        newCursorPos = lastQuoteIndex + 1 + suggestion.insertText.length;
      } else {
        // Fallback to normal replacement
        const beforeWord = value.substring(0, start - context.currentWord.length);
        const afterWord = value.substring(end);
        newValue = beforeWord + suggestion.insertText + afterWord;
        newCursorPos = start - context.currentWord.length + suggestion.insertText.length;
      }
    } else if (context.isAfterTrigger && context.triggerCharacter === '.') {
      // Special handling: inserting after a dot (e.g., "schema." -> "schema"."table")
      // Just insert the suggestion text at the cursor position
      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(end);
      newValue = beforeCursor + suggestion.insertText + afterCursor;
      newCursorPos = start + suggestion.insertText.length;
    } else {
      // Normal replacement for other suggestions
      // Replace the current word with the suggestion
      const wordLength = context.currentWord.length;
      const beforeWord = value.substring(0, start - wordLength);
      const afterWord = value.substring(end);
      newValue = beforeWord + suggestion.insertText + afterWord;
      newCursorPos = start - wordLength + suggestion.insertText.length;
    }
    
    onChange(newValue);
    
    // Position cursor after inserted text
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
        
        // If we inserted a table name in FROM context, trigger autocomplete to show keywords
        // Check if the inserted text ends with a space (table name with space)
        if (suggestion.kind === 'table' && suggestion.insertText.endsWith(' ')) {
          // Trigger autocomplete after a short delay to show keyword suggestions
          setTimeout(() => {
            if (textareaRef.current) {
              updateAutocomplete(newCursorPos, true);
            }
          }, 50);
        }
      }
    }, 0);
    
    // Don't hide autocomplete if we just inserted a table name with space - we want to show keywords
    if (suggestion.kind === 'table' && suggestion.insertText.endsWith(' ')) {
      // Keep autocomplete visible - it will be updated by the setTimeout above
      return;
    }
    
    setAutocompleteVisible(false);
  }, [value, onChange, updateAutocomplete]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const lines = value.split('\n');
    const currentLineIndex = value.substring(0, start).split('\n').length - 1;
    const currentLine = lines[currentLineIndex] || '';

    // Handle autocomplete navigation
    if (autocompleteVisible && autocompleteSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        isNavigatingAutocomplete.current = true;
        setAutocompleteSelectedIndex(prev => {
          const next = prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0;
          return next;
        });
        // Update position without resetting suggestions
        setTimeout(() => {
          const position = calculateAutocompletePosition();
          setAutocompletePosition(position);
        }, 0);
        return;
      }
      
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        isNavigatingAutocomplete.current = true;
        setAutocompleteSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1;
          return next;
        });
        // Update position without resetting suggestions
        setTimeout(() => {
          const position = calculateAutocompletePosition();
          setAutocompletePosition(position);
        }, 0);
        return;
      }
      
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        isNavigatingAutocomplete.current = false;
        if (autocompleteSuggestions[autocompleteSelectedIndex]) {
          insertSuggestion(autocompleteSuggestions[autocompleteSelectedIndex]);
        }
        return;
      }
      
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        isNavigatingAutocomplete.current = false;
        setAutocompleteVisible(false);
        return;
      }
    }

    // Note: Delete line (Ctrl+Shift+K) is handled by native event listener above
    // to ensure it runs before React's synthetic event system

    // Execute query with Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      setAutocompleteVisible(false);
      onExecute();
      return;
    }

    // Duplicate line: Ctrl+D
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      setAutocompleteVisible(false);
      const newLines = [...lines];
      newLines.splice(currentLineIndex + 1, 0, currentLine);
      const newValue = newLines.join('\n');
      onChange(newValue);
      
      // Position cursor at the start of the duplicated line
      const newCursorPos = start + currentLine.length + 1;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
      return;
    }

    // Tab support (only if autocomplete is not visible)
    if (e.key === "Tab" && !autocompleteVisible) {
      e.preventDefault();
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };
  
  // Handle input changes to trigger autocomplete
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const cursorChanged = cursorPos !== lastCursorPosition.current;
    const typedChar = newValue.length > value.length;
    const deletedChar = newValue.length < value.length;
    
    // Get the character that was just typed (if any)
    const lastChar = typedChar && cursorPos > 0 ? newValue[cursorPos - 1] : '';
    
    // Check if we're typing inside quotes (for WHERE clause values)
    const beforeCursor = newValue.substring(0, cursorPos);
    const lastQuoteIndex = beforeCursor.lastIndexOf("'");
    const isInsideQuotes = lastQuoteIndex !== -1;
    
    // Characters that should hide autocomplete (but not single quote if we're inside quotes)
    // Note: '.' is NOT in hideChars because it's a trigger character for autocomplete
    const hideChars = [' ', ';', '(', ')', ',', '\n', '\t'];
    
    // Trigger characters that should show autocomplete immediately
    const triggerChars = ['.'];
    
    onChange(newValue);
    lastCursorPosition.current = cursorPos;
    
    // If user typed a trigger character, trigger autocomplete immediately (don't hide)
    if (typedChar && triggerChars.includes(lastChar)) {
      // Trigger autocomplete immediately for trigger characters
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
        autocompleteTimeoutRef.current = null;
      }
      setTimeout(() => {
        if (textareaRef.current) {
          const currentPos = textareaRef.current.selectionStart;
          updateAutocomplete(currentPos, true); // Force show
        }
      }, 50); // Very short delay for trigger characters
      return;
    }
    
    // Handle space character - may trigger or hide autocomplete depending on context
    if (typedChar && lastChar === ' ') {
      const context = parseSQLContext(newValue, cursorPos);
      // Check if we're in FROM context with a table (most common case after table name)
      const isFromContextWithTable = context.contextType === 'from' && context.tablesInQuery.length > 0;
      
      // Show autocomplete after space in these contexts:
      // 1. FROM context with table (user typed space after table name)
      // 2. WHERE/ORDER/GROUP/HAVING context with no current word (user just typed clause keyword)
      const shouldShowAfterSpace = 
        isFromContextWithTable ||
        (context.contextType === 'where' && !context.currentWord) ||
        (context.contextType === 'order' && !context.currentWord) ||
        (context.contextType === 'group' && !context.currentWord) ||
        (context.contextType === 'having' && !context.currentWord);
      
      if (shouldShowAfterSpace && !isInsideQuotes) {
        // Trigger autocomplete after space in these contexts
        if (autocompleteTimeoutRef.current) {
          clearTimeout(autocompleteTimeoutRef.current);
          autocompleteTimeoutRef.current = null;
        }
        // Use requestAnimationFrame + setTimeout to ensure DOM is updated
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (textareaRef.current) {
              const currentPos = textareaRef.current.selectionStart;
              // Force show with a fresh context parse to ensure accuracy
              updateAutocomplete(currentPos, true);
            }
          }, 10);
        });
        return;
      }
      
      // Don't hide autocomplete on space if we're in FROM context with a table
      // This allows suggestions to stay visible when user types space after table name
      if (autocompleteVisible && !isInsideQuotes && !isFromContextWithTable) {
        setAutocompleteVisible(false);
        isNavigatingAutocomplete.current = false;
        return;
      }
    }
    
    // Hide autocomplete if user typed other characters that end a word
    // But don't hide if we're inside quotes (typing a value)
    if (typedChar && hideChars.includes(lastChar) && autocompleteVisible && !isInsideQuotes && lastChar !== ' ') {
      setAutocompleteVisible(false);
      isNavigatingAutocomplete.current = false;
      return;
    }
    
    // Only trigger autocomplete if:
    // 1. Not navigating with arrows
    // 2. User is actually typing (not just moving cursor)
    if (!isNavigatingAutocomplete.current) {
      // Clear any existing timeout
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
        autocompleteTimeoutRef.current = null;
      }
      
      if (typedChar && (!hideChars.includes(lastChar) || isInsideQuotes)) {
        // User typed a character - trigger autocomplete with debouncing
        // Longer delay for WHERE clause values (to reduce API spam)
        const context = parseSQLContext(newValue, cursorPos);
        const isWhereValue = context.whereColumn !== undefined;
        // In FROM context after a table, show suggestions immediately when typing keywords
        const isFromContext = context.contextType === 'from' && context.tablesInQuery.length > 0;
        const delay = isWhereValue ? 300 : (isFromContext ? 50 : (lastChar === "'" ? 200 : 150));
        
        autocompleteTimeoutRef.current = setTimeout(() => {
          if (textareaRef.current) {
            const currentPos = textareaRef.current.selectionStart;
            // Force show in FROM context after table to ensure keywords appear
            updateAutocomplete(currentPos, isFromContext);
          }
          autocompleteTimeoutRef.current = null;
        }, delay);
      } else if (deletedChar) {
        // User deleted a character - update autocomplete if still typing a word, inside quotes, or after trigger
        // Use shorter delay for deletions
        autocompleteTimeoutRef.current = setTimeout(() => {
          if (textareaRef.current) {
            const currentPos = textareaRef.current.selectionStart;
            const context = parseSQLContext(newValue, currentPos);
            const shouldKeepVisible = context.contextType === 'from' && context.tablesInQuery.length > 0;
            if (context.currentWord.length > 0 || context.whereColumn !== undefined || context.isAfterTrigger || shouldKeepVisible) {
              updateAutocomplete(currentPos, shouldKeepVisible);
            } else {
              setAutocompleteVisible(false);
            }
          }
          autocompleteTimeoutRef.current = null;
        }, 200);
      } else if (!typedChar && cursorChanged) {
        // User moved cursor without typing - update autocomplete but don't hide if in FROM context with table
        const context = parseSQLContext(newValue, cursorPos);
        const shouldKeepVisible = context.contextType === 'from' && context.tablesInQuery.length > 0;
        if (context.currentWord.length === 0 && !context.whereColumn && !context.isAfterTrigger && !shouldKeepVisible && autocompleteVisible) {
          setAutocompleteVisible(false);
        } else if (shouldKeepVisible) {
          // Update autocomplete to show suggestions even without current word
          updateAutocomplete(cursorPos, true);
        }
      }
    } else {
      // Reset navigation flag after a delay
      setTimeout(() => {
        isNavigatingAutocomplete.current = false;
      }, 100);
    }
  };
  
  // Handle cursor position changes (click, etc.)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const handleSelectionChange = () => {
      if (!isNavigatingAutocomplete.current) {
        const cursorPos = textarea.selectionStart;
        lastCursorPosition.current = cursorPos;
        const context = parseSQLContext(value, cursorPos);
        
        // Keep autocomplete visible in FROM context after table name
        const shouldKeepVisible = context.contextType === 'from' && context.tablesInQuery.length > 0;
        
        // Hide autocomplete if cursor moved to a position without a word and not after trigger
        // But keep it visible in FROM context with table
        if (context.currentWord.length === 0 && !context.isAfterTrigger && !context.whereColumn && !shouldKeepVisible && autocompleteVisible) {
          setAutocompleteVisible(false);
        } else if (shouldKeepVisible) {
          // Update autocomplete to show suggestions
          updateAutocomplete(cursorPos, true);
        }
      }
    };
    
    textarea.addEventListener('click', handleSelectionChange);
    textarea.addEventListener('keyup', (e) => {
      // Don't hide on arrow keys
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        handleSelectionChange();
      }
    });
    
    return () => {
      textarea.removeEventListener('click', handleSelectionChange);
    };
  }, [value, autocompleteVisible]);

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
              onChange={handleChange}
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
-- Start typing to see autocomplete suggestions

SELECT * FROM users WHERE email LIKE '%@example.com' LIMIT 10;"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        </div>
        
        {/* Autocomplete dropdown */}
        <AutocompleteDropdown
          suggestions={autocompleteSuggestions}
          selectedIndex={autocompleteSelectedIndex}
          onSelect={insertSuggestion}
          position={autocompletePosition}
          visible={autocompleteVisible}
        />
        
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

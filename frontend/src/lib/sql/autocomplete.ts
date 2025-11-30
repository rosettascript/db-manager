/**
 * SQL Autocomplete Service
 * 
 * Provides context-aware SQL autocomplete suggestions
 */

// Import SQL parser - lazy initialization to avoid blocking
let parser: any = null;
let parserInitPromise: Promise<any> | null = null;

// Initialize parser asynchronously (only once)
const initParser = (): Promise<any> => {
  if (parserInitPromise) {
    return parserInitPromise;
  }
  
  parserInitPromise = import('node-sql-parser')
    .then((sqlParser) => {
      try {
        const Parser = sqlParser.Parser || sqlParser.default?.Parser || sqlParser.default || sqlParser;
        if (Parser && typeof Parser === 'function') {
          parser = new Parser();
          return parser;
        }
        return null;
      } catch (e) {
        // Parser initialization failed - will fall back to regex parsing
        return null;
      }
    })
    .catch(() => {
      // Parser import failed - will fall back to regex parsing
      return null;
    });
  
  return parserInitPromise;
};

// Start initialization immediately (non-blocking)
initParser();

export interface AutocompleteSuggestion {
  label: string;
  insertText: string;
  kind: 'keyword' | 'table' | 'column' | 'function' | 'schema' | 'value';
  detail?: string;
}

export interface NormalizedTable {
  schema?: string;
  table: string;
  original: string;
}

export interface SQLContext {
  beforeCursor: string;
  afterCursor: string;
  currentWord: string;
  contextType: 'select' | 'from' | 'where' | 'join' | 'order' | 'group' | 'having' | 'insert' | 'update' | 'delete' | 'general';
  tablesInQuery: string[];
  normalizedTables?: NormalizedTable[]; // Normalized table info for easier matching
  currentSchema?: string;
  // For WHERE clause value suggestions
  whereColumn?: { schema: string; table: string; column: string };
  whereValuePrefix?: string; // The value being typed (inside quotes)
  // For INSERT VALUES context
  insertTable?: { schema: string; table: string };
  insertColumn?: { schema: string; table: string; column: string };
  insertValuePrefix?: string;
  // For UPDATE SET context
  updateTable?: { schema: string; table: string };
  updateColumn?: { schema: string; table: string; column: string };
  updateValuePrefix?: string;
  // Trigger information
  triggerCharacter?: string; // Character that triggered autocomplete (e.g., '.')
  isAfterTrigger?: boolean; // True if cursor is right after a trigger character
  // Alias information
  tableAliases?: Map<string, { schema: string; table: string }>; // alias -> table info
  // Function context
  inFunction?: { name: string; paramIndex?: number };
  // CTE information
  cteNames?: string[];
}

// SQL Keywords
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
  'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'ON',
  'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'DROP',
  'ALTER', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'UNIQUE', 'CHECK', 'DEFAULT',
  'UNION', 'ALL', 'DISTINCT', 'AS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'EXISTS', 'ANY', 'SOME', 'TRUE', 'FALSE', 'ISNULL', 'COALESCE', 'NULLIF',
  'CAST', 'EXTRACT', 'DATE', 'TIME', 'TIMESTAMP', 'INTERVAL',
  'WITH', 'RECURSIVE', 'RETURNING', 'USING', 'NATURAL', 'LATERAL',
  'ILIKE', 'SIMILAR', 'TO', 'ESCAPE', 'BETWEEN', 'AND', 'OR'
];

// SQL Functions
const SQL_FUNCTIONS = [
  { name: 'COUNT', signature: 'COUNT(*)', detail: 'Count rows' },
  { name: 'SUM', signature: 'SUM(column)', detail: 'Sum values' },
  { name: 'AVG', signature: 'AVG(column)', detail: 'Average values' },
  { name: 'MIN', signature: 'MIN(column)', detail: 'Minimum value' },
  { name: 'MAX', signature: 'MAX(column)', detail: 'Maximum value' },
  { name: 'CONCAT', signature: 'CONCAT(str1, str2)', detail: 'Concatenate strings' },
  { name: 'SUBSTRING', signature: 'SUBSTRING(str, start, length)', detail: 'Extract substring' },
  { name: 'TRIM', signature: 'TRIM(str)', detail: 'Trim whitespace' },
  { name: 'UPPER', signature: 'UPPER(str)', detail: 'Convert to uppercase' },
  { name: 'LOWER', signature: 'LOWER(str)', detail: 'Convert to lowercase' },
  { name: 'LENGTH', signature: 'LENGTH(str)', detail: 'String length' },
  { name: 'REPLACE', signature: 'REPLACE(str, old, new)', detail: 'Replace substring' },
  { name: 'ROUND', signature: 'ROUND(num, decimals)', detail: 'Round number' },
  { name: 'FLOOR', signature: 'FLOOR(num)', detail: 'Floor value' },
  { name: 'CEIL', signature: 'CEIL(num)', detail: 'Ceiling value' },
  { name: 'NOW', signature: 'NOW()', detail: 'Current timestamp' },
  { name: 'CURRENT_DATE', signature: 'CURRENT_DATE', detail: 'Current date' },
  { name: 'CURRENT_TIME', signature: 'CURRENT_TIME', detail: 'Current time' },
  { name: 'CURRENT_TIMESTAMP', signature: 'CURRENT_TIMESTAMP', detail: 'Current timestamp' },
  { name: 'COALESCE', signature: 'COALESCE(val1, val2, ...)', detail: 'Return first non-null value' },
  { name: 'NULLIF', signature: 'NULLIF(val1, val2)', detail: 'Return NULL if equal' },
  { name: 'CAST', signature: 'CAST(value AS type)', detail: 'Type cast' },
  { name: 'EXTRACT', signature: 'EXTRACT(field FROM date)', detail: 'Extract date part' },
  { name: 'DATE_TRUNC', signature: 'DATE_TRUNC(unit, date)', detail: 'Truncate date' },
  { name: 'TO_CHAR', signature: 'TO_CHAR(value, format)', detail: 'Format as string' },
];

/**
 * Try to parse SQL using AST parser (for complete/valid queries)
 * Falls back to regex parsing for incomplete queries
 */
function tryParseAST(query: string, cursorPosition: number): Partial<SQLContext> | null {
  // If parser is not initialized yet, return null to use regex fallback
  // The parser will be initialized asynchronously, so we gracefully fall back
  if (!parser) {
    // Try to initialize if not already in progress (non-blocking)
    if (!parserInitPromise) {
      initParser();
    }
    return null;
  }

  try {
    // Only try to parse if query looks somewhat complete
    // Don't parse if cursor is in the middle of a string literal
    const beforeCursor = query.substring(0, cursorPosition);
    const lastQuoteIndex = beforeCursor.lastIndexOf("'");
    const isInString = lastQuoteIndex !== -1 && (beforeCursor.match(/'/g) || []).length % 2 === 1;
    
    if (isInString) {
      return null; // Don't parse if inside string
    }

    // Try to parse the query up to cursor (add placeholder for incomplete parts)
    // For incomplete queries, try parsing just the part before cursor
    const queryToParse = query.substring(0, cursorPosition);
    
    // Skip parsing if query is too short or empty
    if (queryToParse.trim().length < 3) {
      return null;
    }
    
    const ast = parser.astify(queryToParse, { database: 'PostgreSQL' });
    
    // Extract information from AST
    const context: Partial<SQLContext> = {
      tablesInQuery: [],
      normalizedTables: [],
      tableAliases: new Map(),
      cteNames: [],
    };

    // Helper to extract table info from AST node
    const extractTableInfo = (tableNode: any): NormalizedTable | null => {
      if (!tableNode) return null;
      
      if (tableNode.table) {
        const tableName = tableNode.table;
        const schema = tableNode.db || tableNode.schema;
        const alias = tableNode.as;
        
        const normalized: NormalizedTable = {
          schema,
          table: tableName,
          original: schema ? `"${schema}"."${tableName}"` : `"${tableName}"`,
        };
        
        if (alias && context.tableAliases) {
          context.tableAliases.set(alias, { schema: schema || '', table: tableName });
        }
        
        return normalized;
      }
      return null;
    };

    // Process AST based on statement type
    if (Array.isArray(ast)) {
      // Multiple statements - process the last one (where cursor likely is)
      const lastStmt = ast[ast.length - 1];
      if (lastStmt) {
        processStatement(lastStmt, context, extractTableInfo);
      }
    } else if (ast) {
      processStatement(ast, context, extractTableInfo);
    }

    return context;
  } catch (error) {
    // Parser failed - query is incomplete or malformed
    // Fall back to regex parsing
    return null;
  }
}

function processStatement(
  stmt: any,
  context: Partial<SQLContext>,
  extractTableInfo: (node: any) => NormalizedTable | null
) {
  if (stmt.type === 'select') {
    // Process WITH clause (CTEs)
    if (stmt.with) {
      stmt.with.forEach((cte: any) => {
        if (cte.name) {
          context.cteNames = context.cteNames || [];
          context.cteNames.push(cte.name);
        }
      });
    }

    // Process FROM clause
    if (stmt.from) {
      const fromList = Array.isArray(stmt.from) ? stmt.from : [stmt.from];
      fromList.forEach((fromNode: any) => {
        const normalized = extractTableInfo(fromNode);
        if (normalized) {
          context.tablesInQuery = context.tablesInQuery || [];
          context.normalizedTables = context.normalizedTables || [];
          context.tablesInQuery.push(normalized.original);
          context.normalizedTables.push(normalized);
        }
      });
    }

    // Process JOIN clauses
    if (stmt.join) {
      const joinList = Array.isArray(stmt.join) ? stmt.join : [stmt.join];
      joinList.forEach((joinNode: any) => {
        const normalized = extractTableInfo(joinNode);
        if (normalized) {
          context.tablesInQuery = context.tablesInQuery || [];
          context.normalizedTables = context.normalizedTables || [];
          context.tablesInQuery.push(normalized.original);
          context.normalizedTables.push(normalized);
        }
      });
    }
  } else if (stmt.type === 'insert') {
    if (stmt.table) {
      const tableInfo = extractTableInfo(stmt.table);
      if (tableInfo) {
        context.insertTable = {
          schema: tableInfo.schema || '',
          table: tableInfo.table,
        };
      }
    }
  } else if (stmt.type === 'update') {
    if (stmt.table) {
      const tableInfo = extractTableInfo(stmt.table);
      if (tableInfo) {
        context.updateTable = {
          schema: tableInfo.schema || '',
          table: tableInfo.table,
        };
      }
    }
  }
}

/**
 * Parse SQL context from cursor position
 * Uses AST parser when possible, falls back to regex parsing
 * Note: This is synchronous for compatibility, but AST parsing happens asynchronously
 */
export function parseSQLContext(
  query: string,
  cursorPosition: number
): SQLContext {
  const beforeCursor = query.substring(0, cursorPosition);
  const afterCursor = query.substring(cursorPosition);
  
  // Try AST parsing first
  const astContext = tryParseAST(query, cursorPosition);
  
  // Extract current word - handle SQL identifiers with dots and quotes
  // Pattern 1: Quoted identifier like "schema"."table" or "table"."column"
  // Pattern 2: Unquoted identifier with dots like schema.table or schema.tab
  // Pattern 3: Simple word characters
  let currentWord = '';
  let triggerCharacter: string | undefined;
  let isAfterTrigger = false;
  
  // Check if we're right after a trigger character (like .)
  const charBeforeCursor = beforeCursor[beforeCursor.length - 1];
  if (charBeforeCursor === '.') {
    triggerCharacter = '.';
    isAfterTrigger = true;
    // When right after a dot, currentWord is empty - we'll show all relevant suggestions
    currentWord = '';
  } else {
    // Extract the current word being typed
    // Try to match quoted identifier with dot: "schema"."table" or "table"."column"
    const quotedWithDotMatch = beforeCursor.match(/"([^"]+)"\s*\.\s*"([^"]*)$/);
    if (quotedWithDotMatch) {
      // We're typing inside a quoted identifier after a dot
      currentWord = quotedWithDotMatch[2] || '';
    } else {
      // Try unquoted identifier with dot: schema.table or schema.tab
      const unquotedWithDotMatch = beforeCursor.match(/(\w+)\s*\.\s*(\w*)$/);
      if (unquotedWithDotMatch) {
        currentWord = unquotedWithDotMatch[2] || '';
        } else {
          // Check if cursor is right after whitespace FIRST (before trying simple quoted)
          // This handles cases like "FROM table " or 'FROM "table" ' where we want empty currentWord
          const endsWithWhitespace = beforeCursor.match(/\s+$/);
          if (endsWithWhitespace) {
            // Cursor is after whitespace - no current word
            currentWord = '';
          } else {
            // Try simple quoted identifier: "table or "schema
            // Only match if we're not after whitespace (already checked above)
            // Make sure we're actually inside quotes (not just a quote followed by space)
            const simpleQuotedMatch = beforeCursor.match(/"([^"]*)$/);
            if (simpleQuotedMatch && !simpleQuotedMatch[1]?.match(/^\s/)) {
              // Only use this match if the captured content doesn't start with whitespace
              // (which would indicate we're past the quote)
              currentWord = simpleQuotedMatch[1] || '';
            } else {
              // Fall back to simple word characters (alphanumeric and underscore)
              // Match word characters at the end, but trim whitespace first
              const trimmedBefore = beforeCursor.trimEnd();
              const wordMatch = trimmedBefore.match(/(\w+)$/);
              currentWord = wordMatch ? wordMatch[1]!.trim() : '';
            }
          }
        }
    }
  }
  
  // Determine context type
  let contextType: SQLContext['contextType'] = 'general';
  const upperBefore = beforeCursor.toUpperCase();
  
  if (upperBefore.match(/\bSELECT\b/)) {
    if (upperBefore.match(/\bFROM\b/)) {
      // Check for WHERE keyword (complete word with space after, not partial like "whe")
      // Use \s+ to ensure WHERE is complete and followed by space
      if (upperBefore.match(/\bWHERE\s+/)) {
        contextType = 'where';
      } else if (upperBefore.match(/\bJOIN\b/)) {
        contextType = 'join';
      } else {
        // Still in FROM clause - could be typing table name or keyword after table
        contextType = 'from';
      }
    } else {
      contextType = 'select';
    }
  } else if (upperBefore.match(/\bFROM\b/)) {
    // Only switch to 'where' if WHERE is a complete word with space
    if (upperBefore.match(/\bWHERE\s+/)) {
      contextType = 'where';
    } else {
      // Still in FROM clause
      contextType = 'from';
    }
  } else if (upperBefore.match(/\bWHERE\s+/)) {
    contextType = 'where';
  } else if (upperBefore.match(/\bJOIN\b/)) {
    contextType = 'join';
  } else if (upperBefore.match(/\bORDER\s+BY\b/)) {
    contextType = 'order';
  } else if (upperBefore.match(/\bGROUP\s+BY\b/)) {
    contextType = 'group';
  } else if (upperBefore.match(/\bHAVING\b/)) {
    contextType = 'having';
  } else if (upperBefore.match(/\bINSERT\b/)) {
    contextType = 'insert';
  } else if (upperBefore.match(/\bUPDATE\b/)) {
    contextType = 'update';
  } else if (upperBefore.match(/\bDELETE\b/)) {
    contextType = 'delete';
  }
  
  // Use AST context if available, otherwise use regex parsing
  let tablesInQuery: string[] = [];
  let normalizedTables: NormalizedTable[] = [];
  const tableAliases = astContext?.tableAliases || new Map();
  const cteNames = astContext?.cteNames || [];

  if (astContext?.tablesInQuery && astContext.tablesInQuery.length > 0) {
    // Use AST-parsed tables
    tablesInQuery = astContext.tablesInQuery;
    normalizedTables = astContext.normalizedTables || [];
  } else {
    // Fallback to regex parsing
    // Improved regex to match quoted identifiers like "schema"."table" or simple table names
    // Pattern matches: "schema"."table", "table", schema.table, or table
    const fromMatch = beforeCursor.match(/FROM\s+((?:"[^"]+"\s*\.\s*"[^"]+"|"[^"]+"|[\w.]+))/gi);
    const joinMatches = beforeCursor.match(/(?:JOIN|LEFT|RIGHT|INNER|FULL|CROSS)\s+((?:"[^"]+"\s*\.\s*"[^"]+"|"[^"]+"|[\w.]+))/gi);
    
    // Helper to normalize table identifier (remove quotes for matching)
    const normalizeTableName = (tableStr: string): NormalizedTable => {
      const original = tableStr.trim();
      // Check for quoted identifier: "schema"."table"
      const quotedMatch = original.match(/"([^"]+)"\s*\.\s*"([^"]+)"/);
      if (quotedMatch) {
        return { schema: quotedMatch[1], table: quotedMatch[2], original };
      }
      // Check for single quoted: "table"
      const singleQuotedMatch = original.match(/"([^"]+)"/);
      if (singleQuotedMatch) {
        return { table: singleQuotedMatch[1], original };
      }
      // Check for unquoted with dot: schema.table
      const unquotedMatch = original.match(/(\w+)\s*\.\s*(\w+)/);
      if (unquotedMatch) {
        return { schema: unquotedMatch[1], table: unquotedMatch[2], original };
      }
      // Simple unquoted table name
      return { table: original, original };
    };
    
    if (fromMatch) {
      fromMatch.forEach(m => {
        // Extract table name - the regex already captures just the table identifier
        // Remove "FROM " prefix and trim
        let table = m.replace(/FROM\s+/i, '').trim();
        // The regex captures the full table identifier, so we should have the complete table name
        // But we need to handle cases where there might be text after (like "FROM table w")
        // Split by whitespace to get just the table name part
        const tableParts = table.split(/\s+/);
        if (tableParts.length > 0) {
          table = tableParts[0]!.trim();
          if (table) {
            tablesInQuery.push(table);
          }
        }
      });
    }
    if (joinMatches) {
      joinMatches.forEach(m => {
        const table = m.replace(/(?:JOIN|LEFT|RIGHT|INNER|FULL|CROSS)\s+/i, '').trim();
        if (table) tablesInQuery.push(table);
      });
    }
    
    // Store normalized table info for easier matching
    normalizedTables = tablesInQuery.map(normalizeTableName);
  }

  // Detect if we're typing a value in WHERE clause (after column = 'value)
  let whereColumn: { schema: string; table: string; column: string } | undefined;
  let whereValuePrefix: string | undefined;
  
  if (contextType === 'where') {
    // First check if we're inside quotes (typing a value)
    const lastQuoteIndex = beforeCursor.lastIndexOf("'");
    const isInsideQuotes = lastQuoteIndex !== -1;
    
    if (isInsideQuotes) {
      // Extract the text after the last quote (what user is typing)
      whereValuePrefix = beforeCursor.substring(lastQuoteIndex + 1);
      
      // Now find the column reference before the = sign
      // Look backwards from the quote to find the column = pattern
      const textBeforeQuote = beforeCursor.substring(0, lastQuoteIndex);
      
      // Try different patterns to match column references
      // Pattern 1: "schema"."table"."column" = 
      let match = textBeforeQuote.match(/"([^"]+)"\."([^"]+)"\."([^"]+)"\s*=\s*$/i);
      if (match) {
        whereColumn = {
          schema: match[1]!,
          table: match[2]!,
          column: match[3]!,
        };
      } else {
        // Pattern 2: "table"."column" = 
        match = textBeforeQuote.match(/"([^"]+)"\."([^"]+)"\s*=\s*$/i);
        if (match) {
          // Find schema from FROM clause or normalized tables
          const schema = normalizedTables.find(t => t.table === match![1])?.schema;
          if (schema) {
            whereColumn = {
              schema,
              table: match[1]!,
              column: match[2]!,
            };
          }
        } else {
          // Pattern 3: "column" = 
          match = textBeforeQuote.match(/"([^"]+)"\s*=\s*$/i);
          if (match && normalizedTables.length > 0) {
            // Use first table from query
            const firstTable = normalizedTables[0]!;
            whereColumn = {
              schema: firstTable.schema || '',
              table: firstTable.table,
              column: match[1]!,
            };
          }
        }
      }
    }
  }

  // Detect INSERT VALUES context
  let insertTable: { schema: string; table: string } | undefined;
  let insertColumn: { schema: string; table: string; column: string } | undefined;
  let insertValuePrefix: string | undefined;

  if (contextType === 'insert') {
    // Check if we have table info from AST
    if (astContext?.insertTable) {
      insertTable = astContext.insertTable;
    } else {
      // Fallback to regex
      const insertMatch = beforeCursor.match(/INSERT\s+INTO\s+"([^"]+)"\."([^"]+)"/i) ||
                         beforeCursor.match(/INSERT\s+INTO\s+"([^"]+)"/i);
      if (insertMatch) {
        insertTable = {
          schema: insertMatch[2] || '',
          table: insertMatch[1] || insertMatch[1]!,
        };
      }
    }

    // Check if we're typing a value in VALUES clause
    const valuesMatch = beforeCursor.match(/VALUES\s*\(/i);
    if (valuesMatch) {
      const lastQuoteIndex = beforeCursor.lastIndexOf("'");
      const isInsideQuotes = lastQuoteIndex !== -1;
      if (isInsideQuotes) {
        insertValuePrefix = beforeCursor.substring(lastQuoteIndex + 1);
      }
    }
  }

  // Detect UPDATE SET context
  let updateTable: { schema: string; table: string } | undefined;
  let updateColumn: { schema: string; table: string; column: string } | undefined;
  let updateValuePrefix: string | undefined;

  if (contextType === 'update') {
    // Check if we have table info from AST
    if (astContext?.updateTable) {
      updateTable = astContext.updateTable;
    } else {
      // Fallback to regex
      const updateMatch = beforeCursor.match(/UPDATE\s+"([^"]+)"\."([^"]+)"/i) ||
                         beforeCursor.match(/UPDATE\s+"([^"]+)"/i);
      if (updateMatch) {
        updateTable = {
          schema: updateMatch[2] || '',
          table: updateMatch[1] || updateMatch[1]!,
        };
      }
    }

    // Check if we're typing a value in SET clause
    if (beforeCursor.match(/\bSET\b/i)) {
      const lastQuoteIndex = beforeCursor.lastIndexOf("'");
      const isInsideQuotes = lastQuoteIndex !== -1;
      if (isInsideQuotes) {
        updateValuePrefix = beforeCursor.substring(lastQuoteIndex + 1);
        
        // Find column before = sign
        const textBeforeQuote = beforeCursor.substring(0, lastQuoteIndex);
        const columnMatch = textBeforeQuote.match(/"([^"]+)"\s*=\s*$/i);
        if (columnMatch && updateTable) {
          updateColumn = {
            schema: updateTable.schema,
            table: updateTable.table,
            column: columnMatch[1]!,
          };
        }
      }
    }
  }

  // Detect function context
  let inFunction: { name: string; paramIndex?: number } | undefined;
  const functionMatch = beforeCursor.match(/(\w+)\s*\([^)]*$/i);
  if (functionMatch) {
    const funcName = functionMatch[1]!.toUpperCase();
    if (SQL_FUNCTIONS.some(f => f.name === funcName)) {
      // Count commas to determine parameter index
      const paramsText = beforeCursor.substring(functionMatch.index! + functionMatch[0]!.length - 1);
      const commaCount = (paramsText.match(/,/g) || []).length;
      inFunction = { name: funcName, paramIndex: commaCount };
    }
  }
  
  return {
    beforeCursor,
    afterCursor,
    currentWord,
    contextType,
    tablesInQuery: tablesInQuery.length > 0 ? tablesInQuery : (() => {
      // Fallback to regex parsing if AST didn't provide tables
      const fromMatch = beforeCursor.match(/FROM\s+([\w."]+)/gi);
      const joinMatches = beforeCursor.match(/(?:JOIN|LEFT|RIGHT|INNER|FULL|CROSS)\s+([\w."]+)/gi);
      const result: string[] = [];
      if (fromMatch) {
        fromMatch.forEach(m => {
          const table = m.replace(/FROM\s+/i, '').trim();
          if (table) result.push(table);
        });
      }
      if (joinMatches) {
        joinMatches.forEach(m => {
          const table = m.replace(/(?:JOIN|LEFT|RIGHT|INNER|FULL|CROSS)\s+/i, '').trim();
          if (table) result.push(table);
        });
      }
      return result;
    })(),
    normalizedTables: normalizedTables.length > 0 ? normalizedTables : (() => {
      // Fallback to regex parsing
      const result: NormalizedTable[] = [];
      const fromMatch = beforeCursor.match(/FROM\s+([\w."]+)/gi);
      const joinMatches = beforeCursor.match(/(?:JOIN|LEFT|RIGHT|INNER|FULL|CROSS)\s+([\w."]+)/gi);
      
      const normalizeTableName = (tableStr: string): NormalizedTable => {
        const original = tableStr.trim();
        const quotedMatch = original.match(/"([^"]+)"\s*\.\s*"([^"]+)"/);
        if (quotedMatch) {
          return { schema: quotedMatch[1], table: quotedMatch[2], original };
        }
        const singleQuotedMatch = original.match(/"([^"]+)"/);
        if (singleQuotedMatch) {
          return { table: singleQuotedMatch[1], original };
        }
        const unquotedMatch = original.match(/(\w+)\s*\.\s*(\w+)/);
        if (unquotedMatch) {
          return { schema: unquotedMatch[1], table: unquotedMatch[2], original };
        }
        return { table: original, original };
      };
      
      if (fromMatch) {
        fromMatch.forEach(m => {
          const table = m.replace(/FROM\s+/i, '').trim();
          if (table) result.push(normalizeTableName(table));
        });
      }
      if (joinMatches) {
        joinMatches.forEach(m => {
          const table = m.replace(/(?:JOIN|LEFT|RIGHT|INNER|FULL|CROSS)\s+/i, '').trim();
          if (table) result.push(normalizeTableName(table));
        });
      }
      return result;
    })(),
    whereColumn,
    whereValuePrefix,
    insertTable,
    insertColumn,
    insertValuePrefix,
    updateTable,
    updateColumn,
    updateValuePrefix,
    triggerCharacter,
    isAfterTrigger,
    tableAliases,
    inFunction,
    cteNames,
  };
}

/**
 * Get autocomplete suggestions based on context
 */
export function getAutocompleteSuggestions(
  context: SQLContext,
  tables: Array<{ name: string; schema: string; columns?: Array<{ name: string; type: string }> }>,
  schemas?: string[]
): AutocompleteSuggestion[] {
  const suggestions: AutocompleteSuggestion[] = [];
  const currentWordUpper = context.currentWord.toUpperCase();
  
  // Filter by current word if typing
  // If after a trigger character (like .), show all relevant suggestions
  // Also show all suggestions in WHERE/ORDER/GROUP/HAVING if no word typed (user just started typing)
  // Also show all suggestions in FROM context after table name (for WHERE, JOIN, etc.)
  const filterMatches = (text: string) => {
    if (context.isAfterTrigger && context.triggerCharacter === '.') {
      // After a dot, show all suggestions (user is starting a new identifier)
      return true;
    }
    // In FROM context after a table name, show keyword suggestions
    if (context.contextType === 'from' && context.tablesInQuery.length > 0) {
      // Always show keywords in FROM context after table - filter by prefix if typing
      const textUpper = text.toUpperCase();
      // If no current word, show all keywords
      if (!context.currentWord || context.currentWord.trim().length === 0) {
        return true;
      }
      // If typing, show keywords that start with the current word (case-insensitive)
      // Trim currentWord to handle any whitespace issues
      const trimmedCurrentWord = context.currentWord.trim();
      const trimmedCurrentWordUpper = trimmedCurrentWord.toUpperCase();
      return textUpper.startsWith(trimmedCurrentWordUpper);
    }
    // In WHERE/ORDER/GROUP/HAVING context, show all suggestions if no word typed yet
    // This helps when user just typed WHERE and wants to see column suggestions
    if (!context.currentWord && (context.contextType === 'where' || context.contextType === 'order' || 
        context.contextType === 'group' || context.contextType === 'having')) {
      return true;
    }
    if (!context.currentWord || context.currentWord.trim().length === 0) return true;
    // Trim currentWord to handle any whitespace issues
    const trimmedCurrentWord = context.currentWord.trim();
    return text.toUpperCase().startsWith(trimmedCurrentWord.toUpperCase());
  };
  
  // Handle function context - suggest columns when inside function
  if (context.inFunction) {
    // We're inside a function - suggest columns
    if (context.tablesInQuery.length > 0 && context.normalizedTables && context.normalizedTables.length > 0) {
      tables.forEach(table => {
        const matches = context.normalizedTables!.some(normalized => {
          const tableNameMatch = normalized.table.toLowerCase() === table.name.toLowerCase();
          if (normalized.schema && table.schema) {
            return tableNameMatch && normalized.schema.toLowerCase() === table.schema.toLowerCase();
          }
          return tableNameMatch;
        });
        
        if (matches) {
          table.columns?.forEach(column => {
            if (filterMatches(column.name)) {
              const tableName = table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
              const columnRef = context.tablesInQuery.length > 1 
                ? `${tableName}.${column.name}`
                : column.name;
              suggestions.push({
                label: column.name,
                insertText: `"${columnRef}"`,
                kind: 'column',
                detail: `${column.type} (${table.name})`,
              });
            }
          });
        }
      });
    }
  }

  switch (context.contextType) {
    case 'select':
      // Suggest columns, functions, keywords, CTEs
      // CTEs first (if available)
      if (context.cteNames && context.cteNames.length > 0) {
        context.cteNames.forEach(cteName => {
          if (filterMatches(cteName)) {
            suggestions.push({
              label: cteName,
              insertText: cteName,
              kind: 'table',
              detail: 'CTE',
            });
          }
        });
      }

      // Then functions (if not already in a function)
      if (!context.inFunction) {
        SQL_FUNCTIONS.forEach(func => {
          if (filterMatches(func.name)) {
            suggestions.push({
              label: func.signature,
              insertText: func.name + '(',
              kind: 'function',
              detail: func.detail,
            });
          }
        });
      }
      
      // Then columns from tables
      if (context.tablesInQuery.length > 0 && context.normalizedTables && context.normalizedTables.length > 0) {
        tables.forEach(table => {
          const matches = context.normalizedTables!.some(normalized => {
            const tableNameMatch = normalized.table.toLowerCase() === table.name.toLowerCase();
            if (normalized.schema && table.schema) {
              return tableNameMatch && normalized.schema.toLowerCase() === table.schema.toLowerCase();
            }
            return tableNameMatch;
          });
          
          if (matches) {
            table.columns?.forEach(column => {
              if (filterMatches(column.name)) {
                // Use alias if available
                let tableRef = table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
                // Check if table has an alias
                for (const [alias, aliasInfo] of (context.tableAliases || new Map()).entries()) {
                  if (aliasInfo.table === table.name && 
                      (!aliasInfo.schema || aliasInfo.schema === table.schema)) {
                    tableRef = alias;
                    break;
                  }
                }
                const columnRef = context.tablesInQuery.length > 1 
                  ? `${tableRef}.${column.name}`
                  : column.name;
                suggestions.push({
                  label: column.name,
                  insertText: `"${columnRef}"`,
                  kind: 'column',
                  detail: `${column.type} (${table.name})`,
                });
              }
            });
          }
        });
      }
      
      // Add DISTINCT, * keywords
      if (filterMatches('DISTINCT')) {
        suggestions.push({ label: 'DISTINCT', insertText: 'DISTINCT ', kind: 'keyword' });
      }
      if (filterMatches('*')) {
        suggestions.push({ label: '*', insertText: '*', kind: 'keyword' });
      }
      break;
      
    case 'from':
      // If there's already a table in the query, we're likely typing a keyword for the next clause
      if (context.tablesInQuery.length > 0) {
        // Suggest keywords for next clause (WHERE, JOIN, etc.)
        // In FROM context with a table, always show keywords (filterMatches handles the filtering)
        const nextClauseKeywords = ['WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT'];
        nextClauseKeywords.forEach(keyword => {
          // Always include keywords in FROM context after table - filterMatches will handle matching
          if (filterMatches(keyword)) {
            suggestions.push({
              label: keyword,
              insertText: keyword + ' ',
              kind: 'keyword',
            });
          }
        });
      }
      
      // Also suggest tables and schemas (in case user wants to add another table or is still typing table name)
      if (schemas) {
        schemas.forEach(schema => {
          if (filterMatches(schema)) {
            suggestions.push({
              label: schema,
              insertText: `"${schema}".`,
              kind: 'schema',
              detail: 'Schema',
            });
          }
        });
      }
      
      tables.forEach(table => {
        const tableName = table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
        // Match by table name or schema.table
        const matchesTableName = filterMatches(table.name);
        const matchesSchemaTable = table.schema && filterMatches(table.schema + '.' + table.name);
        if (matchesTableName || matchesSchemaTable) {
          // In FROM context, always add a space after table name to enable keyword suggestions
          // This makes it consistent with keyword suggestions and helps trigger autocomplete
          suggestions.push({
            label: tableName,
            insertText: tableName + ' ',
            kind: 'table',
            detail: `${table.columns?.length || 0} columns`,
          });
        }
      });
      break;
      
    case 'join':
      // Suggest tables and schemas for JOIN
      if (schemas) {
        schemas.forEach(schema => {
          if (filterMatches(schema)) {
            suggestions.push({
              label: schema,
              insertText: `"${schema}".`,
              kind: 'schema',
              detail: 'Schema',
            });
          }
        });
      }
      
      tables.forEach(table => {
        const tableName = table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
        if (filterMatches(table.name) || filterMatches(table.schema + '.' + table.name)) {
          suggestions.push({
            label: tableName,
            insertText: tableName,
            kind: 'table',
            detail: `${table.columns?.length || 0} columns`,
          });
        }
      });
      break;
      
    case 'where':
    case 'order':
    case 'group':
    case 'having':
      // Suggest columns from tables in query (with alias support)
      if (context.tablesInQuery.length > 0 && context.normalizedTables && context.normalizedTables.length > 0) {
        tables.forEach(table => {
          // Check if this table matches any table in the query
          const matches = context.normalizedTables!.some(normalized => {
            const tableNameMatch = normalized.table.toLowerCase() === table.name.toLowerCase();
            if (normalized.schema && table.schema) {
              return tableNameMatch && normalized.schema.toLowerCase() === table.schema.toLowerCase();
            }
            return tableNameMatch;
          });
          
          if (matches) {
            table.columns?.forEach(column => {
              if (filterMatches(column.name)) {
                // Use alias if available
                let tableRef = table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
                for (const [alias, aliasInfo] of (context.tableAliases || new Map()).entries()) {
                  if (aliasInfo.table === table.name && 
                      (!aliasInfo.schema || aliasInfo.schema === table.schema)) {
                    tableRef = alias;
                    break;
                  }
                }
                const columnRef = context.tablesInQuery.length > 1 
                  ? `${tableRef}.${column.name}`
                  : column.name;
                suggestions.push({
                  label: column.name,
                  insertText: `"${columnRef}"`,
                  kind: 'column',
                  detail: `${column.type} (${table.name})`,
                });
              }
            });
          }
        });
      } else if (context.tablesInQuery.length === 0) {
        // No tables in query yet, but we're in WHERE context
        tables.forEach(table => {
          table.columns?.forEach(column => {
            if (filterMatches(column.name)) {
              const tableName = table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
              suggestions.push({
                label: column.name,
                insertText: `"${tableName}.${column.name}"`,
                kind: 'column',
                detail: `${column.type} (${table.name})`,
              });
            }
          });
        });
      }
      
      // Always suggest comparison operators and keywords in WHERE context
      if (filterMatches('=')) {
        suggestions.push({ label: '=', insertText: '= ', kind: 'keyword' });
      }
      if (filterMatches('LIKE')) {
        suggestions.push({ label: 'LIKE', insertText: 'LIKE ', kind: 'keyword' });
      }
      if (filterMatches('IN')) {
        suggestions.push({ label: 'IN', insertText: 'IN ', kind: 'keyword' });
      }
      break;

    case 'insert':
      // If we have table info, suggest columns
      if (context.insertTable) {
        tables.forEach(table => {
          if (table.name.toLowerCase() === context.insertTable!.table.toLowerCase() &&
              (!context.insertTable!.schema || table.schema === context.insertTable!.schema)) {
            table.columns?.forEach(column => {
              if (filterMatches(column.name)) {
                suggestions.push({
                  label: column.name,
                  insertText: `"${column.name}"`,
                  kind: 'column',
                  detail: `${column.type}`,
                });
              }
            });
          }
        });
      } else {
        // No table selected yet - suggest tables
        if (schemas) {
          schemas.forEach(schema => {
            if (filterMatches(schema)) {
              suggestions.push({
                label: schema,
                insertText: `"${schema}".`,
                kind: 'schema',
                detail: 'Schema',
              });
            }
          });
        }
        tables.forEach(table => {
          const tableName = table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
          if (filterMatches(table.name) || filterMatches(table.schema + '.' + table.name)) {
            suggestions.push({
              label: tableName,
              insertText: tableName,
              kind: 'table',
              detail: `${table.columns?.length || 0} columns`,
            });
          }
        });
      }
      
      // Suggest VALUES keyword
      if (filterMatches('VALUES')) {
        suggestions.push({ label: 'VALUES', insertText: 'VALUES ', kind: 'keyword' });
      }
      break;

    case 'update':
      // If we have table info, suggest columns
      if (context.updateTable) {
        tables.forEach(table => {
          if (table.name.toLowerCase() === context.updateTable!.table.toLowerCase() &&
              (!context.updateTable!.schema || table.schema === context.updateTable!.schema)) {
            table.columns?.forEach(column => {
              if (filterMatches(column.name)) {
                suggestions.push({
                  label: column.name,
                  insertText: `"${column.name}"`,
                  kind: 'column',
                  detail: `${column.type}`,
                });
              }
            });
          }
        });
      } else {
        // No table selected yet - suggest tables
        if (schemas) {
          schemas.forEach(schema => {
            if (filterMatches(schema)) {
              suggestions.push({
                label: schema,
                insertText: `"${schema}".`,
                kind: 'schema',
                detail: 'Schema',
              });
            }
          });
        }
        tables.forEach(table => {
          const tableName = table.schema ? `"${table.schema}"."${table.name}"` : `"${table.name}"`;
          if (filterMatches(table.name) || filterMatches(table.schema + '.' + table.name)) {
            suggestions.push({
              label: tableName,
              insertText: tableName,
              kind: 'table',
              detail: `${table.columns?.length || 0} columns`,
            });
          }
        });
      }
      
      // Suggest SET keyword
      if (filterMatches('SET')) {
        suggestions.push({ label: 'SET', insertText: 'SET ', kind: 'keyword' });
      }
      break;
      
    default:
      // General context - suggest keywords
      break;
  }
  
  // Always suggest keywords
  SQL_KEYWORDS.forEach(keyword => {
    if (filterMatches(keyword) && !suggestions.some(s => s.label === keyword)) {
      suggestions.push({
        label: keyword,
        insertText: keyword + ' ',
        kind: 'keyword',
      });
    }
  });
  
  // Score and rank suggestions by relevance
  const scoredSuggestions = suggestions.map(suggestion => {
    let score = 0;
    const wordUpper = context.currentWord.toUpperCase();
    const labelUpper = suggestion.label.toUpperCase();
    
    // Base score by kind (context-dependent)
    switch (context.contextType) {
      case 'select':
        if (suggestion.kind === 'function') score += 100;
        else if (suggestion.kind === 'column') score += 80;
        else if (suggestion.kind === 'keyword') score += 60;
        else if (suggestion.kind === 'table') score += 40; // CTEs
        break;
      case 'from':
      case 'join':
        if (suggestion.kind === 'table') score += 100;
        else if (suggestion.kind === 'schema') score += 80;
        else if (suggestion.kind === 'keyword') score += 60;
        break;
      case 'where':
      case 'order':
      case 'group':
      case 'having':
        if (suggestion.kind === 'column') score += 100;
        else if (suggestion.kind === 'keyword') score += 70;
        else if (suggestion.kind === 'value') score += 90; // Values are high priority in WHERE
        break;
      case 'insert':
        if (suggestion.kind === 'column') score += 100;
        else if (suggestion.kind === 'table') score += 80;
        else if (suggestion.kind === 'keyword') score += 60;
        else if (suggestion.kind === 'value') score += 90;
        break;
      case 'update':
        if (suggestion.kind === 'column') score += 100;
        else if (suggestion.kind === 'table') score += 80;
        else if (suggestion.kind === 'keyword') score += 60;
        else if (suggestion.kind === 'value') score += 90;
        break;
      default:
        // General context
        if (suggestion.kind === 'keyword') score += 80;
        else if (suggestion.kind === 'function') score += 70;
        else if (suggestion.kind === 'table') score += 60;
        else if (suggestion.kind === 'column') score += 50;
    }
    
    // Boost for exact match
    if (wordUpper && labelUpper === wordUpper) {
      score += 50;
    }
    // Boost for prefix match
    else if (wordUpper && labelUpper.startsWith(wordUpper)) {
      score += 30;
    }
    // Boost for contains match
    else if (wordUpper && labelUpper.includes(wordUpper)) {
      score += 10;
    }
    
    // Boost if suggestion is from a table in the query
    if (suggestion.kind === 'column' && context.tablesInQuery.length > 0) {
      score += 20;
    }
    
    // Boost for CTEs in SELECT context
    if (suggestion.kind === 'table' && context.cteNames?.includes(suggestion.label)) {
      score += 30;
    }
    
    // Boost for aliases
    if (context.tableAliases?.has(suggestion.label)) {
      score += 25;
    }
    
    return { suggestion, score };
  });
  
  // Sort by score (descending), then by kind, then alphabetically
  const kindOrder = { keyword: 0, function: 1, schema: 2, table: 3, column: 4, value: 5 };
  scoredSuggestions.sort((a, b) => {
    // First by score
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    // Then by kind order
    const kindDiff = (kindOrder[a.suggestion.kind] || 99) - (kindOrder[b.suggestion.kind] || 99);
    if (kindDiff !== 0) return kindDiff;
    // Finally alphabetically
    return a.suggestion.label.localeCompare(b.suggestion.label);
  });
  
  // Return top suggestions (limit to 50)
  return scoredSuggestions.slice(0, 50).map(item => item.suggestion);
}


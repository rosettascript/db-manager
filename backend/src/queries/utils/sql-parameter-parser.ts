/**
 * SQL Parameter Parser
 * 
 * Parses parameters from SQL queries in various formats:
 * - Named parameters: :paramName, $paramName
 * - Positional parameters: ?
 */

export interface ParsedParameter {
  name: string;
  index: number;
  originalText: string;
  startIndex: number;
  endIndex: number;
}

export interface ParsedQuery {
  query: string;
  parameters: ParsedParameter[];
  parameterizedQuery: string; // Query with parameters replaced by PostgreSQL placeholders ($1, $2, etc.)
}

/**
 * Parse SQL parameters from query
 * Supports multiple formats:
 * - :paramName (PostgreSQL-style named parameters)
 * - $paramName (dollar-sign named parameters)
 * - ? (positional parameters)
 */
export function parseSQLParameters(query: string): ParsedQuery {
  const parameters: ParsedParameter[] = [];
  let parameterizedQuery = query;
  let paramIndex = 1;
  let offset = 0; // Track offset for string replacements

  // Track positions to replace in reverse order (to preserve indices)
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];

  // Pattern 1: Named parameters with colon (:paramName)
  // Match :paramName but not :: (cast operator) or :'string' (quoted string)
  const colonParamRegex = /(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let match;
  
  while ((match = colonParamRegex.exec(query)) !== null) {
    const paramName = match[1];
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;
    
    // Check if this is already in our parameters list
    const existingParam = parameters.find(p => p.name === paramName);
    
    if (existingParam) {
      // Use same index as existing parameter
      replacements.push({
        start: startIndex,
        end: endIndex,
        replacement: `$${existingParam.index}`,
      });
    } else {
      // New parameter
      parameters.push({
        name: paramName,
        index: paramIndex,
        originalText: match[0],
        startIndex,
        endIndex,
      });
      replacements.push({
        start: startIndex,
        end: endIndex,
        replacement: `$${paramIndex}`,
      });
      paramIndex++;
    }
  }

  // Pattern 2: Dollar-sign named parameters ($paramName)
  // Match $paramName but not $1, $2 (PostgreSQL positional params) or $$ (dollar quoting)
  const dollarParamRegex = /\$(?!\d+|\$)([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  
  while ((match = dollarParamRegex.exec(query)) !== null) {
    const paramName = match[1];
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;
    
    // Check if this is already in our parameters list
    const existingParam = parameters.find(p => p.name === paramName);
    
    if (existingParam) {
      // Use same index as existing parameter
      replacements.push({
        start: startIndex,
        end: endIndex,
        replacement: `$${existingParam.index}`,
      });
    } else {
      // New parameter
      parameters.push({
        name: paramName,
        index: paramIndex,
        originalText: match[0],
        startIndex,
        endIndex,
      });
      replacements.push({
        start: startIndex,
        end: endIndex,
        replacement: `$${paramIndex}`,
      });
      paramIndex++;
    }
  }

  // Pattern 3: Positional parameters (?)
  // Match ? but not ?? (nullish coalescing) and not inside strings
  const positionalRegex = /\?/g;
  
  while ((match = positionalRegex.exec(query)) !== null) {
    const startIndex = match.index;
    const endIndex = match.index + 1;
    
    // Check if we're inside a string literal (simple check)
    const beforeMatch = query.substring(0, startIndex);
    const singleQuotesBefore = (beforeMatch.match(/'/g) || []).length;
    const doubleQuotesBefore = (beforeMatch.match(/"/g) || []).length;
    
    // Skip if inside a string (odd number of quotes before it)
    if (singleQuotesBefore % 2 !== 0 || doubleQuotesBefore % 2 !== 0) {
      continue;
    }
    
    replacements.push({
      start: startIndex,
      end: endIndex,
      replacement: `$${paramIndex}`,
    });
    
    parameters.push({
      name: `?${paramIndex}`,
      index: paramIndex,
      originalText: '?',
      startIndex,
      endIndex,
    });
    
    paramIndex++;
  }

  // Sort replacements by start index (descending) to replace from end to start
  replacements.sort((a, b) => b.start - a.start);

  // Apply replacements to create parameterized query
  let modifiedQuery = query;
  for (const replacement of replacements) {
    modifiedQuery =
      modifiedQuery.substring(0, replacement.start) +
      replacement.replacement +
      modifiedQuery.substring(replacement.end);
  }

  return {
    query,
    parameters,
    parameterizedQuery: modifiedQuery,
  };
}

/**
 * Build parameter values array from parameter map
 * Returns values in the order they appear in the query (by parameter index)
 */
export function buildParameterValues(
  parameters: ParsedParameter[],
  parameterValues: Record<string, any>
): any[] {
  // Sort parameters by index
  const sortedParams = [...parameters].sort((a, b) => a.index - b.index);
  
  return sortedParams.map((param) => {
    // For positional parameters (named ?1, ?2, etc.), extract index
    if (param.name.startsWith('?')) {
      const index = parseInt(param.name.substring(1), 10);
      // For positional, check if there's a positional array
      if (Array.isArray(parameterValues)) {
        return parameterValues[index - 1];
      }
      // Check multiple possible key formats for positional parameters
      return parameterValues[param.name] ?? 
             parameterValues[`?${index}`] ?? 
             parameterValues[index];
    }
    
    // For named parameters, look up by name
    return parameterValues[param.name];
  });
}

/**
 * Validate that all required parameters have values
 */
export function validateParameters(
  parameters: ParsedParameter[],
  parameterValues: Record<string, any>
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  for (const param of parameters) {
    let hasValue = false;
    
    if (param.name.startsWith('?')) {
      const index = parseInt(param.name.substring(1), 10);
      if (Array.isArray(parameterValues)) {
        hasValue = parameterValues[index - 1] !== undefined;
    } else {
      // Check for positional parameter by key `?1`, `?2`, etc. or by index number
      hasValue = 
        parameterValues[`?${index}`] !== undefined ||
        parameterValues[index] !== undefined ||
        (parameterValues[param.name] !== undefined && parameterValues[param.name] !== null);
    }
    } else {
      // For named parameters, check if it exists and is not null (but allow empty string)
      hasValue = 
        param.name in parameterValues && 
        parameterValues[param.name] !== undefined && 
        parameterValues[param.name] !== null;
    }
    
    if (!hasValue) {
      missing.push(param.name);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}


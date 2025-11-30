/**
 * SQL Parameter Parser (Frontend)
 * 
 * Parses parameters from SQL queries for UI display and form generation.
 * Supports multiple formats: :param, $param, ?
 */

export interface SQLParameter {
  name: string;
  index: number;
  originalText: string;
  startIndex: number;
  endIndex: number;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'unknown';
}

export interface ParsedSQLParameters {
  parameters: SQLParameter[];
  hasParameters: boolean;
}

/**
 * Infer parameter type from context or default to 'string'
 */
function inferParameterType(
  query: string,
  paramStart: number,
  paramEnd: number
): SQLParameter['type'] {
  // Look at surrounding context to infer type
  const before = query.substring(Math.max(0, paramStart - 20), paramStart).toLowerCase();
  const after = query.substring(paramEnd, Math.min(query.length, paramEnd + 20)).toLowerCase();

  // Check for date/time context
  if (
    before.includes('date') ||
    before.includes('timestamp') ||
    before.includes('time') ||
    after.includes('::date') ||
    after.includes('::timestamp')
  ) {
    return 'date';
  }

  // Check for boolean context
  if (
    before.includes('is ') ||
    before.includes('has ') ||
    after.includes('= true') ||
    after.includes('= false')
  ) {
    return 'boolean';
  }

  // Check for numeric context
  if (
    before.includes('count') ||
    before.includes('sum') ||
    before.includes('avg') ||
    before.includes('id') ||
    before.includes('limit') ||
    after.includes('::int') ||
    after.includes('::numeric')
  ) {
    return 'number';
  }

  return 'string';
}

/**
 * Parse SQL parameters from query string
 * Returns unique parameters with their positions
 */
export function parseSQLParameters(query: string): ParsedSQLParameters {
  const parameters: SQLParameter[] = [];
  const seenParams = new Map<string, SQLParameter>();
  let paramIndex = 1;

  // Pattern 1: Named parameters with colon (:paramName)
  // Match :paramName but not :: (cast operator)
  const colonParamRegex = /(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  let match;

  while ((match = colonParamRegex.exec(query)) !== null) {
    const paramName = match[1];
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;

    // Only add if not already seen
    if (!seenParams.has(`:${paramName}`)) {
      const param: SQLParameter = {
        name: paramName,
        index: paramIndex++,
        originalText: match[0],
        startIndex,
        endIndex,
        type: inferParameterType(query, startIndex, endIndex),
      };
      parameters.push(param);
      seenParams.set(`:${paramName}`, param);
    }
  }

  // Pattern 2: Dollar-sign named parameters ($paramName)
  // Match $paramName but not $1, $2 (PostgreSQL positional) or $$ (dollar quoting)
  const dollarParamRegex = /\$(?!\d+|\$)([a-zA-Z_][a-zA-Z0-9_]*)\b/g;

  while ((match = dollarParamRegex.exec(query)) !== null) {
    const paramName = match[1];
    const startIndex = match.index;
    const endIndex = match.index + match[0].length;

    // Only add if not already seen
    if (!seenParams.has(`$${paramName}`)) {
      const param: SQLParameter = {
        name: paramName,
        index: paramIndex++,
        originalText: match[0],
        startIndex,
        endIndex,
        type: inferParameterType(query, startIndex, endIndex),
      };
      parameters.push(param);
      seenParams.set(`$${paramName}`, param);
    }
  }

  // Pattern 3: Positional parameters (?)
  // Match ? but not ?? and not inside strings
  const positionalRegex = /\?/g;

  while ((match = positionalRegex.exec(query)) !== null) {
    const startIndex = match.index;
    const endIndex = match.index + 1;

    // Simple check: skip if inside string literal
    const beforeMatch = query.substring(0, startIndex);
    const singleQuotesBefore = (beforeMatch.match(/'/g) || []).length;
    const doubleQuotesBefore = (beforeMatch.match(/"/g) || []).length;

    if (singleQuotesBefore % 2 === 0 && doubleQuotesBefore % 2 === 0) {
      // Not inside a string
      const paramName = `?${paramIndex}`;
      const param: SQLParameter = {
        name: paramName,
        index: paramIndex++,
        originalText: '?',
        startIndex,
        endIndex,
        type: inferParameterType(query, startIndex, endIndex),
      };
      parameters.push(param);
    }
  }

  // Sort parameters by their appearance in the query
  parameters.sort((a, b) => a.startIndex - b.startIndex);

  return {
    parameters,
    hasParameters: parameters.length > 0,
  };
}

/**
 * Get unique parameter names (for named parameters)
 */
export function getUniqueParameterNames(parameters: SQLParameter[]): string[] {
  const names = new Set<string>();
  for (const param of parameters) {
    if (!param.name.startsWith('?')) {
      names.add(param.name);
    }
  }
  return Array.from(names);
}










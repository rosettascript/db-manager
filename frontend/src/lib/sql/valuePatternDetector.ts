/**
 * Value Pattern Detector
 * 
 * Analyzes column values to detect patterns like enums, booleans, IDs, etc.
 * Used for intelligent autocomplete value suggestions.
 */

export type ValuePattern = 
  | 'enum'           // Limited distinct values (like status: 'active', 'inactive', 'pending')
  | 'boolean'         // Boolean-like values (true/false, yes/no, 1/0, Y/N)
  | 'id'             // Numeric ID sequences
  | 'numeric-range'  // Numeric values in a range
  | 'date'           // Date values
  | 'string'         // Common string patterns
  | 'unknown';       // No clear pattern

export interface PatternAnalysis {
  pattern: ValuePattern;
  confidence: number; // 0-1, how confident we are in this pattern
  metadata?: {
    enumValues?: string[];      // For enum: list of distinct values
    min?: number;                // For numeric-range: minimum value
    max?: number;                // For numeric-range: maximum value
    isBoolean?: boolean;          // For boolean: confirmed boolean pattern
    dateFormat?: string;          // For date: detected date format
  };
}

/**
 * Detect pattern in a list of values
 */
export function detectValuePattern(values: string[]): PatternAnalysis {
  if (!values || values.length === 0) {
    return { pattern: 'unknown', confidence: 0 };
  }

  // Try each pattern detector in order of specificity
  const booleanResult = detectBooleanPattern(values);
  if (booleanResult.confidence > 0.8) {
    return booleanResult;
  }

  const enumResult = detectEnumPattern(values);
  if (enumResult.confidence > 0.7) {
    return enumResult;
  }

  const idResult = detectIdPattern(values);
  if (idResult.confidence > 0.7) {
    return idResult;
  }

  const numericRangeResult = detectNumericRangePattern(values);
  if (numericRangeResult.confidence > 0.6) {
    return numericRangeResult;
  }

  const dateResult = detectDatePattern(values);
  if (dateResult.confidence > 0.7) {
    return dateResult;
  }

  // Default to string pattern
  return { pattern: 'string', confidence: 0.5 };
}

/**
 * Detect boolean-like patterns
 */
function detectBooleanPattern(values: string[]): PatternAnalysis {
  const uniqueValues = new Set(values.map(v => v.toLowerCase().trim()));
  const uniqueCount = uniqueValues.size;

  // Boolean should have 2-3 distinct values max
  if (uniqueCount > 3) {
    return { pattern: 'unknown', confidence: 0 };
  }

  const booleanKeywords = new Set([
    'true', 'false',
    'yes', 'no',
    'y', 'n',
    '1', '0',
    'on', 'off',
    'enabled', 'disabled',
    'active', 'inactive',
  ]);

  const allBoolean = Array.from(uniqueValues).every(v => booleanKeywords.has(v));
  
  if (allBoolean && uniqueCount <= 3) {
    return {
      pattern: 'boolean',
      confidence: 0.9,
      metadata: {
        isBoolean: true,
        enumValues: Array.from(uniqueValues),
      },
    };
  }

  return { pattern: 'unknown', confidence: 0 };
}

/**
 * Detect enum-like patterns (limited distinct values)
 */
function detectEnumPattern(values: string[]): PatternAnalysis {
  const uniqueValues = new Set(values);
  const uniqueCount = uniqueValues.size;
  const totalCount = values.length;

  // Enum should have limited distinct values relative to total
  // If we have many values but few unique ones, it's likely an enum
  const distinctRatio = uniqueCount / totalCount;
  
  // Consider it an enum if:
  // - Has 2-20 distinct values
  // - Distinct ratio is low (< 0.5) OR we have many samples (> 50) with few unique values
  const isEnum = uniqueCount >= 2 && 
                 uniqueCount <= 20 && 
                 (distinctRatio < 0.5 || (totalCount > 50 && uniqueCount <= 10));

  if (isEnum) {
    // Calculate confidence based on how "enum-like" it is
    let confidence = 0.7;
    
    // Higher confidence if distinct ratio is very low
    if (distinctRatio < 0.2) {
      confidence = 0.9;
    } else if (distinctRatio < 0.3) {
      confidence = 0.8;
    }

    // Higher confidence if we have many samples
    if (totalCount > 100) {
      confidence = Math.min(0.95, confidence + 0.1);
    }

    return {
      pattern: 'enum',
      confidence,
      metadata: {
        enumValues: Array.from(uniqueValues).slice(0, 20), // Limit to 20 for performance
      },
    };
  }

  return { pattern: 'unknown', confidence: 0 };
}

/**
 * Detect ID-like patterns (numeric sequences)
 */
function detectIdPattern(values: string[]): PatternAnalysis {
  // Check if all values are numeric
  const numericValues: number[] = [];
  for (const value of values) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { pattern: 'unknown', confidence: 0 };
    }
    numericValues.push(num);
  }

  // Check if values are sequential or in a range
  numericValues.sort((a, b) => a - b);
  const min = numericValues[0]!;
  const max = numericValues[numericValues.length - 1]!;
  const range = max - min;

  // ID pattern: values are positive integers, sequential or close to sequential
  const allPositiveIntegers = numericValues.every(v => v > 0 && Number.isInteger(v));
  
  if (allPositiveIntegers) {
    // Check if they're sequential (most IDs are)
    const isSequential = range <= numericValues.length * 2; // Allow some gaps
    
    if (isSequential) {
      return {
        pattern: 'id',
        confidence: 0.85,
        metadata: {
          min,
          max,
        },
      };
    }
  }

  return { pattern: 'unknown', confidence: 0 };
}

/**
 * Detect numeric range patterns
 */
function detectNumericRangePattern(values: string[]): PatternAnalysis {
  const numericValues: number[] = [];
  for (const value of values) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { pattern: 'unknown', confidence: 0 };
    }
    numericValues.push(num);
  }

  if (numericValues.length === 0) {
    return { pattern: 'unknown', confidence: 0 };
  }

  numericValues.sort((a, b) => a - b);
  const min = numericValues[0]!;
  const max = numericValues[numericValues.length - 1]!;

  // If we have numeric values in a range, it's a numeric range
  return {
    pattern: 'numeric-range',
    confidence: 0.7,
    metadata: {
      min,
      max,
    },
  };
}

/**
 * Detect date patterns
 */
function detectDatePattern(values: string[]): PatternAnalysis {
  // Common date formats
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,                    // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, // YYYY-MM-DD HH:MM:SS
    /^\d{2}\/\d{2}\/\d{4}$/,                 // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/,                   // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/,                 // YYYY/MM/DD
  ];

  let matches = 0;
  let matchedPattern: string | undefined;

  for (const value of values.slice(0, 10)) { // Check first 10 values
    for (const pattern of datePatterns) {
      if (pattern.test(value)) {
        matches++;
        if (!matchedPattern) {
          matchedPattern = pattern.toString();
        }
        break;
      }
    }
  }

  const matchRatio = matches / Math.min(values.length, 10);
  
  if (matchRatio > 0.7) {
    return {
      pattern: 'date',
      confidence: matchRatio,
      metadata: {
        dateFormat: matchedPattern,
      },
    };
  }

  return { pattern: 'unknown', confidence: 0 };
}

/**
 * Rank values by relevance for autocomplete
 * Returns sorted array with most relevant first
 */
export function rankValues(
  values: string[],
  searchPrefix: string,
  pattern?: PatternAnalysis
): string[] {
  const prefix = searchPrefix.toLowerCase();
  
  // Group values by match type
  const exactMatches: string[] = [];
  const prefixMatches: string[] = [];
  const containsMatches: string[] = [];
  const otherValues: string[] = [];

  for (const value of values) {
    const lowerValue = value.toLowerCase();
    
    if (lowerValue === prefix) {
      exactMatches.push(value);
    } else if (lowerValue.startsWith(prefix)) {
      prefixMatches.push(value);
    } else if (lowerValue.includes(prefix)) {
      containsMatches.push(value);
    } else {
      otherValues.push(value);
    }
  }

  // Sort each group
  const sortAlphabetically = (a: string, b: string) => a.localeCompare(b);
  
  exactMatches.sort(sortAlphabetically);
  prefixMatches.sort(sortAlphabetically);
  containsMatches.sort(sortAlphabetically);

  // For enum patterns, prioritize enum values
  if (pattern?.pattern === 'enum' && pattern.metadata?.enumValues) {
    const enumSet = new Set(pattern.metadata.enumValues);
    const enumValues = values.filter(v => enumSet.has(v));
    const nonEnumValues = values.filter(v => !enumSet.has(v));
    
    // Put enum values first, then others
    return [...rankValues(enumValues, searchPrefix), ...rankValues(nonEnumValues, searchPrefix)];
  }

  // Combine: exact matches first, then prefix, then contains, then others
  return [
    ...exactMatches,
    ...prefixMatches,
    ...containsMatches,
    ...otherValues,
  ];
}


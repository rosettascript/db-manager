/**
 * Autocomplete Dropdown Component
 * 
 * Displays SQL autocomplete suggestions in a dropdown
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AutocompleteSuggestion } from "@/lib/sql/autocomplete";

interface AutocompleteDropdownProps {
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  position: { top: number; left: number } | null;
  visible: boolean;
}

const getKindIcon = (kind: AutocompleteSuggestion['kind']) => {
  switch (kind) {
    case 'keyword':
      return '🔑';
    case 'function':
      return '⚙️';
    case 'table':
      return '📊';
    case 'column':
      return '📋';
    case 'schema':
      return '🗂️';
    case 'value':
      return '💎';
    default:
      return '•';
  }
};

const getKindColor = (kind: AutocompleteSuggestion['kind']) => {
  switch (kind) {
    case 'keyword':
      return 'text-blue-500';
    case 'function':
      return 'text-purple-500';
    case 'table':
      return 'text-green-500';
    case 'column':
      return 'text-orange-500';
    case 'schema':
      return 'text-cyan-500';
    case 'value':
      return 'text-pink-500';
    default:
      return 'text-muted-foreground';
  }
};

/**
 * Extract pattern badge from detail string
 */
const getPatternBadge = (detail: string | undefined): { label: string; variant: 'default' | 'secondary' | 'outline' } | null => {
  if (!detail) return null;
  
  if (detail.includes('(boolean)')) {
    return { label: 'Boolean', variant: 'secondary' };
  }
  if (detail.includes('(ID)')) {
    return { label: 'ID', variant: 'secondary' };
  }
  if (detail.includes('(date)')) {
    return { label: 'Date', variant: 'secondary' };
  }
  if (detail.includes('distinct values')) {
    return { label: 'Enum', variant: 'outline' };
  }
  if (detail.includes('CTE')) {
    return { label: 'CTE', variant: 'outline' };
  }
  
  return null;
};

export const AutocompleteDropdown = ({
  suggestions,
  selectedIndex,
  onSelect,
  position,
  visible,
}: AutocompleteDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && dropdownRef.current) {
      const item = selectedItemRef.current;
      const container = dropdownRef.current;
      const itemTop = item.offsetTop;
      const itemBottom = itemTop + item.offsetHeight;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.offsetHeight;

      if (itemTop < containerTop) {
        container.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        container.scrollTop = itemBottom - container.offsetHeight;
      }
    }
  }, [selectedIndex]);

  if (!visible || suggestions.length === 0 || !position) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 max-h-64 w-80 overflow-auto rounded-md border bg-popover shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="p-1">
        {suggestions.map((suggestion, index) => {
          const isSelected = index === selectedIndex;
          const patternBadge = getPatternBadge(suggestion.detail);
          
          return (
            <div
              key={index}
              ref={index === selectedIndex ? selectedItemRef : null}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer transition-colors",
                isSelected 
                  ? "bg-primary/10 border border-primary/20" 
                  : "hover:bg-muted/50"
              )}
              onClick={() => onSelect(suggestion)}
            >
              <span className="text-xs flex-shrink-0">{getKindIcon(suggestion.kind)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span 
                    className={cn(
                      "font-medium truncate",
                      isSelected 
                        ? "text-foreground font-semibold" 
                        : getKindColor(suggestion.kind)
                    )}
                  >
                    {suggestion.label}
                  </span>
                  {patternBadge && (
                    <Badge 
                      variant={patternBadge.variant} 
                      className="text-xs px-1.5 py-0 h-4 flex-shrink-0"
                    >
                      {patternBadge.label}
                    </Badge>
                  )}
                </div>
                {suggestion.detail && (
                  <div 
                    className={cn(
                      "text-xs truncate mt-0.5",
                      isSelected 
                        ? "text-muted-foreground" 
                        : "text-muted-foreground/70"
                    )}
                    title={suggestion.detail}
                  >
                    {suggestion.detail.replace(/\([^)]+\)/g, '').trim() || suggestion.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


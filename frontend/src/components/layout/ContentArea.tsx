import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ContentAreaProps {
  children: ReactNode;
}

// Subtle ghost loading overlay - just a shimmer effect
const GhostLoader = () => (
  <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <div className="text-sm text-muted-foreground">Loading...</div>
    </div>
  </div>
);

// Helper to extract route type from pathname
const getRouteType = (pathname: string): string => {
  if (pathname.startsWith('/table/')) return 'table';
  if (pathname.startsWith('/function/')) return 'function';
  if (pathname.startsWith('/view/')) return 'view';
  if (pathname.startsWith('/index/')) return 'index';
  if (pathname.startsWith('/enum/')) return 'enum';
  return pathname; // For other routes, use full pathname
};

export const ContentArea = ({ children }: ContentAreaProps) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevLocationRef = useRef(location.pathname);
  const prevRouteTypeRef = useRef<string>(getRouteType(location.pathname));
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const currentRouteType = getRouteType(location.pathname);
    const routeTypeChanged = prevRouteTypeRef.current !== currentRouteType;
    const pathnameChanged = location.pathname !== prevLocationRef.current;
    
    // Only transition if route type changed (e.g., table -> function)
    // Same route type (e.g., table -> table) should update instantly without transition
    if (pathnameChanged) {
      prevLocationRef.current = location.pathname;
      prevRouteTypeRef.current = currentRouteType;
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (routeTypeChanged) {
        // Different route type - show transition
        setIsTransitioning(true);
        setDisplayChildren(children);
        
        timeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
        }, 150);
      } else {
        // Same route type - update instantly, no transition, no opacity change
        setIsTransitioning(false);
        // Update children immediately without any opacity transition
        setDisplayChildren(children);
      }
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    } else {
      // Pathname didn't change, just update children
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div className="relative h-full w-full">
      {/* Actual content - only fade for different route types */}
      <div
        className={cn(
          "h-full w-full",
          // Only apply transition opacity for different route types
          isTransitioning ? "transition-opacity duration-150 ease-in-out opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={isTransitioning ? { willChange: "opacity" } : {}}
      >
        {displayChildren}
      </div>
      
      {/* Ghost loader overlay - only for different route types */}
      {isTransitioning && <GhostLoader />}
    </div>
  );
};


import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
}

export const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevLocationRef = useRef(location.pathname);

  useEffect(() => {
    // Only transition if pathname actually changed
    if (location.pathname !== prevLocationRef.current) {
      prevLocationRef.current = location.pathname;
      
      // Fade out
      setIsVisible(false);
      
      // Update children and fade in after fade-out completes
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        // Use requestAnimationFrame to ensure DOM update happens before fade-in
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }, 150);
      
      return () => clearTimeout(timer);
    } else {
      // Pathname didn't change, just update children
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div
      className={cn(
        "transition-opacity duration-200 ease-in-out h-full",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      style={{ willChange: "opacity" }}
    >
      {displayChildren}
    </div>
  );
};


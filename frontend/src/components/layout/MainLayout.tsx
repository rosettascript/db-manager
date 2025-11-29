import { ReactNode, useState, createContext, useContext } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { cn } from "@/lib/utils";

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within MainLayout');
  }
  return context;
};

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Toggle sidebar with Ctrl+B
  useKeyboardShortcut(
    'b',
    () => setIsSidebarOpen(prev => !prev),
    { ctrl: true }
  );

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  return (
    <SidebarContext.Provider value={{ isOpen: isSidebarOpen, toggle: toggleSidebar }}>
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <div
            className={cn(
              "transition-all duration-300 ease-in-out border-r border-border bg-sidebar h-full",
              isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
            )}
          >
            {isSidebarOpen && <Sidebar />}
          </div>
          <main className="flex-1 overflow-auto bg-background">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
};

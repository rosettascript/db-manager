import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Database, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center animate-fade-in">
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <Database className="w-20 h-20 text-muted-foreground/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">404</span>
            </div>
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
        <p className="mb-6 text-muted-foreground max-w-md">
          The page <code className="bg-muted px-2 py-1 rounded text-sm">{location.pathname}</code> doesn't exist.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          <Link to="/">
            <Button className="gap-2">
              <Home className="w-4 h-4" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

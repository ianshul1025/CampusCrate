import { Link } from "react-router-dom";
import { Box, Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-12 opacity-60 hover:opacity-100 transition-opacity">
          <Box className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">CampusCrate</span>
        </Link>

        {/* 404 display */}
        <div className="relative mb-8">
          <p className="text-[120px] sm:text-[160px] font-black leading-none text-white/5 select-none absolute inset-0 flex items-center justify-center">
            404
          </p>
          <div className="relative z-10 h-32 sm:h-40 w-32 sm:w-40 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl mx-auto">
            <Search className="h-14 w-14 sm:h-16 sm:w-16 text-primary/40" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-white">
          Page not found
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg mb-10 leading-relaxed">
          The page you're looking for doesn't exist or may have been moved.
          Check the URL or head back home.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link to="/dashboard">
            <Button className="w-full sm:w-auto gap-2 h-12 px-6 rounded-xl font-semibold">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl font-semibold text-sm text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

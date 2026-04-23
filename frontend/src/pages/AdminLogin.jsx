import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, Loader2, Home, Lock, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLogin() {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { loginAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!adminId || !password) return toast.error("Please fill all fields");

    setIsLoading(true);
    const res = await loginAdmin(adminId, password);
    setIsLoading(false);

    if (res.success) {
      toast.success("Admin authenticated successfully");
      navigate("/admin/dashboard");
    } else {
      toast.error(res.message || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative isolate overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-700/15 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-700/15 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGZpbGw9IiMxZTFmMmEiIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBmaWxsPSIjZmZmZmZmMDMiIGQ9Ik0zMCAwaDFNMzAgNjBoMU0wIDMwaDBNNjAgMzBoMSIvPjwvZz48L3N2Zz4=')] opacity-30" />
      </div>

      {/* Top Nav */}
      <nav className="relative px-6 sm:px-10 py-5 flex justify-between items-center border-b border-border">
        <Link to="/" className="flex items-center gap-2 text-foreground/40 hover:text-muted-foreground transition-colors">
          <Home className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Back to App</span>
        </Link>
        <div className="flex items-center gap-4 text-muted-foreground/50">
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-widest hidden sm:inline">Restricted Access</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Icon Badge */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 blur-xl bg-rose-500/30 rounded-full" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-rose-600 to-rose-800 rounded-2xl rotate-6 flex items-center justify-center border border-rose-500/30 shadow-xl shadow-rose-900/40">
                <ShieldCheck className="w-10 h-10 text-foreground -rotate-6" />
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="bg-secondary/50 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl shadow-black/60">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-black tracking-tight mb-2">Admin Console</h1>
              <p className="text-sm text-foreground/40 font-medium">
                Enter your administrator credentials to access the CampusCrate moderation system.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest pl-1">Admin User ID</label>
                <Input
                  id="admin-user-id"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="e.g. admin"
                  autoComplete="username"
                  className="h-12 bg-secondary/50 border-border focus-visible:border-rose-500/50 focus-visible:ring-rose-500/20 rounded-xl text-foreground placeholder:text-muted-foreground/50"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-foreground/50 uppercase tracking-widest pl-1">Password</label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-12 bg-secondary/50 border-border focus-visible:border-rose-500/50 focus-visible:ring-rose-500/20 rounded-xl text-foreground placeholder:text-muted-foreground/50 pr-11"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                id="admin-login-btn"
                type="submit"
                className="w-full h-12 bg-rose-600 hover:bg-rose-500 text-foreground font-bold text-sm rounded-xl shadow-lg shadow-rose-900/30 mt-2 group transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Authenticate & Enter
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border text-center">
              <p className="text-[10px] text-foreground/25 font-medium leading-relaxed">
                This system is restricted to authorized administrators only.<br />
                All access attempts are monitored and logged.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

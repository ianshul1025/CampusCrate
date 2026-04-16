import { createContext, useContext, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const useDbAuth = () => useContext(AuthContext);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

// Admin and public paths that should never trigger the profile-completion redirect
const EXEMPT_PATHS = ["/complete-profile", "/admin/login", "/admin/dashboard", "/"];

export const AuthProvider = ({ children }) => {
  const { getToken, isLoaded: isClerkLoaded, isSignedIn, signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const [dbUser, setDbUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Listen for forced block-logout from server
  useEffect(() => {
    const handleBlocked = (e) => {
      toast.error(e.detail || "You have been blocked by the Admin. Please contact the Admin.", { duration: 12000 });
      signOut();
      navigate("/");
    };
    window.addEventListener("user-blocked", handleBlocked);
    return () => window.removeEventListener("user-blocked", handleBlocked);
  }, [signOut, navigate]);

  useEffect(() => {
    const syncUser = async () => {
      if (!isClerkLoaded) return;
      if (!isSignedIn) {
        setDbUser(null);
        setIsLoading(false);
        return;
      }

      // Skip sync on admin/exempt pages
      if (EXEMPT_PATHS.some(p => location.pathname.startsWith("/admin"))) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken();

        const email = clerkUser?.primaryEmailAddress?.emailAddress;
        const firstName = clerkUser?.firstName;
        const lastName = clerkUser?.lastName;
        const avatar = clerkUser?.imageUrl;

        const res = await fetch(`${API_BASE}/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email, firstName, lastName, avatar }),
        });

        const data = await res.json();

        if (data.success) {
          // Force logout if the user is blocked
          if (data.data?.blocked) {
            window.dispatchEvent(new CustomEvent("user-blocked", {
              detail: "You have been blocked by the Admin. Please contact the Admin."
            }));
            return;
          }
          setDbUser(data.data);

          // Redirect to profile setup if not completed and not already there
          if (!data.data.profileCompleted && location.pathname !== "/complete-profile") {
            navigate("/complete-profile", { replace: true });
          } else if (data.data.profileCompleted && location.pathname === "/complete-profile") {
            navigate("/dashboard", { replace: true });
          }
        } else {
          // Sync failed – redirect to complete-profile as fallback
          if (location.pathname !== "/complete-profile") {
            navigate("/complete-profile", { replace: true });
          }
        }
      } catch (error) {
        console.error("Error syncing user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [isClerkLoaded, isSignedIn, clerkUser?.id]);
  // Note: clerkUser?.id (not the entire object) to avoid infinite re-renders

  const updateSavedItems = (newSavedItems) => {
    setDbUser(prev => prev ? { ...prev, savedItems: newSavedItems } : prev);
  };

  return (
    <AuthContext.Provider value={{ dbUser, setDbUser, isLoading, updateSavedItems }}>
      {children}
    </AuthContext.Provider>
  );
};

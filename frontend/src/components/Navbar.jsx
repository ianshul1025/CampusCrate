import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/clerk-react";
import {
  Home, PlusCircle, Box, User, LogOut, Settings,
  ChevronDown, LayoutGrid, Bell, CheckCheck,
  ShieldCheck, Package, XCircle, MessageSquare, Bookmark, Trash2, Menu
} from "lucide-react";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useDbAuth } from "../context/AuthContext";
import { fetchWithAuth } from "../hooks/useApi";
import { useAuth } from "@clerk/clerk-react";
import { useSocket } from "../context/SocketContext";
import { toast } from "sonner";
import { usePushNotifications } from "../hooks/usePushNotifications";

export default function Navbar() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { dbUser } = useDbAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notificationToRemove, setNotificationToRemove] = useState(null);
  const [mobileQuickOpen, setMobileQuickOpen] = useState(false);
  const { permission, subscribeUser } = usePushNotifications();
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  // Show push prompt after 5 seconds if not granted
  useEffect(() => {
    if (permission === "default" && dbUser) {
      const timer = setTimeout(() => setShowPushPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [permission, dbUser]);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const mobileQuickRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (mobileQuickRef.current && !mobileQuickRef.current.contains(e.target)) {
        setMobileQuickOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch notification count on mount
  useEffect(() => {
    if (!dbUser) return;
    const loadCount = async () => {
      try {
        const data = await fetchWithAuth("/notifications", {}, getToken);
        setNotifications(data.data?.notifications || []);
        setUnreadCount(data.data?.unreadCount || 0);
      } catch { /* silent */ }
    };
    loadCount();

    // Fetch unread messages count
    const loadUnreadCount = async () => {
      try {
        const data = await fetchWithAuth("/messages/unread/count", {}, getToken);
        setUnreadMessages(data.data?.unreadCount || 0);
      } catch { /* silent */ }
    };
    loadUnreadCount();

    // Socket real-time updates
    if (socket) {
      socket.emit("join_user", dbUser._id);
      
      socket.on("receive_message", (message) => {
          // Re-fetch the global unread count to ensure "unique conversation" logic
          if (message.receiver === dbUser?._id || message.receiver?._id === dbUser?._id) {
              loadUnreadCount();
          }
      });

      socket.on("new_notification", (notif) => {
          setNotifications(prev => [notif, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.info(notif.title, {
              description: notif.message,
              onClick: () => navigate(notif.item?._id ? `/item/${notif.item._id}` : "/dashboard")
          });
      });
    }

    return () => {
        if (socket) {
            socket.off("receive_message");
            socket.off("new_notification");
        }
    };
  }, [dbUser, socket]);

  const openNotifications = async () => {
    setNotifOpen(prev => !prev);
    if (!notifOpen && unreadCount > 0) {
      // mark all read
      try {
        await fetchWithAuth("/notifications/read-all", { method: "PATCH" }, getToken);
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch { /* silent */ }
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await fetchWithAuth(`/notifications/${id}`, { method: "DELETE" }, getToken);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setNotificationToRemove(null);
      toast.success("Notification deleted");
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const navLinks = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "Report Item", path: "/report", icon: PlusCircle },
  ];

  const displayName = dbUser?.firstName
    ? `${dbUser.firstName}${dbUser.lastName ? " " + dbUser.lastName : ""}`
    : user?.firstName || "User";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const notifIcon = (type) => {
    if (type === "ITEM_CLAIMED") return <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />;
    if (type === "CLAIM_APPROVED") return <ShieldCheck className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />;
    if (type === "CLAIM_REJECTED") return <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />;
    return <Bell className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />;
  };

  const timeAgo = (d) => {
    if (!d) return "";
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <nav className="border-b border-white/5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <Box className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight text-white">CampusCrate</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Button
                    key={link.name}
                    variant={isActive ? "secondary" : "ghost"}
                    asChild
                    className={`rounded-full font-medium ${isActive ? "bg-white/10 text-white hover:bg-white/20" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
                  >
                    <Link to={link.path}>
                      <Icon size={18} className="mr-2" />
                      {link.name}
                    </Link>
                  </Button>
                );
              })}
            </div>

            <div className="h-6 w-px bg-white/10" />

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotifications}
                className="relative h-9 w-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 bg-card shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                  <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">Notifications</h3>
                    {notifications.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{notifications.length} total</span>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-muted-foreground text-sm">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n._id} className="relative group overflow-hidden border-b border-white/5 last:border-0 h-24">
                          {/* Slide-out Trash Icon */}
                          <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center bg-red-600 translate-x-full group-hover:translate-x-0 transition-transform duration-200 z-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotificationToRemove(n._id);
                              }}
                              className="text-white hover:scale-110 transition-transform p-3"
                              title="Delete notification"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>

                          {/* Main Notification Card Content (Slides left on group hover) */}
                          <button
                            className={`w-full h-full flex items-start gap-3 px-4 py-3 bg-card hover:bg-white/5 transition-transform duration-200 text-left relative z-10 group-hover:-translate-x-16 ${!n.isRead ? "bg-primary/5" : ""}`}
                            onClick={async () => {
                              setNotifOpen(false);
                              // Optimized performance: instantly update UI
                              setNotifications(prev => prev.filter(notif => notif._id !== n._id));
                              // Backend: mark as read/delete so it "disappears"
                              try {
                                await fetchWithAuth(`/notifications/${n._id}`, { method: "DELETE" }, getToken);
                                if (n.type === "NEW_MESSAGE" && n.item?._id) {
                                  navigate(`/messages/${n.item._id}`);
                                } else if (n.item?._id) {
                                  navigate(`/item/${n.item._id}`);
                                }
                              } catch {
                                // Silent fail – user already navigated
                              }
                            }}
                          >
                            {notifIcon(n.type)}
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-semibold truncate ${!n.isRead ? "text-white" : "text-muted-foreground"}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                            </div>
                            {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Saved Items Icon */}
            <div className="relative">
              <button
                onClick={() => navigate("/saved-items")}
                className={`relative h-9 w-9 flex items-center justify-center rounded-full border transition-all ${
                  location.pathname === "/saved-items"
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20 hover:text-white"
                }`}
                aria-label="Saved Items"
              >
                <Bookmark className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Icon */}
            <div className="relative">
              <button
                onClick={() => navigate("/messages")}
                className={`relative h-9 w-9 flex items-center justify-center rounded-full border transition-all ${
                  location.pathname === "/messages"
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20 hover:text-white"
                }`}
                aria-label="Messages"
              >
                <MessageSquare className="h-4 w-4" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </button>
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                aria-label="Open user menu"
              >
                <Avatar className="h-7 w-7 border border-white/20">
                  <AvatarImage src={user?.imageUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-white max-w-[120px] truncate hidden sm:block">
                  {displayName}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-muted-foreground transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Panel */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-card shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">

                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-white/20">
                        <AvatarImage src={user?.imageUrl} />
                        <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {dbUser?.email || user?.primaryEmailAddress?.emailAddress}
                        </p>
                        {dbUser?.branch && (
                          <p className="text-xs text-primary/80 truncate">{dbUser.branch} • Sem {dbUser.semester}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1.5">
                    <button
                      onClick={() => { setDropdownOpen(false); navigate("/profile"); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User size={16} /> My Profile
                    </button>

                    <button
                      onClick={() => { setDropdownOpen(false); navigate("/my-posts"); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LayoutGrid size={16} /> My Posts
                    </button>

                    <button
                      onClick={() => { setDropdownOpen(false); navigate("/saved-items"); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Bookmark size={16} /> Saved Items
                    </button>

                    <div className="h-px bg-white/10 my-1.5" />

                    <button
                      onClick={() => { setDropdownOpen(false); signOut({ redirectUrl: "/" }); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: quick actions + avatar */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileQuickOpen((prev) => !prev)}
              className="relative h-9 w-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10"
              aria-label="Open quick actions"
              ref={mobileQuickRef}
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
              {mobileQuickOpen && (
                <div className="absolute right-0 top-11 z-50 min-w-[180px] rounded-2xl border border-white/10 bg-card p-2 shadow-2xl">
                  <button
                    onClick={() => {
                      setMobileQuickOpen(false);
                      openNotifications();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</span>
                    {unreadCount > 0 && (
                      <span className="h-4 min-w-4 px-1 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setMobileQuickOpen(false);
                      navigate("/saved-items");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Bookmark className="h-4 w-4" /> Saved Items
                  </button>
                  <button
                    onClick={() => {
                      setMobileQuickOpen(false);
                      navigate("/messages");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Messages</span>
                    {unreadMessages > 0 && (
                      <span className="h-4 min-w-4 px-1 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white leading-none">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="rounded-full ring-2 ring-white/10 p-0.5"
              aria-label="Go to profile"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </div>

        </div>
      </div>

      <AlertDialog open={!!notificationToRemove} onOpenChange={() => setNotificationToRemove(null)}>
        <AlertDialogContent className="bg-card border-white/10 text-white rounded-2xl shadow-2xl p-10 max-w-2xl mx-auto backdrop-blur-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Trash2 className="h-7 w-7 text-red-500" />
              Delete this notification?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-lg mt-2">
              It means that this notification will be permanently deleted and this process can't be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogCancel className="rounded-xl px-8 h-12 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-base">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteNotification(notificationToRemove)}
              className="rounded-xl px-8 h-12 bg-red-600 hover:bg-red-500 text-white font-bold text-base border-0"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showPushPrompt} onOpenChange={setShowPushPrompt}>
        <AlertDialogContent className="bg-card border-white/10 text-white rounded-2xl shadow-2xl p-8 max-w-md mx-auto backdrop-blur-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              Enable Push Notifications?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground mt-2">
              Stay updated on your claims and messages even when you're not using the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="rounded-xl px-4 h-10 border-white/10 bg-white/5 hover:bg-white/10 text-white">
              Later
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                subscribeUser();
                setShowPushPrompt(false);
              }}
              className="rounded-xl px-4 h-10 bg-primary hover:bg-primary/90 text-white border-0"
            >
              Enable Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
}

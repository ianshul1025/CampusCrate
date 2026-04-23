import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, FileText, LogOut,
  RefreshCw, Trash2, Ban, CheckCircle,
  ShieldCheck, ShieldOff, Eye, EyeOff,
  Search, Package, AlertTriangle,
  UserCheck, UserX, Activity, X,
  Flag, MessageSquareWarning, Menu, KeyRound, Sun, Moon
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }) {
  const colors = {
    blue:   "from-blue-600/20 to-blue-600/5 border-blue-500/20 text-blue-400",
    green:  "from-green-600/20 to-green-600/5 border-green-500/20 text-green-400",
    red:    "from-red-600/20 to-red-600/5 border-red-500/20 text-red-400",
    yellow: "from-yellow-600/20 to-yellow-600/5 border-yellow-500/20 text-yellow-400",
    purple: "from-purple-600/20 to-purple-600/5 border-purple-500/20 text-purple-400",
    rose:   "from-rose-600/20 to-rose-600/5 border-rose-500/20 text-rose-400",
    teal:   "from-teal-600/20 to-teal-600/5 border-teal-500/20 text-teal-400",
    orange: "from-orange-600/20 to-orange-600/5 border-orange-500/20 text-orange-400",
    indigo: "from-indigo-600/20 to-indigo-600/5 border-indigo-500/20 text-indigo-400",
  };
  const cls = colors[color] || colors.blue;
  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-2xl p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-foreground/50">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-black text-foreground">{value ?? "—"}</p>
      {sub && <p className="text-[11px] text-foreground/40 font-medium">{sub}</p>}
    </div>
  );
}

// ── Item Detail Modal ──────────────────────────────────────────────────────
function ItemDetailModal({ item, onClose, onBlockUser, onDeleteItem }) {
  if (!item) return null;
  const reporter = item.reportedBy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-secondary shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-base font-black text-foreground truncate">{item.title}</h2>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">ID: #{item._id?.slice(-10).toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-xl shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {item.imageUrl && (
            <div className="h-48 bg-card flex items-center justify-center shrink-0">
              <img src={item.imageUrl} alt={item.title} className="h-full w-full object-contain" />
            </div>
          )}
          {!item.imageUrl && (
            <div className="h-28 bg-secondary flex items-center justify-center border-b border-border">
              <Package className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground/50 ml-2 font-medium">No image uploaded</p>
            </div>
          )}

          <div className="p-5 grid grid-cols-2 gap-3">
            {[
              ["Status",        item.status],
              ["Category",      item.category],
              ["Location",      item.location || "N/A"],
              ["Date",          item.date ? new Date(item.date).toLocaleDateString("en-IN") : "N/A"],
              ["State",         item.state || "active"],
              ["Claim Question",item.claimQuestion || "None"],
              ["Reporter",      reporter?.firstName ? `${reporter.firstName} ${reporter.lastName || ""}` : "Anonymous"],
              ["Reporter Email",reporter?.email || "N/A"],
            ].map(([k, v]) => (
              <div key={k} className="bg-secondary rounded-xl p-3 border border-border">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold mb-1">{k}</p>
                <p className="font-semibold text-muted-foreground text-sm truncate">{v}</p>
              </div>
            ))}

            {item.description && (
              <div className="col-span-2 bg-secondary rounded-xl p-3 border border-border">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold mb-1">Description</p>
                <p className="font-medium text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-border shrink-0 flex gap-3 bg-secondary">
          <button
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors border ${
              reporter?.blocked
                ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
            }`}
            onClick={() => reporter?._id && onBlockUser(reporter._id, reporter.firstName, reporter.blocked)}
            disabled={!reporter?._id}
          >
            {reporter?.blocked ? <><ShieldCheck className="w-4 h-4" /> Unblock User</> : <><Ban className="w-4 h-4" /> Block User</>}
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground/60 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-colors"
            onClick={() => onDeleteItem(item._id)}
          >
            <Trash2 className="w-4 h-4" /> Delete Item
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Complaint Detail Modal ─────────────────────────────────────────────────
function ComplaintDetailModal({ report, onClose, onBlockUser, onDismiss }) {
  if (!report) return null;
  const reasonLabels = { scam: "Scam", fraud: "Fraud", irrelevant: "Irrelevant Content", harassment: "Harassment", spam: "Spam", other: "Other" };
  const reasonColors = { scam: "bg-red-500/20 text-red-400", fraud: "bg-orange-500/20 text-orange-400", harassment: "bg-rose-500/20 text-rose-400", spam: "bg-yellow-500/20 text-yellow-400", irrelevant: "bg-slate-500/20 text-slate-400", other: "bg-slate-500/20 text-slate-400" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border bg-secondary shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
              <Flag className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">User Complaint</p>
              <p className="text-[11px] text-muted-foreground/50">#{report._id?.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar p-5 space-y-4">
          {/* Reason */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground/40 uppercase tracking-widest">Reason</span>
            <span className={`text-xs font-black px-3 py-1 rounded-full ${reasonColors[report.reason] || "bg-slate-500/20 text-slate-400"}`}>
              {reasonLabels[report.reason] || report.reason}
            </span>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary rounded-xl p-3 border border-border">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold mb-2">Reported By</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 rounded-lg">
                  <AvatarImage src={report.reportedBy?.avatar} />
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-black rounded-lg">
                    {report.reportedBy?.firstName?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-foreground">{report.reportedBy?.firstName} {report.reportedBy?.lastName || ""}</p>
                  <p className="text-[10px] text-muted-foreground/50 truncate">{report.reportedBy?.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-secondary rounded-xl p-3 border border-red-500/10">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold mb-2">Reported User</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7 rounded-lg">
                  <AvatarImage src={report.reportedUser?.avatar} />
                  <AvatarFallback className="text-[10px] bg-red-500/20 text-red-400 font-black rounded-lg">
                    {report.reportedUser?.firstName?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-foreground">{report.reportedUser?.firstName} {report.reportedUser?.lastName || ""}</p>
                  <p className="text-[10px] text-muted-foreground/50 truncate">{report.reportedUser?.email}</p>
                  {report.reportedUser?.blocked && <span className="text-[9px] font-black text-red-400">BLOCKED</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Related Item */}
          {report.item && (
            <div className="bg-secondary rounded-xl p-3 border border-border">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold mb-1">Related Item</p>
              <p className="text-sm font-semibold text-muted-foreground">{report.item?.title || "—"}</p>
              {report.item?.category && <p className="text-[11px] text-muted-foreground/50 mt-0.5 capitalize">{report.item.category}</p>}
            </div>
          )}

          {/* Details / Chat Transcript */}
          {report.lastFiveMessages && report.lastFiveMessages.length > 0 ? (
             <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
              <div className="bg-secondary p-3 flex items-center justify-between border-b border-border">
                <p className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <MessageSquareWarning className="w-4 h-4 text-emerald-500" />
                  Chat Transcript Snapshot
                </p>
                <Badge className="bg-emerald-500/20 text-emerald-500 border-0 text-[9px] font-black">{report.lastFiveMessages.length} Messages</Badge>
              </div>
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar bg-background">
                {report.lastFiveMessages.map((msg, i) => {
                  const isReportedUser = msg.senderId === report.reportedUser?._id;
                  return (
                    <div key={i} className={`flex ${isReportedUser ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
                        isReportedUser 
                          ? "bg-secondary text-foreground rounded-tl-none border border-border" 
                          : "bg-[#005c4b] text-foreground rounded-tr-none"
                      }`}>
                        <p className={`text-[10px] font-bold mb-1 ${isReportedUser ? "text-red-400" : "text-emerald-500"}`}>
                          {msg.senderName} {isReportedUser ? "(Reported)" : "(Reporter)"}
                        </p>
                        <p className="break-words">{msg.message}</p>
                        <p className="text-[9px] text-muted-foreground text-right mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : report.description ? (
            <div className="bg-secondary rounded-xl p-3 border border-border">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold mb-1">Details</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {report.description === "Report specific to chat behavior." ? "No chat available" : report.description}
              </p>
            </div>
          ) : null}

          <div className="text-[11px] text-muted-foreground/50 font-medium">
            Filed: {new Date(report.createdAt).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-secondary shrink-0 flex gap-3">
          <button
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors border ${
              report.reportedUser?.blocked
                ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
            }`}
            onClick={() => onBlockUser(report.reportedUser?._id, report.reportedUser?.firstName, report.reportedUser?.blocked)}
            disabled={!report.reportedUser?._id}
          >
            {report.reportedUser?.blocked ? <><ShieldCheck className="w-4 h-4" /> Unblock User</> : <><Ban className="w-4 h-4" /> Block User</>}
          </button>
          {report.status === "pending" && (
            <button
              className="flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground/50 hover:bg-secondary transition-colors"
              onClick={() => onDismiss(report._id)}
            >
              <CheckCircle className="w-4 h-4" /> Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── User Detail Modal ──────────────────────────────────────────────────────
function UserDetailModal({ user, onClose, onBlockUser }) {
  if (!user) return null;

  const profileFields = [
    { label: "ID", value: user._id },
    { label: "Email", value: user.email },
    { label: "Gender", value: user.gender || "Not specified" },
    { label: "Course", value: user.course || "N/A" },
    { label: "Branch", value: user.branch || "N/A" },
    { label: "Batch", value: user.batchYear || "N/A" },
    { label: "Semester", value: user.semester ? `Semester ${user.semester}` : "N/A" },
    { label: "URN", value: user.urn || "N/A" },
    { label: "Joined", value: new Date(user.createdAt).toLocaleDateString("en-IN") },
    { label: "Role", value: user.role, badge: true },
    { label: "Status", value: user.blocked ? "Blocked" : "Active", badge: true, color: user.blocked ? "red" : "green" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-border bg-secondary shrink-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 rounded-xl border border-border">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-primary/20 text-primary font-black text-lg">
                {user.firstName?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-black text-foreground">{user.firstName} {user.lastName || ""}</h2>
              <p className="text-xs text-muted-foreground/50 lowercase">Member since {new Date(user.createdAt).getFullYear()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors p-1.5 hover:bg-secondary rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar p-6 grid grid-cols-2 gap-4">
          {profileFields.map((f, i) => (
            <div key={i} className={`bg-secondary rounded-xl p-3 border border-border ${f.label === "Email" || f.label === "ID" ? "col-span-2" : ""}`}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold mb-1">{f.label}</p>
              {f.badge ? (
                <Badge className={`text-[11px] font-black border-0 capitalize ${f.color === "red" ? "bg-red-500/20 text-red-400" : f.color === "green" ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary"}`}>
                  {f.value}
                </Badge>
              ) : (
                <p className="font-semibold text-muted-foreground text-sm truncate">{f.value}</p>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-secondary shrink-0">
          {user.role !== "admin" && (
            <button
              className={`w-full flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl transition-colors border ${
                user.blocked
                  ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                  : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              }`}
              onClick={() => onBlockUser(user._id, user.firstName, user.blocked)}
            >
              {user.blocked ? <><ShieldCheck className="w-4 h-4" /> Unblock User Account</> : <><Ban className="w-4 h-4" /> Block User Account</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main AdminDashboard ────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdminAuth, logoutAdmin, fetchAdmin, updateAdminToken } = useAdminAuth();

  const [section, setSection] = useState("dashboard");
  const [analytics, setAnalytics] = useState(null);
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [blockConfirm, setBlockConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [clearedReportsBadge, setClearedReportsBadge] = useState(false);
  const [clearedUsersBadge, setClearedUsersBadge] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newAdminId: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (section === "reports") setClearedReportsBadge(true);
    if (section === "users") setClearedUsersBadge(true);
  }, [section]);

  useEffect(() => {
    if (!isAdminAuth) navigate("/admin/login", { replace: true });
  }, [isAdminAuth, navigate]);

  const fetchAll = useCallback(async () => {
    if (!isAdminAuth) return;
    setLoading(true);
    try {
      const [analyticsRes, itemsRes, usersRes, reportsRes] = await Promise.all([
        fetchAdmin("/admin/analytics"),
        fetchAdmin("/admin/items"),
        fetchAdmin("/admin/users"),
        fetchAdmin("/admin/reports"),
      ]);
      setAnalytics(analyticsRes.data);
      setItems(itemsRes.data || []);
      setUsers(usersRes.data || []);
      setReports(reportsRes.data || []);
    } catch (e) {
      toast.error(e.message || "Failed to load admin data");
      if (e.message?.includes("session expired")) {
        logoutAdmin(); navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }, [isAdminAuth, fetchAdmin, logoutAdmin, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll analytics every 30s
  useEffect(() => {
    const id = setInterval(async () => {
      if (!isAdminAuth) return;
      try { const r = await fetchAdmin("/admin/analytics"); setAnalytics(r.data); } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, [isAdminAuth, fetchAdmin]);

  const handleBlockUser = async (userId, name, isCurrentlyBlocked) => {
    if (!userId) return toast.error("No user selected");
    try {
      const res = await fetchAdmin(`/admin/users/${userId}/block`, { method: "POST" });
      const nowBlocked = res.data?.blocked;
      toast.success(`${name || "User"} ${nowBlocked ? "blocked" : "unblocked"} successfully`);
      setBlockConfirm(null);
      setSelectedItem(null);
      setSelectedReport(null);
      setSelectedUser(null);
      fetchAll();
    } catch (e) { toast.error(e.message || "Action failed"); }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await fetchAdmin(`/admin/items/${itemId}`, { method: "DELETE" });
      toast.success("Item deleted permanently");
      setDeleteConfirm(null);
      setSelectedItem(null);
      fetchAll();
    } catch (e) { toast.error(e.message || "Delete failed"); }
  };

  const handleDismissReport = async (reportId) => {
    try {
      await fetchAdmin(`/admin/reports/${reportId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "dismissed" }),
      });
      toast.success("Report dismissed");
      setSelectedReport(null);
      fetchAll();
    } catch (e) { toast.error(e.message); }
  };

  const handleLogout = () => {
    logoutAdmin();
    toast.success("Logged out of Admin Console");
    navigate("/admin/login");
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const { newAdminId, oldPassword, newPassword, confirmPassword } = passwordForm;
    if (!oldPassword || !newPassword || !confirmPassword) {
      return toast.error("Please fill all required fields");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("New password and confirm password do not match");
    }
    if (newPassword.length < 8) {
      return toast.error("New password must be at least 8 characters");
    }

    try {
      setChangingPassword(true);
      const response = await fetchAdmin("/admin/change-password", {
        method: "POST",
        body: JSON.stringify({ newAdminId: newAdminId.trim(), oldPassword, newPassword, confirmPassword }),
      });
      if (response?.data?.token) {
        updateAdminToken(response.data.token);
      }
      toast.success("Admin ID and password updated successfully");
      setPasswordModalOpen(false);
      setPasswordForm({ newAdminId: "", oldPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswords({ oldPassword: false, newPassword: false, confirmPassword: false });
    } catch (e2) {
      toast.error(e2.message || "Failed to update admin credentials");
    } finally {
      setChangingPassword(false);
    }
  };

  const filteredItems = items.filter(i =>
    !search ||
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.toLowerCase().includes(search.toLowerCase()) ||
    i.reportedBy?.firstName?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = [...users]
    .filter(u => !userSearch ||
      `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
    )
    .sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""));

  const navItems = [
    { id: "dashboard", label: "Dashboard",  icon: LayoutDashboard },
    { id: "reports",   label: "Reports",    icon: MessageSquareWarning, badge: clearedReportsBadge ? null : (reports.filter(r => r.status === "pending").length || null) },
    { id: "users",     label: "Users",      icon: Users, badge: clearedUsersBadge ? null : (users.filter(u => u.blocked).length || null) },
  ];

  if (!isAdminAuth) return null;

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground font-sans flex flex-col">

      {/* Top Bar */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md shrink-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden w-8 h-8 rounded-lg border border-border bg-secondary flex items-center justify-center text-muted-foreground"
            aria-label="Open admin navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-rose-900/40">
            <ShieldCheck className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-foreground">Admin Console</p>
            <p className="text-[10px] text-muted-foreground/50 font-medium">CampusCrate</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/50 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Theme</span>
            </button>
          )}
          <button
            onClick={() => setPasswordModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/50 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
            aria-label="Update admin credentials"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Change Password</span>
          </button>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/50 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary"
            aria-label="Refresh admin data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link to="/" target="_blank" rel="noopener noreferrer" className="hidden sm:block text-xs font-bold text-muted-foreground/50 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-secondary">
            View App
          </Link>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-rose-400/70 hover:text-rose-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-500/10 border border-rose-500/20">
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 hidden lg:flex flex-col bg-secondary/50 border-r border-border overflow-y-auto custom-scrollbar">
          <nav className="flex-1 p-3 space-y-1 pt-4">
            {navItems.map(({ id, label, icon: Icon, badge }) => (
              <button key={id} onClick={() => setSection(id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                  section === id
                    ? "bg-rose-600/20 text-rose-400 border border-rose-500/30"
                    : "text-foreground/40 hover:text-foreground hover:bg-secondary border border-transparent"
                }`}>
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" /> {label}
                </span>
                {badge != null && badge > 0 && (
                  <span className="text-[10px] font-black bg-rose-500 text-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-600/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground">Super Admin</p>
                <p className="text-[10px] text-muted-foreground/50">Full Access</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-6">

          {/* ── DASHBOARD ── */}
          {section === "dashboard" && (
            <>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">Moderation Dashboard</h1>
                <p className="text-sm text-foreground/40 mt-1">Real-time overview of platform activity and content.</p>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[...Array(9)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-secondary animate-pulse" />)}
                </div>
              ) : analytics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  <StatCard label="Total Users"      value={analytics.totalUsers}      icon={Users}       color="blue"   sub="Registered" />
                  <StatCard label="Active Items"     value={analytics.totalItems}      icon={Package}     color="teal"   sub="All submissions" />
                  <StatCard label="Lost Items"       value={analytics.lostItems}       icon={AlertTriangle} color="red"  sub="Awaiting return" />
                  <StatCard label="Found Items"      value={analytics.foundItems}      icon={CheckCircle} color="green"  sub="Ready to claim" />
                  <StatCard label="Returned Items"   value={analytics.returnedItems}   icon={UserCheck}   color="indigo" sub="Successfully returned" />
                  <StatCard label="Pending Claims"   value={analytics.pendingClaims}   icon={Activity}    color="yellow" sub="Awaiting review" />
                  <StatCard label="Accepted Claims"  value={analytics.acceptedClaims}  icon={UserCheck}   color="green"  sub="Approved" />
                  <StatCard label="Rejected Claims"  value={analytics.rejectedClaims}  icon={UserX}       color="orange" sub="Declined" />
                  <StatCard label="Blocked Users"    value={analytics.blockedUsers}    icon={ShieldOff}   color="rose"   sub="Access revoked" />
                  {analytics.pendingReports > 0 && (
                    <StatCard label="Pending Reports" value={analytics.pendingReports} icon={Flag}       color="red"    sub="User complaints" />
                  )}
                </div>
              )}

              {/* Moderation Queue Table */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div>
                    <h2 className="font-black text-foreground">Moderation Queue</h2>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">All item submissions — view, block or delete</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
                      className="h-8 pl-8 w-48 bg-secondary border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[860px]">
                    <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/25 border-b border-border">
                      <span>Item Name</span><span>Submitter</span><span>Date</span><span>Status</span><span>State</span><span>Actions</span>
                    </div>

                    <div className="divide-y divide-border">
                      {loading ? (
                        [...Array(5)].map((_, i) => <div key={i} className="h-16 mx-5 my-2 rounded-xl bg-secondary animate-pulse" />)
                      ) : filteredItems.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground/50">
                          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="font-bold">No items found</p>
                        </div>
                      ) : filteredItems.map(item => (
                        <div key={item._id} className={`grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-secondary transition-colors ${item.reportedBy?.blocked ? "bg-red-500/[0.04]" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center border border-border">
                          {item.imageUrl
                            ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                            : <Package className="w-4 h-4 text-muted-foreground/50" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-foreground/25 truncate">{item.location || item.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-6 w-6 rounded-lg shrink-0">
                          <AvatarImage src={item.reportedBy?.avatar} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-black rounded-lg">
                            {item.reportedBy?.firstName?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground truncate">
                            {item.reportedBy?.firstName || "Anonymous"} {item.reportedBy?.lastName || ""}
                          </p>
                          {item.reportedBy?.blocked && <span className="text-[9px] font-black text-red-400">BLOCKED</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground/50 font-medium">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                      </span>
                      <Badge className={`text-[10px] font-black border-0 w-fit ${item.status === "Lost" ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>{item.status}</Badge>
                      <Badge className={`text-[10px] font-black border-0 capitalize w-fit ${item.state === "returned" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/15 text-yellow-400"}`}>{item.state || "active"}</Badge>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelectedItem(item)} title="View Details"
                          className="w-7 h-7 rounded-lg bg-secondary hover:bg-secondary text-foreground/40 hover:text-foreground flex items-center justify-center transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(item._id)} title="Delete"
                          className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {item.reportedBy?._id && (
                          <button
                            onClick={() => setBlockConfirm({ userId: item.reportedBy._id, name: item.reportedBy.firstName, isBlocked: item.reportedBy.blocked })}
                            title={item.reportedBy.blocked ? "Unblock" : "Block"}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${item.reportedBy.blocked ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"}`}>
                            {item.reportedBy.blocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {filteredItems.length > 0 && (
                  <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground/50 font-medium">
                    Showing {filteredItems.length} of {items.length} items
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── REPORTS (USER COMPLAINTS) ── */}
          {section === "reports" && (
            <>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">User Complaints</h1>
                <p className="text-sm text-foreground/40 mt-1">Reports filed by users regarding scam, fraud, or irrelevant behaviour during chat.</p>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">{reports.length} Total Complaints</span>
                    <span className="text-xs text-muted-foreground/50">·</span>
                    <span className="text-xs font-bold text-red-400">{reports.filter(r => r.status === "pending").length} Pending</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[860px]">
                {/* Table Head */}
                    <div className="grid grid-cols-[40px_1.5fr_1.5fr_1fr_1fr_1.5fr_auto] gap-3 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/25 border-b border-border">
                      <span>#</span><span>Reported User</span><span>Reported By</span><span>Reason</span><span>Status</span><span>Date & Time</span><span>Action</span>
                    </div>

                    <div className="divide-y divide-border">
                  {loading ? (
                    [...Array(5)].map((_, i) => <div key={i} className="h-14 mx-5 my-2 rounded-xl bg-secondary animate-pulse" />)
                  ) : reports.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground/50">
                      <MessageSquareWarning className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-bold">No complaints filed yet</p>
                      <p className="text-xs mt-1">User reports made during chat will appear here</p>
                    </div>
                  ) : reports.map((report, idx) => {
                    const reasonColors = { scam: "bg-red-500/20 text-red-400", fraud: "bg-orange-500/20 text-orange-400", harassment: "bg-rose-500/20 text-rose-400", spam: "bg-yellow-500/20 text-yellow-400", irrelevant: "bg-slate-500/20 text-slate-300", other: "bg-slate-500/20 text-slate-300" };
                    return (
                      <div key={report._id} className={`grid grid-cols-[40px_1.5fr_1.5fr_1fr_1fr_1.5fr_auto] gap-3 px-5 py-3.5 items-center hover:bg-secondary transition-colors ${report.status === "pending" ? "" : "opacity-60"}`}>
                        <span className="text-xs text-muted-foreground/50 font-mono">{idx + 1}</span>

                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 rounded-md shrink-0">
                            <AvatarImage src={report.reportedUser?.avatar} />
                            <AvatarFallback className="text-[9px] bg-red-500/20 text-red-400 font-black rounded-md">
                              {report.reportedUser?.firstName?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-muted-foreground truncate">
                              {report.reportedUser?.firstName || "Unknown"} {report.reportedUser?.lastName || ""}
                            </p>
                            {report.reportedUser?.blocked && <span className="text-[9px] text-red-400 font-black">BLOCKED</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 rounded-md shrink-0">
                            <AvatarImage src={report.reportedBy?.avatar} />
                            <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-black rounded-md">
                              {report.reportedBy?.firstName?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-foreground/50 truncate">{report.reportedBy?.firstName || "Anon"} {report.reportedBy?.lastName || ""}</p>
                        </div>

                        <span className={`text-[10px] font-black px-2 py-1 rounded-full w-fit capitalize ${reasonColors[report.reason] || "bg-slate-500/20 text-slate-300"}`}>
                          {report.reason}
                        </span>

                        <span>
                          {report.status === "pending" && <Badge className="text-[10px] font-black border-0 bg-yellow-500/20 text-yellow-400">Pending</Badge>}
                          {report.status === "reviewed" && <Badge className="text-[10px] font-black border-0 bg-blue-500/20 text-blue-400">Resolved</Badge>}
                          {report.status === "dismissed" && <Badge className="text-[10px] font-black border-0 bg-secondary text-foreground/40">Dismissed</Badge>}
                        </span>

                        <span className="text-xs text-muted-foreground/50 font-medium">
                          {new Date(report.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>

                        <button
                          onClick={() => setSelectedReport(report)}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          <Eye className="w-3 h-3" /> More Info
                        </button>
                      </div>
                    );
                  })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── USERS ── */}
          {section === "users" && (
            <>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">Users</h1>
                <p className="text-sm text-foreground/40 mt-1">All registered platform users, sorted alphabetically.</p>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">{users.length} Users</span>
                    <span className="text-xs text-muted-foreground/50">·</span>
                    <span className="text-xs font-bold text-red-400">{users.filter(u => u.blocked).length} Blocked</span>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                    <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      className="h-8 pl-8 w-52 bg-secondary border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/50" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[780px]">
                {/* Table Head — serial number instead of ID */}
                    <div className="grid grid-cols-[50px_2fr_2.5fr_80px_100px_120px] gap-4 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-foreground/25 border-b border-border">
                      <span>S.No</span><span>Name</span><span>Email</span><span>Role</span><span>Status</span><span>Action</span>
                    </div>

                    <div className="divide-y divide-border">
                  {loading ? (
                    [...Array(8)].map((_, i) => <div key={i} className="h-14 mx-5 my-2 rounded-xl bg-secondary animate-pulse" />)
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground/50">
                      <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="font-bold">No users found</p>
                    </div>
                  ) : filteredUsers.map((user, idx) => (
                    <div key={user._id} className={`grid grid-cols-[50px_2fr_2.5fr_80px_100px_120px] gap-4 px-5 py-3.5 items-center hover:bg-secondary transition-colors ${user.blocked ? "bg-red-500/[0.04]" : ""}`}>
                      {/* Serial Number */}
                      <span className="text-sm font-black text-muted-foreground/50">{idx + 1}</span>

                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-7 w-7 rounded-lg shrink-0 border border-border">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-black rounded-lg">
                            {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p 
                            className="text-sm font-bold text-foreground truncate hover:text-rose-400 cursor-pointer transition-colors"
                            onClick={() => setSelectedUser(user)}
                          >
                            {user.firstName || ""} {user.lastName || ""}
                          </p>
                          {user.urn && <p className="text-[10px] text-muted-foreground/50">URN: {user.urn}</p>}
                        </div>
                      </div>

                      <span className="text-xs text-foreground/50 truncate font-medium">{user.email}</span>

                      <Badge className="text-[10px] font-black border-0 bg-primary/15 text-primary capitalize w-fit">
                        {user.role}
                      </Badge>

                      {user.blocked
                        ? <Badge className="text-[10px] font-black border-0 bg-red-500/20 text-red-400 w-fit">Blocked</Badge>
                        : <Badge className="text-[10px] font-black border-0 bg-green-500/20 text-green-400 w-fit">Active</Badge>
                      }

                      {user.role !== "admin" ? (
                        <button
                          onClick={() => setBlockConfirm({ userId: user._id, name: user.firstName || user.email, isBlocked: user.blocked })}
                          className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-lg transition-colors w-fit ${
                            user.blocked
                              ? "bg-green-500/10 hover:bg-green-500/20 text-green-400"
                              : "bg-red-500/10 hover:bg-red-500/20 text-red-400"
                          }`}>
                          {user.blocked
                            ? <><ShieldCheck className="w-3 h-3" /> Unblock</>
                            : <><Ban className="w-3 h-3" /> Block</>}
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50 font-medium">System</span>
                      )}
                    </div>
                  ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-card"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-black text-foreground">Admin Console</p>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="w-8 h-8 rounded-lg border border-border bg-secondary flex items-center justify-center text-foreground/60"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map(({ id, label, icon: Icon, badge }) => (
                <button key={id} onClick={() => { setSection(id); setMobileNavOpen(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                    section === id
                      ? "bg-rose-600/20 text-rose-400 border border-rose-500/30"
                      : "text-foreground/40 hover:text-foreground hover:bg-secondary border border-transparent"
                  }`}>
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" /> {label}
                  </span>
                  {badge != null && badge > 0 && (
                    <span className="text-[10px] font-black bg-rose-500 text-foreground rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onBlockUser={(userId, name, isBlocked) => setBlockConfirm({ userId, name, isBlocked })}
          onDeleteItem={(itemId) => setDeleteConfirm(itemId)}
        />
      )}

      {/* Report / Complaint Detail Modal */}
      {selectedReport && (
        <ComplaintDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onBlockUser={(userId, name, isBlocked) => setBlockConfirm({ userId, name, isBlocked })}
          onDismiss={handleDismissReport}
        />
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onBlockUser={(userId, name, isBlocked) => setBlockConfirm({ userId, name, isBlocked })}
        />
      )}

      {/* Block / Unblock Confirm */}
      <AlertDialog open={!!blockConfirm} onOpenChange={v => !v && setBlockConfirm(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-lg font-black">
              {blockConfirm?.isBlocked ? <ShieldCheck className="w-6 h-6 text-green-400" /> : <Ban className="w-6 h-6 text-red-400" />}
              {blockConfirm?.isBlocked ? "Unblock User?" : "Block User?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/40 mt-2 text-sm leading-relaxed">
              {blockConfirm?.isBlocked
                ? `"${blockConfirm?.name}" will regain full access. Their items will become visible again.`
                : `"${blockConfirm?.name}" will be immediately blocked, forcefully logged out, and unable to access the platform.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-xl border-border bg-secondary hover:bg-secondary text-foreground font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBlockUser(blockConfirm.userId, blockConfirm.name, blockConfirm.isBlocked)}
              className={`rounded-xl font-bold border-0 ${blockConfirm?.isBlocked ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"} text-foreground`}>
              Confirm {blockConfirm?.isBlocked ? "Unblock" : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-card border-border text-foreground rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-lg font-black">
              <Trash2 className="w-6 h-6 text-red-400" /> Delete Item Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/40 mt-2 text-sm">
              This will permanently remove the item from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-xl border-border bg-secondary hover:bg-secondary text-foreground font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteItem(deleteConfirm)}
              className="rounded-xl font-bold border-0 bg-red-600 hover:bg-red-500 text-primary-foreground">
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password */}
      <AlertDialog
        open={passwordModalOpen}
        onOpenChange={(v) => {
          setPasswordModalOpen(v);
          if (!v) {
            setPasswordForm({ newAdminId: "", oldPassword: "", newPassword: "", confirmPassword: "" });
            setShowPasswords({ oldPassword: false, newPassword: false, confirmPassword: false });
          }
        }}
      >
        <AlertDialogContent className="bg-card border-border text-foreground rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-black">
              <KeyRound className="w-5 h-5 text-rose-400" />
              Update Admin Credentials
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/40 mt-2 text-sm">
              Change admin ID and password in one step.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input
              type="text"
              placeholder="New admin ID (optional)"
              value={passwordForm.newAdminId}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newAdminId: e.target.value }))}
              className="h-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50"
              autoComplete="username"
              disabled={changingPassword}
            />
            <div className="relative">
            <Input
              type={showPasswords.oldPassword ? "text" : "password"}
              placeholder="Old password"
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
              className="h-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 pr-10"
              autoComplete="current-password"
              disabled={changingPassword}
            />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, oldPassword: !prev.oldPassword }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-muted-foreground"
                aria-label={showPasswords.oldPassword ? "Hide old password" : "Show old password"}
              >
                {showPasswords.oldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
            <Input
              type={showPasswords.newPassword ? "text" : "password"}
              placeholder="New password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              className="h-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 pr-10"
              autoComplete="new-password"
              disabled={changingPassword}
            />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, newPassword: !prev.newPassword }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-muted-foreground"
                aria-label={showPasswords.newPassword ? "Hide new password" : "Show new password"}
              >
                {showPasswords.newPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
            <Input
              type={showPasswords.confirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className="h-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground/50 pr-10"
              autoComplete="new-password"
              disabled={changingPassword}
            />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-muted-foreground"
                aria-label={showPasswords.confirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showPasswords.confirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <AlertDialogFooter className="gap-3 mt-4">
              <AlertDialogCancel className="rounded-xl border-border bg-secondary hover:bg-secondary text-foreground font-bold">
                Cancel
              </AlertDialogCancel>
              <Button
                type="submit"
                disabled={changingPassword}
                className="rounded-xl font-bold bg-rose-600 hover:bg-rose-500 text-foreground"
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

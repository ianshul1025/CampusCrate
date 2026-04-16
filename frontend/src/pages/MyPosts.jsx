import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import {
  MapPin, Calendar, Package, Pencil, Trash2,
  PlusCircle, Eye, CheckCircle2, Search, ChevronRight, Hourglass
} from "lucide-react";

import Navbar from "../components/Navbar";
import { fetchWithAuth } from "../hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDbAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function MyPosts() {
  const { getToken } = useAuth();
  const { dbUser } = useDbAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [returnAlertId, setReturnAlertId] = useState(null);
  const [deleteAlertId, setDeleteAlertId] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // all | Lost | Found | Returned | Claims
  const [claimTypeFilter, setClaimTypeFilter] = useState("all"); // all | Lost | Found
  const [claimStatusFilter, setClaimStatusFilter] = useState("all"); // all | pending | approved | active | rejected

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [postsRes, claimsRes] = await Promise.all([
          fetchWithAuth("/items", {}, getToken).catch(() => ({ data: [] })),
          fetchWithAuth("/claims/my", {}, getToken).catch(() => ({ data: [] }))
        ]);
        const allItems = postsRes.data || [];
        const mine = allItems.filter(
          i => i.reportedBy?._id === dbUser?._id || i.reportedBy?.clerkId === dbUser?.clerkId
        );
        setItems(mine);
        setMyClaims(claimsRes.data || []);
      } catch (err) {
        toast.error("Failed to load your data.");
      } finally {
        setLoading(false);
      }
    };
    if (dbUser) fetchAllData();
  }, [dbUser]);

  const handleDeleteClick = (itemId) => {
    setDeleteAlertId(itemId);
  };

  const confirmDelete = async () => {
    const itemId = deleteAlertId;
    setDeleteAlertId(null);
    setDeletingId(itemId);
    try {
      await fetchWithAuth(`/items/${itemId}`, { method: "DELETE" }, getToken);
      setItems(prev => prev.filter(i => i._id !== itemId));
      toast.success("Post deleted successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to delete post.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkReturnedClick = (itemId) => {
    setReturnAlertId(itemId);
  };

  const confirmMarkReturned = async () => {
    const itemId = returnAlertId;
    setReturnAlertId(null);
    try {
      await fetchWithAuth(`/items/${itemId}/returned`, { method: "PATCH" }, getToken);
      setItems(prev => prev.map(i => i._id === itemId ? { ...i, state: "returned", returnedAt: new Date().toISOString() } : i));
      toast.success("Item marked as returned.");
    } catch (err) {
      toast.error(err.message || "Failed to mark item as returned.");
    }
  };

  const filteredItems = items.filter(i => {
    if (activeTab === "all") return true;
    if (activeTab === "Returned") return i.state === "returned" && i.status === "Found";
    return i.status === activeTab && i.state !== "returned";
  });

  const lostCount = items.filter(i => i.status === "Lost" && i.state !== "returned").length;
  const foundCount = items.filter(i => i.status === "Found" && i.state !== "returned").length;
  const returnedCount = items.filter(i => i.state === "returned" && i.status === "Found").length;
  const claimsCount = myClaims.length;

  const filteredClaims = myClaims.filter(c => {
    const item = c.itemId;
    if (!item) return false;
    
    // Type Filter
    if (claimTypeFilter !== "all" && item.status !== claimTypeFilter) return false;
    
    // Status Filter
    if (claimStatusFilter !== "all") {
      return c.status === claimStatusFilter;
    }
    
    return true;
  });

  const timeAgo = (d) => {
    if (!d) return "Recently";
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Profile Cover Header */}
        <div className="bg-gradient-to-b from-primary/10 to-background border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 pt-10 pb-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 pb-0">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-background shadow-2xl">
                  <AvatarImage src={dbUser?.avatar} />
                  <AvatarFallback className="bg-primary/20 text-primary text-3xl font-extrabold">
                    {dbUser?.firstName?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-extrabold text-white">
                      {dbUser?.firstName} {dbUser?.lastName}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {dbUser?.branch && `${dbUser.branch} • `}
                      {dbUser?.course && `${dbUser.course} • `}
                      {dbUser?.batchYear && `Batch ${dbUser.batchYear}`}
                    </p>
                  </div>
                  <Button onClick={() => navigate("/report")} className="gap-2 rounded-full font-bold">
                    <PlusCircle className="h-4 w-4" /> New Post
                  </Button>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-8 mt-5">
                  <div className="text-center">
                    <p className="text-xl font-extrabold text-white">{items.length}</p>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-extrabold text-red-400">{lostCount}</p>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Lost</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-extrabold text-green-400">{foundCount}</p>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Found</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-extrabold text-primary">{claimsCount}</p>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Claims</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-extrabold text-green-500">{returnedCount}</p>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Returned</p>
                  </div>
                </div>
              </div>
            </div>
 
            {/* Filter Tabs */}
            <div className="flex gap-0 border-b border-white/5 -mb-px mt-4 overflow-x-auto custom-scrollbar">
              {["all", "Lost", "Found", "Claims", "Returned"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-semibold capitalize border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? "border-primary text-white"
                      : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  {tab === "all" ? "All Posts" : tab}
                  <span className="ml-2 text-[10px] sm:text-xs opacity-60">
                    {tab === "all" ? items.length : tab === "Lost" ? lostCount : tab === "Found" ? foundCount : tab === "Returned" ? returnedCount : claimsCount}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="bg-card/40 border-white/5 rounded-2xl overflow-hidden">
                  <Skeleton className="h-52 w-full rounded-none" />
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-9 flex-1 rounded-xl" />
                      <Skeleton className="h-9 flex-1 rounded-xl" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeTab === "Claims" ? (
            <div className="space-y-6">
              {/* Claims Filters */}
              <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Type:</span>
                  <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                    {["all", "Lost", "Found"].map(t => (
                      <button
                        key={t}
                        onClick={() => setClaimTypeFilter(t)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                          claimTypeFilter === t ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                        }`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="h-4 w-px bg-white/10 hidden sm:block" />
                
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status:</span>
                  <div className="flex flex-wrap bg-black/40 p-1 rounded-lg border border-white/5 gap-1">
                    {[
                      { id: "all", label: "ALL" },
                      { id: "approved", label: "ACCEPTED" },
                      { id: "rejected", label: "REJECTED" }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => setClaimStatusFilter(s.id)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                          claimStatusFilter === s.id ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredClaims.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-card/20 border border-dashed border-white/10 rounded-3xl">
                   <Search className="h-10 w-10 text-white/10 mb-4" />
                   <h3 className="text-lg font-bold text-white mb-1">No matching claims found</h3>
                   <p className="text-xs text-muted-foreground">Adjust your filters to see more results.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClaims.map(claim => {
                    const item = claim.itemId;
                    if (!item) return null;

                    const isReturned = item.state === "returned";

                    const statusInfo = {
                      pending: { label: "In Progress", color: "bg-yellow-500", icon: <Hourglass className="h-3 w-3" /> },
                      approved: { label: "Accepted", color: "bg-green-500", icon: <CheckCircle2 className="h-3 w-3" /> },
                      rejected: { label: "Rejected", color: "bg-red-500", icon: <Eye className="h-3 w-3" /> }
                    };
                    const currentStatus = statusInfo[claim.status] || { label: claim.status, color: "bg-muted" };

                    return (
                      <Card key={claim._id} className={`bg-card border-white/5 transition-all duration-200 rounded-2xl overflow-hidden flex flex-col group relative isolate ${isReturned ? "opacity-60 grayscale-[50%]" : "hover:border-white/10"}`}>
                        
                        {/* Returned Stamp */}
                        {isReturned && (
                          <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-2xl">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 bg-red-600/90 text-white font-black tracking-[0.2em] text-sm py-2 px-12 shadow-2xl border-y-2 border-red-500/50 backdrop-blur-md z-50 whitespace-nowrap">
                              RETURNED
                            </div>
                          </div>
                        )}

                        <div className={`h-44 bg-white/5 relative overflow-hidden flex-shrink-0 ${isReturned ? "pointer-events-none" : ""}`}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className={`w-full h-full object-cover transition-transform duration-500 ${isReturned ? "" : "group-hover:scale-105"}`} />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-black/20 text-muted-foreground">
                              <Package className="h-10 w-10 text-white/10 mb-2" />
                              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center px-4">No image available</span>
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex flex-col gap-2">
                             <Badge className={`font-bold tracking-widest text-[9px] uppercase border-none ${item.status === "Found" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                                {item.status === "Found" ? "CLAIM" : "I FOUND THIS"}
                             </Badge>
                             <Badge className={`font-bold tracking-widest text-[9px] uppercase border-none flex items-center gap-1 ${currentStatus.color} text-white`}>
                                {currentStatus.icon} {currentStatus.label}
                             </Badge>
                          </div>
                        </div>
                        <CardContent className="p-4 flex-1 flex flex-col pointer-events-auto z-40 relative">
                          <h3 className="font-bold text-white text-sm line-clamp-1 mb-1">{item.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 italic mb-3 opacity-80 min-h-[2.5rem]">
                            "{claim.message}"
                          </p>
                          <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-medium">Claimed {timeAgo(claim.createdAt)}</span>
                            {isReturned ? (
                              <Button disabled variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-muted-foreground gap-1">
                                Resolved
                              </Button>
                            ) : (
                              <Link to={`/item/${item._id}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary gap-1">
                                  View Item <ChevronRight className="h-3 w-3" />
                                </Button>
                              </Link>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === "Returned" ? (
            <div className="bg-card/20 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-5">
                    <CheckCircle2 className="h-10 w-10 text-white/10" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No returned items yet</h3>
                  <p className="text-muted-foreground max-w-xs text-sm">
                    Items you've successfully returned to their owners will appear here in a structured format.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest w-16">#</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Item Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Reported Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Time when Returned</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredItems.map((item, index) => (
                        <tr key={item._id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-6 py-4 text-sm font-bold text-muted-foreground">{index + 1}</td>
                          <td className="px-6 py-4 underline-offset-4 decoration-primary/30 group-hover:underline">
                            <Link to={`/item/${item._id}`} className="flex items-center gap-3">
                              {item.imageUrl && (
                                <img src={item.imageUrl} className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10" alt="" />
                              )}
                              <span className="font-bold text-white text-sm">{item.title}</span>
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-center">
                             <Badge className={`text-[9px] font-black uppercase ${item.status === "Found" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                                {item.status}
                             </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 opacity-50" />
                              <span className="text-sm font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-green-400">
                                {item.returnedAt ? new Date(item.returnedAt).toLocaleDateString() : "Recently"}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium opacity-60">
                                {item.returnedAt ? new Date(item.returnedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-5">
                <Package className="h-10 w-10 text-white/10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-6 max-w-xs">
                {activeTab === "all"
                  ? "You haven't reported any items yet. Start by creating your first post."
                  : `You have no ${activeTab.toLowerCase()} items.`}
              </p>
              <Button onClick={() => navigate("/report")} className="gap-2 rounded-full font-bold px-6">
                <PlusCircle className="h-4 w-4" /> Report an Item
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => {
                const isReturned = item.state === "returned";

                return (
                  <Card
                    key={item._id}
                    className={`bg-card border-white/5 transition-all duration-200 rounded-2xl overflow-hidden flex flex-col group relative isolate ${isReturned ? "opacity-60 grayscale-[50%]" : "hover:border-white/10"}`}
                  >
                    {/* Returned Stamp */}
                    {isReturned && (
                      <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-2xl">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 bg-red-600/90 text-white font-black tracking-[0.2em] text-xl py-3 px-16 shadow-2xl border-y-4 border-red-500/50 backdrop-blur-md z-50 whitespace-nowrap">
                          RETURNED
                        </div>
                      </div>
                    )}

                    {/* Image */}
                    <div className={`h-52 bg-white/5 relative overflow-hidden flex-shrink-0 ${isReturned ? "pointer-events-none" : ""}`}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className={`w-full h-full object-cover transition-transform duration-500 ${isReturned ? "" : "group-hover:scale-105"}`}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-black/20 text-muted-foreground">
                          <Package className="h-12 w-12 text-white/10 mb-2" />
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center px-4">No image available</span>
                        </div>
                      )}

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={`font-bold tracking-widest text-[10px] uppercase border-none ${item.status === "Found" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                        {item.status}
                      </Badge>
                    </div>

                    {/* Time */}
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-semibold text-white/70 px-2 py-0.5">
                      {timeAgo(item.createdAt)}
                    </div>
                  </div>

                  {/* Card Content */}
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-white text-base line-clamp-1 mb-1">{item.title}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{item.location || "No location"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground capitalize mb-4">
                      <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">{item.category}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto flex flex-col gap-2 z-40 relative">
                      {isReturned ? (
                        <Button 
                          disabled 
                          className="w-full h-9 rounded-xl text-xs font-bold bg-white/10 text-white/50 border border-white/10"
                        >
                          Item Returned
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-400 rounded-xl text-xs gap-1.5 mb-2"
                            onClick={() => handleMarkReturnedClick(item._id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Returned
                          </Button>
                          <div className="grid grid-cols-3 gap-2">
                            <Link to={`/item/${item._id}`} className="flex-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-9 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-xs gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                            </Link>
                            <Link to={`/edit-item/${item._id}`} className="flex-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-9 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-xs gap-1.5"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 border-red-500/30 bg-red-500/5 hover:bg-red-500/20 text-red-400 rounded-xl text-xs gap-1.5"
                              onClick={() => handleDeleteClick(item._id)}
                              disabled={deletingId === item._id}
                            >
                              {deletingId === item._id ? (
                                <span className="animate-spin h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!returnAlertId} onOpenChange={(open) => !open && setReturnAlertId(null)}>
        <AlertDialogContent className="bg-card border-white/10 text-white rounded-2xl shadow-2xl p-10 max-w-2xl mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-7 w-7 text-green-500" /> Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base leading-relaxed mt-2">
              By marking this item as Returned, you confirm that it has been securely and successfully restored to its rightful owner. This action will permanently lock interacting and chat features securely for this item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white rounded-xl py-6 px-8 text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600 hover:bg-green-500 rounded-xl font-bold shadow-lg shadow-green-900/20 py-6 px-8 text-base" onClick={confirmMarkReturned}>
              Mark as Returned
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAlertId} onOpenChange={(open) => !open && setDeleteAlertId(null)}>
        <AlertDialogContent className="bg-card border-white/10 text-white rounded-2xl shadow-2xl p-10 max-w-2xl mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold flex items-center gap-3 mb-2">
              <Trash2 className="h-7 w-7 text-red-500" /> Are you sure to delete?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base leading-relaxed mt-2">
              It means that this item will be permanently deleted and this process cant be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 hover:text-white rounded-xl py-6 px-8 text-base">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-500 rounded-xl font-bold shadow-lg shadow-red-900/20 py-6 px-8 text-base" onClick={confirmDelete}>
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

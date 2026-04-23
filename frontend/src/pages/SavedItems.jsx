import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { 
  MapPin, Calendar, AlertCircle, Bookmark,
  ChevronRight, Package, Eye, Trash2, HeartOff
} from "lucide-react";

import Navbar from "../components/Navbar";
import { fetchWithAuth } from "../hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDbAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function SavedItems() {
  const { getToken } = useAuth();
  const { dbUser, updateSavedItems } = useDbAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSavedItems = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth("/items/saved", {}, getToken);
      setItems(res.data || []);
    } catch (err) {
      setError("Failed to load saved items.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dbUser) fetchSavedItems();
  }, [dbUser]);

  const handleToggleSave = async (itemId) => {
    try {
      const res = await fetchWithAuth(`/items/${itemId}/save`, { method: "POST" }, getToken);
      if (res.success) {
        // Remove from local list immediately
        setItems(prev => prev.filter(i => i._id !== itemId));
        updateSavedItems(res.data); // Update global context
        toast.success("Item removed from saved collection");
      }
    } catch (err) {
      toast.error("Failed to update saved status");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      <Navbar />

      <main className="flex-1 bg-card/10 overflow-y-auto">
        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center text-sm text-muted-foreground mb-4 gap-2 font-medium">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4 opacity-50" />
              <Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
              <ChevronRight className="h-4 w-4 opacity-50" />
              <span className="text-foreground font-bold">Saved Collections</span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                  <Bookmark className="h-10 w-10 text-primary fill-primary/10" />
                  Saved Collections
                </h1>
                <p className="text-muted-foreground font-medium text-lg">
                  {items.length === 0 ? "You haven't saved any items yet." : `You have ${items.length} bookmarked item${items.length !== 1 ? "s" : ""}.`}
                </p>
              </div>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="bg-card/40 border-border shadow-lg rounded-2xl overflow-hidden">
                  <Skeleton className="h-52 w-full rounded-none" />
                  <CardContent className="p-5">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-1/2 mb-8" />
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-8 rounded-2xl text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold mb-2">Error Loading Saved Items</h3>
              <p>{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-card/20 border border-border p-20 rounded-3xl text-center flex flex-col items-center justify-center">
              <div className="h-24 w-24 bg-secondary rounded-full flex items-center justify-center mb-8">
                <Bookmark className="h-12 w-12 text-muted-foreground opacity-20" />
              </div>
              <h3 className="text-3xl font-black mb-4">No saved items found</h3>
              <p className="text-muted-foreground w-full max-w-md mb-10 text-lg">
                Browse the dashboard and click the bookmark icon on items you want to keep track of.
              </p>
              <Link to="/dashboard">
                <Button className="rounded-full px-10 h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                  Explore Items
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map(item => {
                const reporter = item.reportedBy;
                const reporterName = reporter?.firstName
                  ? `${reporter.firstName} ${reporter.lastName || ""}`
                  : "Anonymous";
                const reporterInitials = reporter?.firstName?.[0]?.toUpperCase() || "?";
                const isLost = item.status === "Lost";
                const isReturned = item.state === "returned";

                return (
                  <Card key={item._id} className="bg-card border-border hover:border-border hover:bg-card/80 transition-all duration-300 shadow-lg rounded-2xl group flex flex-col overflow-hidden relative isolate">
                    
                    {/* Returned Stamp */}
                    {isReturned && (
                      <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-2xl opacity-80">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 bg-red-600/90 text-foreground font-black tracking-[0.2em] text-sm py-2 px-10 shadow-2xl border-y-2 border-red-500/50 backdrop-blur-md z-50 uppercase">
                          Returned
                        </div>
                      </div>
                    )}

                    {/* Image Area */}
                    <div className="h-52 bg-secondary relative overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-secondary text-muted-foreground">
                          <Package className="h-10 w-10 text-muted-foreground/30 mb-2" />
                          <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest text-center px-4">No image available</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-4 left-4 z-10">
                        {isLost ? (
                          <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 uppercase font-bold tracking-widest text-[10px] px-2.5 py-0.5 rounded-md backdrop-blur-md">
                            LOST
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50 uppercase font-bold tracking-widest text-[10px] px-2.5 py-0.5 rounded-md backdrop-blur-md">
                            FOUND
                          </Badge>
                        )}
                      </div>

                      {/* Remove Bookmark Button (Top Right) */}
                      <button
                        onClick={() => handleToggleSave(item._id)}
                        className="absolute top-4 right-4 z-20 h-8 w-8 bg-card hover:bg-red-600 text-primary-foreground rounded-full flex items-center justify-center backdrop-blur-md transition-colors shadow-lg group/btn"
                        title="Remove bookmark"
                      >
                        <Bookmark className="h-4 w-4 fill-white group-hover/btn:hidden" />
                        <HeartOff className="h-4 w-4 hidden group-hover/btn:block" />
                      </button>
                    </div>

                    {/* Content */}
                    <CardContent className="p-5 flex-1 flex flex-col relative z-20">
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <h4 className="font-bold text-lg leading-tight line-clamp-1 text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap mt-1 font-medium">
                          {item.date ? new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Recently"}
                        </span>
                      </div>

                      {item.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 font-medium">
                          <MapPin className="h-4 w-4 shrink-0 opacity-70" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mb-5">
                        <Avatar className="h-6 w-6 border border-border bg-primary/20">
                          <AvatarImage src={reporter?.avatar} />
                          <AvatarFallback className="text-primary text-[10px] font-bold">{reporterInitials}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground font-medium truncate">
                          {reporterName}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-auto pt-4 border-t border-border flex gap-3">
                        <Link to={`/item/${item._id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full h-9 border-border bg-secondary hover:bg-secondary rounded-xl text-xs font-bold gap-1.5 transition-colors">
                            <Eye className="h-3.5 w-3.5" /> View Details
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 px-3 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl transition-all"
                          onClick={() => handleToggleSave(item._id)}
                        >
                          <Bookmark className="h-4 w-4 fill-current fill-red-400" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

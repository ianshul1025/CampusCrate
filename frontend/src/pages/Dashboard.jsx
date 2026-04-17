import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { 
  MapPin, Calendar, AlertCircle, Filter,
  Monitor, Shirt, Key, Book, MoreHorizontal,
  ChevronDown, LayoutGrid, List as ListIcon,
  X, PackageSearch, ChevronRight, ChevronLeft,
  Briefcase, Package, Eye, Pencil, CreditCard
} from "lucide-react";

import Navbar from "../components/Navbar";
import { fetchWithAuth } from "../hooks/useApi";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDbAuth } from "../context/AuthContext";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "all", label: "All Categories", icon: MoreHorizontal },
  { id: "electronics", label: "Electronics", icon: Monitor },
  { id: "clothings", label: "Clothings", icon: Shirt },
  { id: "keys", label: "Keys", icon: Key },
  { id: "ids", label: "IDs", icon: CreditCard },
  { id: "books", label: "Books", icon: Book },
  { id: "bags", label: "Bags", icon: Briefcase },
  { id: "other", label: "Other", icon: Package },
];

export default function Dashboard() {
  const { getToken } = useAuth();
  const { dbUser } = useDbAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeStatus, setActiveStatus] = useState("all");
  const [activeCategory, setActiveCategory] = useState("all");
  // Initialize search from URL query param (e.g. ?q=backpack from landing page search)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sortOrder, setSortOrder] = useState("newest");
  const [myClaims, setMyClaims] = useState([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [itemsRes, claimsRes] = await Promise.all([
          fetchWithAuth("/items", {}, getToken),
          fetchWithAuth("/claims/my", {}, getToken).catch(() => ({ data: [] }))
        ]);
        setItems(itemsRes.data || []);
        setMyClaims(claimsRes.data || []);
      } catch (err) {
        setError("Failed to load dashboard data. Please try again.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  // Apply all filters client-side
  const filteredItems = items
    .filter(item => {
      if (activeStatus !== "all" && item.status !== activeStatus) return false;
      if (activeCategory !== "all" && item.category !== activeCategory) return false;
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  const resetFilters = () => {
    setActiveStatus("all");
    setActiveCategory("all");
    setSearchQuery("");
  };

  const MobileFiltersPanel = () => (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg tracking-tight">Filters</h2>
        </div>
        <button
          className="text-sm text-muted-foreground hover:text-white transition-colors"
          onClick={resetFilters}
        >
          Reset All
        </button>
      </div>

      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground tracking-widest mb-3 uppercase">Search</h3>
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-black/20 border-white/10 h-10 rounded-lg"
        />
      </div>

      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground tracking-widest mb-4 uppercase">Categories</h3>
        <div className="space-y-1 max-h-[32vh] overflow-y-auto pr-1">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground tracking-widest mb-4 uppercase">Status</h3>
        <Tabs value={activeStatus} onValueChange={setActiveStatus} className="w-full">
          <TabsList className="grid grid-cols-3 bg-black/40 border border-white/5 p-1 h-auto rounded-lg">
            <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-xs">All</TabsTrigger>
            <TabsTrigger value="Lost" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-xs">Lost</TabsTrigger>
            <TabsTrigger value="Found" className="rounded-md data-[state=active]:bg-green-600 data-[state=active]:text-white font-semibold text-xs">Found</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex flex-col font-sans selection:bg-primary/30">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Filters */}
        <aside className="w-[280px] border-r border-white/5 bg-background/50 hidden md:flex flex-col overflow-y-auto z-10 shrink-0">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-lg tracking-tight">Filters</h2>
              </div>
              <button
                className="text-sm text-muted-foreground hover:text-white transition-colors"
                onClick={resetFilters}
              >
                Reset All
              </button>
            </div>

            {/* Search */}
            <div className="mb-8">
              <h3 className="text-[11px] font-bold text-muted-foreground tracking-widest mb-3 uppercase">Search</h3>
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-black/20 border-white/10 h-10 rounded-lg"
              />
            </div>

            {/* Categories */}
            <div className="mb-10">
              <h3 className="text-[11px] font-bold text-muted-foreground tracking-widest mb-4 uppercase">Categories</h3>
              <div className="space-y-1">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div className="mb-10">
              <h3 className="text-[11px] font-bold text-muted-foreground tracking-widest mb-4 uppercase">Status</h3>
              <Tabs value={activeStatus} onValueChange={setActiveStatus} className="w-full">
                <TabsList className="grid grid-cols-3 bg-black/40 border border-white/5 p-1 h-auto rounded-lg">
                  <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-xs">All</TabsTrigger>
                  <TabsTrigger value="Lost" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-xs">Lost</TabsTrigger>
                  <TabsTrigger value="Found" className="rounded-md data-[state=active]:bg-green-600 data-[state=active]:text-white font-semibold text-xs">Found</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-card/20 relative">
          <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">

            {/* Header Content */}
            <div className="mb-8">
              <div className="flex items-center text-sm text-muted-foreground mb-4 gap-2 font-medium">
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                <ChevronRight className="h-4 w-4 opacity-50" />
                <span className="text-white">Item Feed</span>
              </div>

              <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                      {searchQuery ? `Results for "${searchQuery}"` : "All Items Feed"}
                    </h1>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMobileFiltersOpen(true)}
                      className="md:hidden mb-2 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-lg"
                    >
                      <Filter className="h-4 w-4 mr-1.5" />
                      Filter
                    </Button>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    Showing {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} found
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <Select value={sortOrder} onValueChange={setSortOrder}>
                    <SelectTrigger className="w-[190px] bg-black/20 border-white/10 h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Sort by: Newest First</SelectItem>
                      <SelectItem value="oldest">Sort by: Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filter Tags */}
              <div className="flex flex-wrap items-center gap-3">
                {activeStatus !== "all" && (
                  <Badge variant="secondary" className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 border py-1.5 px-3 rounded-md font-medium flex items-center gap-2">
                    Status: {activeStatus}
                    <button onClick={() => setActiveStatus("all")}><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {activeCategory !== "all" && (
                  <Badge variant="secondary" className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 border py-1.5 px-3 rounded-md font-medium flex items-center gap-2">
                    Category: {activeCategory}
                    <button onClick={() => setActiveCategory("all")}><X className="h-3 w-3" /></button>
                  </Badge>
                )}
                {(activeStatus !== "all" || activeCategory !== "all" || searchQuery) && (
                  <button onClick={resetFilters} className="text-sm text-primary hover:text-primary/80 font-medium ml-2">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="bg-card/40 border-white/5 shadow-lg rounded-2xl overflow-hidden">
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
                <h3 className="text-lg font-bold mb-2">Error Loading Items</h3>
                <p>{error}</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="bg-card/20 border border-white/5 p-16 rounded-3xl text-center flex flex-col items-center justify-center">
                <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <PackageSearch className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No matching items found</h3>
                <p className="text-muted-foreground w-full max-w-sm mb-8 font-medium">
                  We couldn't find any items matching your current filters.
                </p>
                <Button onClick={resetFilters} variant="outline" className="border-white/10 rounded-full px-8 bg-transparent text-white font-semibold">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => {
                  const reporter = item.reportedBy;
                  const reporterName = reporter?.firstName
                    ? `${reporter.firstName}${reporter.lastName ? " " + reporter.lastName[0] + "." : ""}`
                    : "Anonymous";
                  const reporterInitials = reporter?.firstName?.[0]?.toUpperCase() || "?";
                  
                  // Check if user already claimed this item
                  const existingClaim = myClaims.find(c => c.itemId?._id === item._id || c.itemId === item._id);
                  const isOwner = dbUser?._id === item.reportedBy?._id || dbUser?.clerkId === item.reportedBy?.clerkId || dbUser?._id === item.reportedBy;
                  const isLost = item.status === "Lost";

                  const isReturned = item.state === "returned";

                  return (
                    <Card key={item._id} className={`bg-card border-white/5 transition-all duration-300 shadow-lg rounded-2xl h-full flex flex-col overflow-hidden relative isolate ${isReturned ? "opacity-60 grayscale-[50%]" : "hover:border-white/10 hover:bg-card/80 group hover:-translate-y-1"}`}>
                      
                      {/* Returned Stamp */}
                      {isReturned && (
                        <div className="absolute inset-0 z-50 pointer-events-none overflow-hidden rounded-2xl">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 bg-red-600/90 text-white font-black tracking-[0.2em] text-xl py-3 px-16 shadow-2xl border-y-4 border-red-500/50 backdrop-blur-md z-50 whitespace-nowrap">
                            RETURNED
                          </div>
                        </div>
                      )}

                      {/* Image Area */}
                      <Link to={isReturned ? "#" : `/item/${item._id}`} className={`block h-52 bg-white/5 relative overflow-hidden flex-shrink-0 ${isReturned ? "pointer-events-none" : ""}`}>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className={`w-full h-full object-cover transition-transform duration-500 ${isReturned ? "" : "group-hover:scale-105"}`} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-black/20 text-muted-foreground">
                            <Package className="h-10 w-10 text-white/10 mb-2" />
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest text-center px-4">No image available</span>
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
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Eye className="h-8 w-8 text-white/80" />
                        </div>
                      </Link>

                      {/* Content */}
                      <CardContent className="p-5 flex-1 flex flex-col relative z-20">
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <h4 className="font-bold text-lg leading-tight line-clamp-1 text-white group-hover:text-primary transition-colors">
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
                          <Avatar className="h-6 w-6 border border-white/10 bg-primary/20">
                            <AvatarImage src={reporter?.avatar} />
                            <AvatarFallback className="text-primary text-[10px] font-bold">{reporterInitials}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground font-medium truncate">
                            {reporterName}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-auto pt-4 border-t border-white/5 grid gap-3">
                          {isReturned ? (
                            <Button 
                              disabled 
                              className="w-full h-9 rounded-xl text-xs font-bold bg-white/10 text-white/50 border border-white/10"
                            >
                              This item is marked as Returned
                            </Button>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              <Link to={`/item/${item._id}`} className="w-full">
                                <Button variant="outline" size="sm" className="w-full h-9 border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold gap-1.5">
                                  <Eye className="h-3.5 w-3.5" /> View
                                </Button>
                              </Link>
                              
                              {!isOwner ? (
                                existingClaim ? (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="w-full h-9 bg-white/5 text-muted-foreground text-[10px] items-center justify-center text-center px-1 leading-tight rounded-xl border border-dashed border-white/10"
                                    onClick={() => toast.info("Claim already submitted. Click View to check status.")}
                                  >
                                    Already Claimed
                                  </Button>
                                ) : (
                                  <Link to={`/item/${item._id}?claim=true`} className="w-full">
                                    <Button 
                                      size="sm" 
                                      className={`w-full h-9 rounded-xl text-xs font-black gap-1.5 shadow-sm active:scale-95 transition-transform ${
                                        isLost 
                                          ? "bg-red-600 hover:bg-red-500 text-white" 
                                          : "bg-green-600 hover:bg-green-500 text-white"
                                      }`}
                                    >
                                      {isLost ? "I Found This" : "Claim"}
                                    </Button>
                                  </Link>
                                )
                              ) : (
                                <Link to={`/edit-item/${item._id}`} className="w-full">
                                  <Button variant="outline" size="sm" className="w-full h-9 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-xs font-bold gap-1.5">
                                    <Pencil className="h-3.5 w-3.5" /> Edit
                                  </Button>
                                </Link>
                              )}
                            </div>
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
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
          />
          <aside className="absolute right-0 top-0 h-full w-[88vw] max-w-sm border-l border-white/10 bg-background p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Item Feed Filters</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="h-8 w-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <MobileFiltersPanel />
          </aside>
        </div>
      )}
    </div>
  );
}

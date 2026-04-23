import { useState, useEffect } from "react";
import { SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Box, Search, FileText, ShieldCheck, MapPin, Clock,
  ArrowRight, Mail, Phone, Building, Package, Lock,
  Menu, X, MessageSquare, CheckCircle2, PlusCircle, Sun, Moon
} from "lucide-react";
import { useTheme } from "next-themes";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const AnimatedCounter = ({ end, duration = 3500 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Calculate easing (ease-out quartic for silky smoothness)
      const easeOut = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOut * end));
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <>{count}</>;
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [recentItems, setRecentItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ total: 0, found: 0, lost: 0, returned: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const handlePhoneClick = (e, phone) => {
    // don't e.preventDefault() so tel: works
    navigator.clipboard.writeText(phone)
      .then(() => toast.success("Phone number copied to clipboard!"))
      .catch(() => toast.error("Failed to copy phone number"));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchRecentItems = async () => {
      try {
        const res = await fetch(`${API_BASE}/items`);
        const data = await res.json();
        const allItems = data.data || [];
        
        // Exclude items that have been resolved and returned
        const activeItems = allItems.filter(i => i.state !== "returned");
        
        // Show 4 most recent active items
        setRecentItems(activeItems.slice(0, 4));
        // Fetch global stats for all-time returned count
        const statsRes = await fetch(`${API_BASE}/items/stats`);
        const statsData = await statsRes.json();
        const returnedCount = statsData.data?.totalReturnedItems || 0;

        setStats({
          total: activeItems.length,
          found: activeItems.filter(i => i.status === "Found").length,
          lost: activeItems.filter(i => i.status === "Lost").length,
          returned: returnedCount,
        });
      } catch (err) {
        console.error("Error fetching items:", err);
      } finally {
        setItemsLoading(false);
      }
    };
    fetchRecentItems();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/dashboard?q=${encodeURIComponent(searchQuery)}`);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "Recently";
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">

      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <Box className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold tracking-tight">Campus<span className="text-primary">Crate</span></span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
              <Link to="/" className="text-foreground transition-colors duration-200 ease-in-out hover:text-primary">Home</Link>
              <a href="#how-it-works" className="transition-colors duration-200 ease-in-out hover:text-primary">How It Works</a>
              <a href="#recent-items" className="transition-colors duration-200 ease-in-out hover:text-primary">Recent Items</a>
              <a href="#contact" className="transition-colors duration-200 ease-in-out hover:text-primary">Contact</a>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                <SignedIn>
                  <Button variant="ghost" className="hover:bg-secondary hover:text-primary transition-colors duration-200 ease-in-out font-semibold" onClick={() => navigate("/dashboard")}>
                    My Dashboard
                  </Button>
                  <Button className="font-semibold" onClick={() => navigate("/report")}>
                    Report Item
                  </Button>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="ghost" className="hidden lg:flex hover:bg-secondary hover:text-foreground font-semibold">Log In</Button>
                  </SignInButton>
                  <SignInButton mode="modal">
                    <Button className="font-semibold text-primary-foreground">Get Started</Button>
                  </SignInButton>
                  <div className="w-px h-6 bg-secondary mx-1" />
                  <Link to="/admin/login">
                    <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-xs font-bold text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-full px-3">
                      <Lock className="h-3 w-3" /> Admin
                    </Button>
                  </Link>
                </SignedOut>
              </div>

              {mounted && (
                <button
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="relative h-9 w-9 flex items-center justify-center rounded-full bg-secondary border border-border text-muted-foreground hover:text-foreground"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              )}

              {/* Hamburger Button */}
              <button
                className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-background/98 backdrop-blur-xl border-b border-border py-8 px-4 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-200 z-50">
            <div className="flex flex-col gap-4 text-lg font-medium">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-foreground hover:text-primary transition-colors duration-200 ease-in-out border-b border-border pb-2">Home</Link>
              <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-muted-foreground hover:text-primary transition-colors duration-200 ease-in-out border-b border-border pb-2">How It Works</a>
              <a href="#recent-items" onClick={() => setIsMenuOpen(false)} className="text-muted-foreground hover:text-primary transition-colors duration-200 ease-in-out border-b border-border pb-2">Recent Items</a>
              <a href="#contact" onClick={() => setIsMenuOpen(false)} className="text-muted-foreground hover:text-primary transition-colors duration-200 ease-in-out border-b border-border pb-2">Contact</a>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <SignedIn>
                <Button className="w-full justify-center text-base py-6" onClick={() => { navigate("/dashboard"); setIsMenuOpen(false); }}>
                  My Dashboard
                </Button>
                <Button variant="outline" className="w-full justify-center text-base py-6 border-border bg-secondary" onClick={() => { navigate("/report"); setIsMenuOpen(false); }}>
                  Report Item
                </Button>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button className="w-full justify-center text-base py-6 text-primary-foreground" onClick={() => setIsMenuOpen(false)}>Get Started</Button>
                </SignInButton>
                <SignInButton mode="modal">
                  <Button variant="ghost" className="w-full justify-center text-base py-6 hover:bg-secondary" onClick={() => setIsMenuOpen(false)}>Log In</Button>
                </SignInButton>
                <div className="h-px bg-secondary my-2" />
                <Link to="/admin/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 py-6">
                    <Lock className="h-4 w-4" /> Admin Login
                  </Button>
                </Link>
              </SignedOut>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative px-4 pt-20 pb-28 md:pt-32 md:pb-40 flex flex-col items-center text-center overflow-hidden">
          <div
            className="absolute inset-0 z-0 opacity-20"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80')",
              backgroundPosition: "center",
              backgroundSize: "cover"
            }}
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/10 via-background/80 to-background" />

          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            <Badge variant="outline" className="mb-6 px-3 py-1 bg-secondary border-border backdrop-blur-md rounded-full text-[10px] font-semibold tracking-wide text-foreground flex items-center gap-2 uppercase">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              University Verified Platform
            </Badge>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Find what you've lost on <br className="hidden md:block" /> <span className="text-primary">campus.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl font-light">
              The official centralized lost and found platform for university students, faculty, and staff.
            </p>

            {/* Live Search Bar */}
            <form onSubmit={handleSearch} className="w-full max-w-2xl relative flex items-center">
              <Search className="absolute left-4 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for lost items (e.g., 'Blue backpack')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-32 h-14 md:h-16 rounded-full bg-card/60 border-border text-base md:text-lg focus-visible:ring-primary shadow-2xl backdrop-blur-md"
              />
              <Button type="submit" size="lg" className="absolute right-1.5 h-11 rounded-full px-6 md:px-8 text-base shadow-lg hover:bg-primary/90">
                Search
              </Button>
            </form>

            {/* Live Stats */}
            {stats.total > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 md:gap-12 mt-10 text-center px-4">
                <div className="min-w-[80px]">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground"><AnimatedCounter end={stats.total} /></p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">Total Items</p>
                </div>
                <div className="hidden sm:block w-px h-8 bg-secondary" />
                <div className="min-w-[80px]">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-green-400"><AnimatedCounter end={stats.found} /></p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">Found</p>
                </div>
                <div className="hidden sm:block w-px h-8 bg-secondary" />
                <div className="min-w-[80px]">
                  <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-red-400"><AnimatedCounter end={stats.lost} /></p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">Lost</p>
                </div>
                {stats.returned >= 0 && (
                  <>
                    <div className="hidden sm:block w-px h-8 bg-secondary" />
                    <div className="min-w-[80px]">
                      <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-blue-400"><AnimatedCounter end={stats.returned} /></p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">Returned</p>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 px-4 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end w-full justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-3">How it <span className="text-primary">works</span></h2>
              <p className="text-muted-foreground text-lg max-w-2xl">
                CampusCrate connects you with your belongings through a secure, community-driven network.
              </p>
            </div>
            <SignedIn>
              <Link to="/report" className="text-primary hover:text-primary/80 font-semibold flex items-center gap-2 text-sm">
                Report an Item <ArrowRight className="h-4 w-4" />
              </Link>
            </SignedIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: PlusCircle, bg: "bg-blue-500/10", text: "text-blue-500", title: "1. Report Item", desc: "Easily post items you've lost or found. Add item details, category, location, date, and photos & security questions as optional to ensure safe returns." },
              { icon: ShieldCheck, bg: "bg-purple-500/10", text: "text-purple-500", title: "2. Claim & Verify", desc: "Users can claim lost or found items by answering the security question or by describing the item, proving true ownership." },
              { icon: MessageSquare, bg: "bg-indigo-500/10", text: "text-indigo-500", title: "3. Secure Chat", desc: "Once a claim is verified by the item poster, our real-time messaging system opens up so you can coordinate the return seamlessly." },
              { icon: CheckCircle2, bg: "bg-green-500/10", text: "text-green-500", title: "4. Mark as Returned", desc: "After a successful return, the item poster must Mark the item as returned to close the case and notify everyone." },
            ].map(({ icon: Icon, bg, text, title, desc }) => (
              <Card key={title} className="bg-card/40 border-border backdrop-blur-sm shadow-xl p-8 hover:-translate-y-1 transition-transform duration-300 flex flex-col items-center text-center">
                <div className={`h-12 w-12 rounded-xl ${bg} flex items-center justify-center mb-6`}>
                  <Icon className={`h-6 w-6 ${text}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* Recently Reported Items - REAL DATA */}
        <section id="recent-items" className="py-20 px-4 max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Recently <span className="text-primary">Reported</span></h2>
              <p className="text-muted-foreground mt-2">Latest items reported by your campus community</p>
            </div>
            <SignedIn>
              <Link to="/dashboard" className="text-primary hover:text-primary/80 font-semibold flex items-center gap-2 text-sm">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="text-primary hover:text-primary/80 font-semibold flex items-center gap-2 text-sm">
                  View All <ArrowRight className="h-4 w-4" />
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {itemsLoading ? (
              [...Array(4)].map((_, i) => (
                <Card key={i} className="bg-card border-border rounded-xl overflow-hidden">
                  <Skeleton className="h-48 w-full rounded-none" />
                  <CardContent className="p-5">
                    <Skeleton className="h-5 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))
            ) : recentItems.length === 0 ? (
              <div className="col-span-4 text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No items reported yet. Be the first to report one!</p>
              </div>
            ) : (
              recentItems.map(item => {
                const reporter = item.reportedBy;
                const reporterName = reporter?.firstName
                  ? `${reporter.firstName}${reporter.lastName ? " " + reporter.lastName[0] + "." : ""}`
                  : "Anonymous";
                return (
                  <Card key={item._id} className="bg-card overflow-hidden border-border group flex flex-col h-full hover:border-border hover:-translate-y-1 transition-all duration-300 shadow-lg rounded-xl">
                    <div className="h-48 bg-muted relative overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <Badge className={`absolute top-3 left-3 border-none font-bold tracking-widest text-[10px] ${item.status === "Found" ? "bg-green-500 hover:bg-green-500 text-primary-foreground" : "bg-red-500 hover:bg-red-500 text-primary-foreground"}`}>
                        {item.status?.toUpperCase()}
                      </Badge>
                    </div>
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg leading-tight line-clamp-1">{item.title}</h4>
                        <span className="text-[10px] text-muted-foreground uppercase opacity-70 tracking-wider capitalize ml-2 shrink-0">{item.category}</span>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground mb-5 flex-1">
                        {item.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 opacity-70 shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 opacity-70 shrink-0" />
                          <span>{timeAgo(item.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={reporter?.avatar} />
                            <AvatarFallback className="bg-primary/20 text-primary text-[9px] font-bold">
                              {reporter?.firstName?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs truncate">{reporterName}</span>
                        </div>
                      </div>
                      <SignedIn>
                        <Link to={`/item/${item._id}`}>
                          <Button variant="secondary" className="w-full bg-secondary hover:bg-primary text-foreground hover:text-primary-foreground font-semibold transition-all duration-200 ease-in-out">
                            View Details
                          </Button>
                        </Link>
                      </SignedIn>
                      <SignedOut>
                        <SignInButton mode="modal">
                          <Button variant="secondary" className="w-full bg-secondary hover:bg-primary text-foreground hover:text-primary-foreground font-semibold transition-all duration-200 ease-in-out">
                            {item.status === "Found" ? "This is mine" : "I found this"}
                          </Button>
                        </SignInButton>
                      </SignedOut>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="flex justify-center">
            <SignedIn>
              <Link to="/dashboard">
                <Button variant="secondary" className="bg-secondary hover:bg-primary text-foreground hover:text-primary-foreground font-semibold transition-all duration-200 ease-in-out rounded-full px-8 gap-2">
                  View All Items <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="secondary" className="bg-secondary hover:bg-primary text-foreground hover:text-primary-foreground font-semibold transition-all duration-200 ease-in-out rounded-full px-8 gap-2">
                  Sign In to View All <ArrowRight className="h-4 w-4" />
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 max-w-5xl mx-auto">
          <div className="bg-primary rounded-3xl p-12 md:p-16 text-center text-primary-foreground shadow-2xl relative overflow-hidden isolate">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Don't see your item?</h2>
            <p className="text-primary-foreground/90 md:text-lg max-w-2xl mx-auto mb-10 font-medium">
              Create a lost item report and we'll notify you as soon as a found claim is made.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <SignedIn>
                <Link to="/report">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold px-8 rounded-xl h-12 md:h-14 shadow-lg text-md">
                    Report Lost Item
                  </Button>
                </Link>
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold px-8 rounded-xl h-12 md:h-14 shadow-lg text-md">
                    Report Lost Item
                  </Button>
                </SignInButton>
              </SignedOut>
              <a href="#contact">
                <Button size="lg" variant="outline" className="border-white/30 hover:bg-secondary bg-transparent text-foreground font-bold px-8 rounded-xl h-12 md:h-14 text-md">
                  Contact Support
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer / Contact */}
      <footer id="contact" className="pt-16 pb-12 px-4 bg-[#212331] text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Box className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold tracking-tight text-white">Campus<span className="text-primary">Crate</span></span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed max-w-xs font-medium">
              Helping students reconnect with their belongings since 2026. Verified by University Administration.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white">Platform</h4>
            <ul className="space-y-3 text-sm text-gray-300 font-medium">
              <li><a href="#recent-items" className="hover:text-primary transition-colors duration-200 ease-in-out">Browse Items</a></li>
              <SignedIn>
                <li><Link to="/report" className="hover:text-primary transition-colors duration-200 ease-in-out">Report Lost Item</Link></li>
                <li><Link to="/dashboard" className="hover:text-primary transition-colors duration-200 ease-in-out">My Dashboard</Link></li>
              </SignedIn>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white">Help</h4>
            <ul className="space-y-3 text-sm text-gray-300 font-medium">
              <li><a href="#how-it-works" className="hover:text-primary transition-colors duration-200 ease-in-out">How It Works</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors duration-200 ease-in-out">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-300 font-medium">
              <li>
                <a href="mailto:registrarsbssu@gmail.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors duration-200 ease-in-out hover:text-primary cursor-pointer">
                  <Mail className="h-4 w-4 shrink-0" /> registrarsbssu@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:01874292879" onClick={(e) => handlePhoneClick(e, "0187-4292879")} className="flex items-center gap-2 transition-colors duration-200 ease-in-out hover:text-primary cursor-pointer" title="Click to call and copy">
                  <Phone className="h-4 w-4 shrink-0" /> 0187-4292879
                </a>
              </li>
              <li>
                <a href="https://maps.app.goo.gl/6swsR5Zy6DYvEi797" target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 transition-colors duration-200 ease-in-out hover:text-primary cursor-pointer">
                  <Building className="h-4 w-4 shrink-0 mt-0.5" /> <span>Sardar Beant Singh State University, National Highway 15, Gurdaspur, Punjab 143530</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      <div className="bg-[#2B2D3B] py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-white">
          <p>© {new Date().getFullYear()} Campus<span className="text-primary">Crate</span>. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/admin/login" className="flex items-center gap-1.5 text-rose-400 hover:text-primary transition-colors duration-200 ease-in-out font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

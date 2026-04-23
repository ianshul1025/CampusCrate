import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { 
  ArrowLeft, Info, Package, ShieldCheck, MoreVertical, 
  X, Lock, MessageSquare, Ban, RotateCcw 
} from "lucide-react";

import Navbar from "../components/Navbar";
import { fetchWithAuth, API_URL } from "../hooks/useApi";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useDbAuth } from "../context/AuthContext";

export default function BlockedMessages() {
  const { getToken } = useAuth();
  const { dbUser } = useDbAuth();
  const navigate = useNavigate();

  const [blockedConvs, setBlockedConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null); // ID of user being unblocked

  useEffect(() => {
    const fetchBlocked = async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth("/messages/blocked", {}, getToken);
        setBlockedConvs(res.data || []);
      } catch (err) {
        toast.error("Failed to load blocked conversations");
      } finally {
        setLoading(false);
      }
    };
    fetchBlocked();
  }, [getToken]);

  const handleUnblock = async (itemId) => {
    if (!itemId) return;
    setUnblocking(itemId);
    try {
      const res = await fetchWithAuth(`/users/toggle-block-chat/${itemId}`, { method: "POST" }, getToken);
      if (res.success) {
        toast.success(`Chat unblocked successfully`);
        // Re-fetching is safer
        const updated = await fetchWithAuth("/messages/blocked", {}, getToken);
        setBlockedConvs(updated.data || []);
      }
    } catch (err) {
      toast.error(err.message || "Failed to unblock");
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/messages")} className="rounded-xl bg-secondary border border-border">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Blocked Chats</h1>
            <p className="text-muted-foreground mt-1 text-sm">Manage users you've blocked. Unblock them to restore messaging.</p>
          </div>
        </div>

        <div className="grid gap-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl bg-secondary" />
            ))
          ) : blockedConvs.length === 0 ? (
            <div className="py-20 text-center bg-card/30 border border-dashed border-border rounded-3xl">
              <Ban className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-xl font-bold text-foreground mb-2">No blocked chats</h3>
              <p className="text-muted-foreground text-sm">You haven't blocked anyone yet. Safety first!</p>
              <Button variant="outline" className="mt-6 rounded-xl border-border hover:bg-secondary" onClick={() => navigate("/messages")}>
                Return to Messages
              </Button>
            </div>
          ) : (
            blockedConvs.map((conv) => {
              const otherUser = conv.latestMessage?.sender; // Minimal fallback
              return (
                <div key={conv.item._id} className="group relative bg-card/40 border border-border rounded-2xl p-5 flex items-center gap-5 hover:bg-secondary transition-all">
                  <div className="h-14 w-14 rounded-2xl bg-secondary border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {conv.item.imageUrl ? (
                      <img src={conv.item.imageUrl} alt={conv.item.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/50" />
                    )}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-foreground truncate text-lg">{conv.item.title}</h4>
                      <Badge variant="outline" className="text-[10px] border-red-500/20 text-red-400 bg-red-500/5 px-2">BLOCKED</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Avatar className="h-5 w-5">
                         <AvatarImage src={otherUser?.avatar} />
                         <AvatarFallback className="text-[8px] bg-primary/20 text-primary">{otherUser?.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">Conversation with {otherUser?.firstName || "Unknown User"}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="rounded-xl border-border hover:bg-primary/20 hover:text-primary hover:border-primary/30 transition-all gap-2"
                      onClick={() => handleUnblock(conv.item._id)}
                      disabled={unblocking === conv.item._id}
                    >
                      {unblocking === conv.item._id ? (
                        <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      Unblock
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-12 p-6 rounded-3xl bg-primary/5 border border-primary/10">
          <h3 className="flex items-center gap-2 font-bold text-foreground mb-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Safety Guidelines
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Blocking a user prevents them from sending you messages and hides their items from your active chat list. 
            If someone is being abusive or violating campus policies, please use the **Report User** feature as well.
          </p>
        </div>
      </main>
    </div>
  );
}

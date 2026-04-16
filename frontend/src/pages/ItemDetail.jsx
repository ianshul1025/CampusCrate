import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import {
  MapPin, Calendar, AlertCircle, CheckCircle2,
  ChevronRight, Share2, Bookmark, MessageSquare,
  ShieldCheck, Clock, Package, ArrowLeft, User,
  Pencil, Trash2, XCircle, Hourglass, Lock, Users, ThumbsUp, ThumbsDown,
  Link2, Twitter, Instagram, Linkedin, MessageCircle, Facebook
} from "lucide-react";

import Navbar from "../components/Navbar";
import { fetchWithAuth, API_URL } from "../hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useDbAuth } from "../context/AuthContext";

export default function ItemDetail() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const { dbUser, updateSavedItems } = useDbAuth();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [relatedItems, setRelatedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReturnAlert, setShowReturnAlert] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Claim state (non-owner)
  const [claimAnswer, setClaimAnswer] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [myExistingClaim, setMyExistingClaim] = useState(undefined); // undefined = still loading

  // Owner: incoming claims
  const [incomingClaims, setIncomingClaims] = useState([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [verifying, setVerifying] = useState(null); // claimId being verified

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        // Fetch item (public)
        const res = await fetch(`${API_URL}/items/${id}`);
        const data = await res.json();
        const fetchedItem = data.data;
        setItem(fetchedItem);

        // Fetch related items (same category)
        const relRes = await fetch(`${API_URL}/items`);
        const relData = await relRes.json();
        setRelatedItems(
          (relData.data || [])
            .filter(i => i._id !== id && i.category === fetchedItem?.category)
            .slice(0, 4)
        );

        // Fetch current user's existing claim for this item
        try {
          const claimData = await fetchWithAuth(`/claims/my-claim/${id}`, {}, getToken);
          setMyExistingClaim(claimData.data || null);
        } catch {
          setMyExistingClaim(null);
        }

        // If owner, fetch incoming claims
        // We check ownership after item loads, so we fetch speculatively
        try {
          const ic = await fetchWithAuth(`/claims/item/${id}`, {}, getToken);
          setIncomingClaims(ic.data || []);
        } catch {
          // Not the owner – silently ignore 403
          setIncomingClaims([]);
        }
      } catch (err) {
        setError("Failed to load item details.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  useEffect(() => {
    if (loading || myExistingClaim === undefined || !item) return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("claim") === "true") {
      const isOwnerCheck = dbUser?._id === item.reportedBy?._id || dbUser?.clerkId === item.reportedBy?.clerkId || dbUser?._id === item.reportedBy;
      if (!isOwnerCheck && !myExistingClaim) {
        setShowClaimForm(true);
      }
    }
  }, [loading, myExistingClaim, item, dbUser]);

  const handleClaim = async (e) => {
    e.preventDefault();
    setClaiming(true);
    try {
      const res = await fetchWithAuth(
        `/claims/${id}`,
        { method: "POST", body: JSON.stringify({ answer: claimAnswer }) },
        getToken
      );
      setMyExistingClaim(res.data);
      setShowClaimForm(false);
      toast.success("Claim submitted! The poster has been notified and will review it.");
    } catch (err) {
      toast.error(err.message || "Failed to submit claim.");
    } finally {
      setClaiming(false);
    }
  };

  const handleVerifyClaim = async (claimId, status) => {
    setVerifying(claimId);
    try {
      await fetchWithAuth(
        `/claims/${claimId}/verify`,
        { method: "PATCH", body: JSON.stringify({ status }) },
        getToken
      );
      setIncomingClaims(prev =>
        prev.map(c => c._id === claimId ? { ...c, status } : c)
      );
      toast.success(status === "approved" ? "Claim accepted! The claimant can now message you." : "Claim rejected.");
    } catch (err) {
      toast.error(err.message || "Failed to update claim.");
    } finally {
      setVerifying(null);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    setShowDeleteAlert(false);
    setDeleting(true);
    try {
      await fetchWithAuth(`/items/${id}`, { method: "DELETE" }, getToken);
      toast.success("Post deleted.");
      navigate("/my-posts");
    } catch (err) {
      toast.error(err.message || "Failed to delete.");
      setDeleting(false);
    }
  };

  const handleShareClick = () => {
    setShowShareModal(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleMarkReturned = async () => {
    setShowReturnAlert(true);
  };

  const handleToggleSave = async () => {
    if (!dbUser) {
      toast.error("Please log in to save items");
      return;
    }
    try {
      const res = await fetchWithAuth(`/items/${id}/save`, { method: "POST" }, getToken);
      if (res.success) {
        updateSavedItems(res.data);
        const isSaving = res.data.includes(id);
        toast.success(isSaving ? "Item saved to collections" : "Item removed from saved");
      }
    } catch (err) {
      toast.error("Failed to update saved status");
    }
  };

  const confirmMarkReturned = async () => {
    setShowReturnAlert(false);
    try {
      await fetchWithAuth(`/items/${id}/returned`, { method: "PATCH" }, getToken);
      setItem(prev => ({ ...prev, state: "returned" }));
      toast.success("Item marked as returned successfully.");
    } catch (err) {
      toast.error(err.message || "Failed to update item state.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full">
          <Skeleton className="h-5 w-72 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7 space-y-4">
              <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
              </div>
            </div>
            <div className="lg:col-span-5 space-y-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 py-32 flex flex-col items-center justify-center text-center px-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mb-6 opacity-50" />
          <h2 className="text-3xl font-bold mb-4">Item Not Found</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">The item you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/dashboard")} className="rounded-full px-8 h-12 font-bold">
            Back to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  if (item?.state === "returned") {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 py-32 flex flex-col items-center justify-center text-center px-4">
          <div className="h-24 w-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <CheckCircle2 className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-black mb-4">Item Locked</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            This item has been formally returned to its owner. All details, interactions, and incoming claims are securely locked down. The record will be permanently deleted after 12 hours.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="rounded-full px-8 h-12 font-bold bg-white text-black hover:bg-white/90">
            Return to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  const reporter = item.reportedBy;
  const reporterName = reporter?.firstName
    ? `${reporter.firstName}${reporter.lastName ? " " + reporter.lastName : ""}`
    : "Anonymous";
  const reporterInitials = reporter?.firstName?.[0]?.toUpperCase() || "?";
  const isOwner = dbUser?._id === reporter?._id || dbUser?.clerkId === reporter?.clerkId;
  const isLost = item.status === "Lost"; // LOST = poster lost something, viewer might be the finder

  const timeAgo = (d) => {
    if (!d) return "Recently";
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  // ---------- Dynamic copy based on Lost / Found ----------
  // LOST item: viewer is the Finder  → "I Found This Item"
  // FOUND item: viewer is the Owner  → "Claim This Item"
  const claimButtonLabel    = isLost ? "I Found This Item →" : "Claim This Item →";
  const claimPlaceholder    = isLost
    ? "Describe the item you found, where you found it, and any unique details that can help verify it"
    : "Describe identifying features to prove ownership";
  const verificationTitle   = isLost ? "Finder Verification" : "Ownership Verification Required";
  const verificationSubtext = isLost
    ? "To help the owner verify, describe exactly what you found and where."
    : "To claim this item, answer the security question set by the finder.";
  const chatPartnerLabel    = isLost ? "Owner" : "Finder";

  // ---------- Claim status display ----------
  const claimStatus = myExistingClaim?.status; // "pending" | "approved" | "rejected" | undefined (no claim)

  const renderActionPanel = () => {
    // --- Item owner sees incoming claims panel ---
    if (isOwner) {
      const pending   = incomingClaims.filter(c => c.status === "pending");
      const reviewed  = incomingClaims.filter(c => c.status !== "pending");

      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-bold text-white text-sm">
              Incoming Claims
              {incomingClaims.length > 0 && (
                <span className="ml-2 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                  {incomingClaims.length}
                </span>
              )}
            </span>
          </div>

          {incomingClaims.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No claims yet. You will be notified when someone submits one.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {[...pending, ...reviewed].map(claim => {
                const claimant = claim.claimantId;
                const name = claimant?.firstName
                  ? `${claimant.firstName}${claimant.lastName ? " " + claimant.lastName : ""}`
                  : "Anonymous";
                const initials = claimant?.firstName?.[0]?.toUpperCase() || "?";
                const isVerifying = verifying === claim._id;

                return (
                  <div
                    key={claim._id}
                    className={`rounded-xl border p-3 space-y-2 ${
                      claim.status === "pending"
                        ? "border-yellow-500/20 bg-yellow-500/5"
                        : claim.status === "approved"
                        ? "border-green-500/20 bg-green-500/5"
                        : "border-white/5 bg-white/5 opacity-60"
                    }`}
                  >
                    {/* Claimant info */}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 border border-white/10 shrink-0">
                        <AvatarImage src={claimant?.avatar} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{name}</p>
                        {claimant?.branch && (
                          <p className="text-[10px] text-muted-foreground truncate">{claimant.branch}</p>
                        )}
                      </div>
                      {claim.status === "pending" && (
                        <span className="text-[9px] font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full shrink-0">
                          PENDING
                        </span>
                      )}
                      {claim.status === "approved" && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded-full">
                            ACCEPTED
                          </span>
                          <Button
                            size="sm"
                            className="h-7 px-2.5 text-[10px] rounded-lg bg-primary hover:bg-primary/90 font-bold gap-1.5"
                            onClick={() => navigate(`/messages/${id}`)}
                          >
                            <MessageSquare className="h-3 w-3" />
                            Chat
                          </Button>
                        </div>
                      )}
                      {claim.status === "rejected" && (
                        <span className="text-[9px] font-bold text-muted-foreground bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full shrink-0">
                          REJECTED
                        </span>
                      )}
                    </div>

                    {/* Claim message */}
                    <p className="text-xs text-white/80 bg-black/20 rounded-lg px-3 py-2 leading-relaxed">
                      "{claim.message}"
                    </p>

                    {/* Submitted at timestamp */}
                    {claim.createdAt && (
                      <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        Submitted:{" "}
                        {new Date(claim.createdAt).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric"
                        })}{" "}
                        at{" "}
                        {new Date(claim.createdAt).toLocaleTimeString([], {
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    )}

                    {/* Accept / Reject buttons (only for pending) */}
                    {claim.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs rounded-lg bg-green-600 hover:bg-green-500 font-bold gap-1"
                          disabled={isVerifying}
                          onClick={() => handleVerifyClaim(claim._id, "approved")}
                        >
                          {isVerifying ? (
                            <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ThumbsUp className="h-3 w-3" />
                          )}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs rounded-lg border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold gap-1"
                          disabled={isVerifying}
                          onClick={() => handleVerifyClaim(claim._id, "rejected")}
                        >
                          {isVerifying ? (
                            <span className="h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ThumbsDown className="h-3 w-3" />
                          )}
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // --- Claim not yet loaded ---
    if (myExistingClaim === undefined) {
      return <Skeleton className="h-12 w-full rounded-xl" />;
    }

    // --- Claim approved → unlock messaging ---
    if (claimStatus === "approved") {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="font-bold text-green-400 text-sm">Claim Accepted</p>
              <p className="text-xs text-muted-foreground">The poster approved your claim. You may now chat.</p>
            </div>
          </div>
          <Button
            className="w-full rounded-xl h-11 font-bold bg-green-600 hover:bg-green-500"
            onClick={() => navigate(`/messages/${id}`)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Message {chatPartnerLabel}
          </Button>
        </div>
      );
    }

    // --- Claim pending ---
    if (claimStatus === "pending") {
      return (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <Hourglass className="h-5 w-5 text-yellow-400 shrink-0 animate-pulse" />
          <div>
            <p className="font-bold text-yellow-400 text-sm">Claim Pending Review</p>
            <p className="text-xs text-muted-foreground">
              Your claim was submitted. The poster will review and accept or reject it.
              Messaging will unlock after approval.
            </p>
          </div>
        </div>
      );
    }

    // --- Claim rejected (with 30-min cooldown logic) ---
    if (claimStatus === "rejected") {
      const diffInMs = Date.now() - new Date(myExistingClaim.updatedAt).getTime();
      const diffInMins = Math.floor(diffInMs / 60000);
      const remaining = 30 - diffInMins;

      if (remaining > 0) {
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="font-bold text-red-400 text-sm">Claim Not Accepted</p>
                <p className="text-xs text-muted-foreground">
                  The poster did not accept your claim. You can try again in {remaining} minutes.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Re-claiming available in {remaining}m
            </div>
          </div>
        );
      }
      // If more than 30 mins have passed, continue to show "No existing claim" (which shows the button)
    }

    // --- No existing claim → show claim form or button ---
    if (showClaimForm) {
      return (
        <form onSubmit={handleClaim} className="space-y-3">
          {item.claimQuestion && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                {isLost ? "Finder Question" : "Security Question"}
              </p>
              <p className="text-white/90 text-sm font-medium italic">"{item.claimQuestion}"</p>
            </div>
          )}
          <Textarea
            required
            placeholder={claimPlaceholder}
            value={claimAnswer}
            onChange={e => setClaimAnswer(e.target.value)}
            className="bg-black/40 border-white/10 resize-none h-28 rounded-xl text-sm"
          />
          <Button disabled={claiming} type="submit" className="w-full rounded-xl h-11 font-bold">
            {claiming ? "Submitting..." : "Submit →"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setShowClaimForm(false)}
          >
            Cancel
          </Button>
        </form>
      );
    }

    // Default: no claim yet, show the primary action button only
    return (
      <div className="space-y-3">
        <Button
          className="w-full rounded-xl h-11 font-bold text-base"
          onClick={() => setShowClaimForm(true)}
        >
          {claimButtonLabel}
        </Button>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Chat is locked until your claim is reviewed and approved by the poster.
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" /> Secure claim process verified by CampusCrate
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col">
      <Navbar />

      <main className="flex-1 bg-card/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Breadcrumbs & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center text-sm text-muted-foreground font-medium gap-2">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4 opacity-50" />
              <Link to="/dashboard" className="hover:text-white transition-colors">{isLost ? "Lost Items" : "Found Items"}</Link>
              <ChevronRight className="h-4 w-4 opacity-50" />
              <span className="text-white capitalize">{item.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 border-white/10 bg-white/5 hover:bg-white/10 rounded-full px-4" onClick={handleShareClick}>
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button 
                variant={dbUser?.savedItems?.includes(id) ? "secondary" : "outline"}
                size="sm" 
                className={`h-9 border-white/10 rounded-full px-4 transition-all ${dbUser?.savedItems?.includes(id) ? "bg-primary/20 text-primary border-primary/20 hover:bg-primary/30" : "bg-white/5 hover:bg-white/10 text-white/80"}`}
                onClick={handleToggleSave}
              >
                <Bookmark className={`h-4 w-4 mr-2 ${dbUser?.savedItems?.includes(id) ? "fill-primary" : ""}`} /> 
                {dbUser?.savedItems?.includes(id) ? "Saved" : "Save"}
              </Button>
              {/* Owner quick actions */}
              {isOwner && (
                <>
                  {item.state !== "returned" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 border-green-500/30 bg-green-500/5 hover:bg-green-500/10 text-green-400 rounded-full px-4"
                      onClick={handleMarkReturned}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Returned
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary rounded-full px-4"
                    onClick={() => navigate(`/edit-item/${id}`)}
                  >
                    <Pencil className="h-4 w-4 mr-2" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-full px-4"
                    onClick={handleDeleteClick}
                    disabled={deleting}
                  >
                    {deleting ? <span className="animate-spin h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Title Row */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">{item.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {item.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  {isLost ? "Lost near" : "Found at"} {item.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {timeAgo(item.createdAt)}
              </span>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12">

            {/* LEFT: Image + Details */}
            <div className="lg:col-span-7 space-y-6">

              {/* Main Image */}
              <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/40 aspect-[4/3] relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black/20 text-muted-foreground">
                    <Package className="h-20 w-20 text-white/10 mb-4" />
                    <span className="text-sm font-bold text-white/30 uppercase tracking-widest text-center px-4">No image uploaded</span>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge className={`font-bold tracking-widest text-xs px-3 py-1.5 uppercase border-none ${isLost ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
                    {item.status}
                  </Badge>
                </div>
                {item.imageUrl && (
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white font-medium">
                    1 / 1 Photo
                  </div>
                )}
              </div>

              {/* Item Details Section */}
              <Card className="bg-card/40 border-white/5 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-5 text-white">Item Details</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Category</p>
                    <p className="text-white font-medium capitalize">{item.category}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Status</p>
                    <p className={`font-bold capitalize ${isLost ? "text-red-400" : "text-green-400"}`}>{item.status}</p>
                  </div>
                  {item.location && (
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Location</p>
                      <p className="text-white font-medium flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> {item.location}
                      </p>
                    </div>
                  )}
                  {item.date && (
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-1">Date</p>
                      <p className="text-white font-medium flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        {new Date(item.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  )}
                </div>

                {item.description && (
                  <div className="mt-5 pt-5 border-t border-white/5">
                    <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-2">Description</p>
                    <p className="text-white/90 leading-relaxed text-sm">{item.description}</p>
                  </div>
                )}
              </Card>

              {/* Verification Card – shown only when no existing claim and form not showing */}
              {!isOwner && !myExistingClaim && item.claimQuestion && (
                <Card className="bg-primary/5 border border-primary/20 rounded-2xl p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-bold text-white mb-1">{verificationTitle}</h3>
                      <p className="text-sm text-muted-foreground">{verificationSubtext}</p>
                    </div>
                  </div>
                  <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
                      {isLost ? "Finder Question" : "Security Question"}
                    </p>
                    <p className="text-white/90 text-sm font-medium italic">"{item.claimQuestion}"</p>
                  </div>
                </Card>
              )}
            </div>

            {/* RIGHT: Sidebar Actions */}
            <div className="lg:col-span-5 space-y-5">

              {/* Status & Reporter Card */}
              <Card className="bg-card/40 border-white/5 rounded-2xl overflow-hidden">
                <div className="p-5 flex items-center justify-between border-b border-white/5">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${isLost ? "bg-red-500" : "bg-green-500"} animate-pulse`} />
                      <span className={`font-bold text-sm ${isLost ? "text-red-400" : "text-green-400"}`}>
                        {isLost ? "Actively Searching" : "Available to Claim"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">{isLost ? "Lost by" : "Found by"}</p>
                    <p className="text-white font-bold text-sm">{reporter?.firstName || "Anonymous"}</p>
                  </div>
                </div>

                <div className="p-5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 border border-white/10">
                      <AvatarImage src={reporter?.avatar} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold">{reporterInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-white">{reporterName}</p>
                      <p className="text-xs text-muted-foreground">
                        {reporter?.branch ? `${reporter.branch} • Sem ${reporter.semester}` : "Verified Campus Member"}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </div>
                  </div>
                </div>

                {/* Dynamic Action Panel */}
                <div className="p-5 space-y-3">
                  {renderActionPanel()}
                </div>
              </Card>

              {/* Location & Time Card */}
              <Card className="bg-card/40 border-white/5 rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4 text-sm">Location {isLost ? "Lost" : "Found"}</h3>
                {/* Placeholder Map Visual */}
                <div className="h-32 bg-white/5 rounded-xl flex items-center justify-center mb-4 border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 to-green-950/20" />
                  <div className="relative z-10 flex flex-col items-center gap-2 text-muted-foreground">
                    <MapPin className="h-7 w-7 text-primary" />
                    <span className="text-xs font-medium text-center px-4">{item.location || "Location not specified"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/5 rounded-xl p-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                      {isLost ? "Date Lost" : "Date Found"}
                    </p>
                    <p className="text-sm text-white font-medium">
                      {item.date ? new Date(item.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Unknown"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Similar Items */}
          {relatedItems.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-bold tracking-tight mb-6">Similar Items</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {relatedItems.map(rel => (
                  <Link to={`/item/${rel._id}`} key={rel._id} className="group block">
                    <Card className="bg-card border-white/5 hover:border-white/10 hover:-translate-y-1 transition-all duration-300 rounded-xl overflow-hidden">
                      <div className="h-40 bg-white/5 relative overflow-hidden">
                        {rel.imageUrl ? (
                          <img src={rel.imageUrl} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-10 w-10 text-white/5" />
                          </div>
                        )}
                        <div className="absolute top-3 right-3 text-[10px] font-bold text-muted-foreground bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                          {rel.status === "Found" ? "Found " : "Lost "}{timeAgo(rel.createdAt)}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-bold text-white group-hover:text-primary transition-colors truncate">{rel.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{rel.location}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Footer spacer */}
          <div className="h-16" />
        </div>
      </main>

      <AlertDialog open={showReturnAlert} onOpenChange={setShowReturnAlert}>
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
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
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

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="bg-card border-white/10 text-white rounded-2xl shadow-2xl p-10 max-w-2xl mx-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 mb-1">
              <Share2 className="h-6 w-6 text-primary" /> Share this item
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Help reconnect this item with its owner by sharing it across your networks.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 mt-6">
            <a href={`https://api.whatsapp.com/send?text=Check out this item on CampusCrate: ${window.location.href}`} target="_blank" rel="noreferrer" className="flex flex-col flex-1 items-center gap-2 group">
               <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-all">
                 <MessageCircle className="h-6 w-6" />
               </div>
               <span className="text-xs font-semibold text-muted-foreground group-hover:text-white">WhatsApp</span>
            </a>
            <a href={`https://twitter.com/intent/tweet?url=${window.location.href}&text=Check out this item on CampusCrate`} target="_blank" rel="noreferrer" className="flex flex-col flex-1 items-center gap-2 group">
               <div className="w-14 h-14 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
                 <Twitter className="h-6 w-6" />
               </div>
               <span className="text-xs font-semibold text-muted-foreground group-hover:text-white">Twitter</span>
            </a>
            <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${window.location.href}`} target="_blank" rel="noreferrer" className="flex flex-col flex-1 items-center gap-2 group">
               <div className="w-14 h-14 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                 <Linkedin className="h-6 w-6" />
               </div>
               <span className="text-xs font-semibold text-muted-foreground group-hover:text-white">LinkedIn</span>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`} target="_blank" rel="noreferrer" className="flex flex-col flex-1 items-center gap-2 group">
               <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                 <Facebook className="h-6 w-6" />
               </div>
               <span className="text-xs font-semibold text-muted-foreground group-hover:text-white">Facebook</span>
            </a>
          </div>
          <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
             <div className="flex-1 overflow-hidden bg-white/5 rounded-xl flex items-center px-4 border border-white/10 text-sm text-muted-foreground truncate select-all">
               {window.location.href}
             </div>
             <Button className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-6" onClick={copyToClipboard}>
               <Link2 className="h-4 w-4 mr-2" /> Copy Link
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

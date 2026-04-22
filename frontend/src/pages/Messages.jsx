import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Send, ArrowLeft, Info, Package, ShieldCheck, MoreVertical, X, Lock, CheckCircle2, Hourglass, XCircle, MessageSquare, Flag, Ban } from "lucide-react";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";

import Navbar from "../components/Navbar";
import { fetchWithAuth, API_URL } from "../hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useDbAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Check, CheckCheck } from "lucide-react";

export default function Messages() {
  const { itemId, otherUserId: urlOtherUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const { dbUser } = useDbAuth();
  const { socket, typingUsers, emitTyping, stopTyping } = useSocket();
  const bottomRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [item, setItem] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [convLoading, setConvLoading] = useState(true);
  const [error, setError] = useState("");
  const [claimStatus, setClaimStatus] = useState(null);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [showBlockAlert, setShowBlockAlert] = useState(false);
  const [showReportAlert, setShowReportAlert] = useState(false);
  const [reportSending, setReportSending] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [otherUser, setOtherUser] = useState(null); // Now stores full object { _id, firstName, ... }
  const [conversationId, setConversationId] = useState(null);

  // 1. Fetch all conversations for the sidebar
  const fetchConversations = useCallback(async () => {
    try {
      setConvLoading(true);
      const res = await fetchWithAuth("/messages", {}, getToken);
      setConversations(res.data || []);
    } catch (err) {
      toast.error("Failed to load conversations.");
    } finally {
      setConvLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 2. Fetch specific chat details when itemId changes
  useEffect(() => {
    if (!itemId) {
      setItem(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    const loadChat = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch item details
        const itemRes = await fetch(`${API_URL}/items/${itemId}`);
        const itemData = await itemRes.json();
        const itemDataClean = itemData.data;
        
        if (!itemDataClean) {
          setError("Item not found");
          setLoading(false);
          return;
        }
        
        setItem(itemDataClean);

        // Fetch claim status
        try {
          const claimData = await fetchWithAuth(`/claims/my-claim/${itemId}`, {}, getToken);
          setClaimStatus(claimData.data?.status || null);
        } catch { setClaimStatus(null); }

        // Fetch messages
        try {
          const resData = await fetchWithAuth(`/messages/${itemId}`, {}, getToken);
          const { messages: msgs, conversationId: cId, otherUser: oUser } = resData.data || {};
          setMessages(msgs || []);
          setConversationId(cId);
          
          if (oUser) {
              setOtherUser(oUser);
          } else if (urlOtherUserId) {
              // Basic fallback
              setOtherUser({ _id: urlOtherUserId, firstName: "User" });
          }

          // Mark as read
          await fetchWithAuth(`/messages/${itemId}/read`, { method: "PATCH" }, getToken);
          
          // Update local conversation list unread count
          setConversations(prev => prev.map(c => 
            c.item?._id === itemId ? { ...c, unreadCount: 0 } : c
          ));
        } catch (err) {
          setMessages([]);
          setError(err.message || "Failed to load messages.");
        }
      } catch (err) {
        setError("Failed to load conversation.");
      } finally {
        setLoading(false);
      }
    };
    loadChat();

    // Socket listeners for this specific chat
    if (socket && conversationId) {
      socket.emit("join_chat", conversationId);

      socket.on("new_message", (message) => {
        // 1. Update sidebar latest message & unread count
        // 1. Update sidebar latest message & unread count
        setConversations(prev => {
          const msgConvId = String(message.conversation?._id || message.conversation);
          const exists = prev.find(c => String(c._id) === msgConvId);
          
          if (!exists) {
            // New conversation discovered, refresh the list
            fetchConversations();
            return prev;
          } 
          
          return prev.map(c => 
            String(c._id) === msgConvId
              ? { 
                  ...c, 
                  latestMessage: message, 
                  unreadCount: (msgConvId === String(conversationId)) ? 0 : (c.unreadCount + 1) 
                } 
              : c
          ).sort((a, b) => {
            const dateA = new Date(a.latestMessage?.createdAt || 0);
            const dateB = new Date(b.latestMessage?.createdAt || 0);
            return dateB - dateA;
          });
        });

        // 2. Append to message list if active
        const msgConvId = String(message.conversation?._id || message.conversation);
        const currentConvId = conversationId ? String(conversationId) : null;
        if (msgConvId !== currentConvId) return;
        
        // Ignore my own messages (already added optimistically)
        if (message.sender?._id === dbUser?._id || message.sender?._id === dbUser?.mongoId) return;

        setMessages(prev => {
          if (prev.find(m => m._id === message._id)) return prev;
          return [...prev, message];
        });

        // 3. Emit delivered status
        socket.emit("message_delivered", { 
            messageId: message._id, 
            conversationId: conversationId, 
            senderId: message.sender?._id || message.sender 
        });

        // 4. Mark as read immediately if window is active
        if (document.visibilityState === "visible") {
            socket.emit("message_read", { 
                messageId: message._id, 
                conversationId: conversationId, 
                senderId: message.sender?._id || message.sender 
            });
            fetchWithAuth(`/messages/${itemId}/read`, { method: "PATCH" }, getToken).catch(() => {});
        }
      });

      socket.on("message_status", ({ messageId, conversationId: statusConvId, status }) => {
          // Update message list if it's the active chat
          if (statusConvId === conversationId) {
            setMessages(prev => prev.map(m => 
                m._id === messageId ? { ...m, status } : m
            ));
          }
          // Always update sidebar if it's the latest message
          setConversations(prev => prev.map(c => 
              c.latestMessage?._id === messageId ? { ...c, latestMessage: { ...c.latestMessage, status } } : c
          ));
      });
    }

    return () => {
      if (socket) {
        socket.off("new_message");
        socket.off("message_status");
        if (conversationId) socket.emit("leave_chat", conversationId);
      }
    };
  }, [itemId, urlOtherUserId, socket, conversationId]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !itemId) return;
    setSending(true);

    const optimistic = {
      _id: `temp-${Date.now()}`,
      message: newMessage,
      sender: { _id: dbUser?._id, firstName: dbUser?.firstName, avatar: dbUser?.avatar },
      createdAt: new Date().toISOString(),
      status: "sent",
      isMe: true
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage("");

    try {
      const res = await fetchWithAuth(
        `/messages/${itemId}`,
        { method: "POST", body: JSON.stringify({ message: newMessage }) },
        getToken
      );
      setMessages(prev => prev.map(m => m._id === optimistic._id ? { ...res.data, isMe: true } : m));
      
      // Update sidebar preview
      setConversations(prev => prev.map(c => 
        c._id === conversationId ? { ...c, latestMessage: res.data } : c
      ));
    } catch (err) {
      toast.error(err.message || "Failed to send message.");
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
    } finally {
      setSending(false);
    }
  };

  const isMe = (msg) => {
    if (msg.isMe) return true;
    const s = msg.sender;
    if (!s) return false;
    return s._id === dbUser?._id || s._id === dbUser?.mongoId || s.clerkId === dbUser?.clerkId;
  };

  const handleToggleBlock = async () => {
    if (!item || !dbUser) return;
    
    try {
        const res = await fetchWithAuth(`/users/toggle-block-chat/${itemId}`, { method: "POST" }, getToken);
        if (res.success) {
            toast.success("Chat has been blocked successfully.");
            setChatMenuOpen(false);
            setShowBlockAlert(false);
            setConversations(prev => prev.filter(c => c.item?._id !== itemId));
            navigate("/messages");
        }
    } catch (err) {
        toast.error(err.message || "Failed to block chat");
    }
  };

  const handleReportUser = async () => {
    try {
      setReportSending(true);
      const otherUserObj = conversations.find(c => c.item?._id === itemId)?.otherUser || messages.find(m => !isMe(m))?.sender;
      if (!otherUserObj) throw new Error("Could not identify user to report.");

      const snapshot = messages.slice(-5).map(m => ({
        senderId: String(isMe(m) ? dbUser._id : otherUserObj._id),
        senderName: String(isMe(m) ? "You" : (otherUserObj.firstName || "User")),
        senderAvatar: String(isMe(m) ? dbUser.avatar : otherUserObj.avatar || ""),
        message: String(m.message),
        createdAt: new Date(m.createdAt)
      }));

      await fetchWithAuth(`/users/report/${otherUserObj._id}`, {
        method: "POST",
        body: JSON.stringify({
          reason: "other",
          description: "Report specific to chat behavior.",
          itemId: itemId,
          chatId: itemId,
          itemName: item?.title || "Unknown Item",
          reportedUserName: otherUserObj.firstName || "User",
          reporterName: dbUser.firstName || "You",
          lastFiveMessages: snapshot
        })
      }, getToken);

      toast.success("Report submitted successfully to Admin.");
      setShowReportAlert(false);
    } catch (err) {
      toast.error(err.message || "Failed to submit report.");
    } finally {
      setReportSending(false);
    }
  };

  const getSenderName = (msg) => {
    const s = msg.sender;
    if (!s) return "User";
    return s.firstName ? `${s.firstName}${s.lastName ? " " + s.lastName : ""}` : (s.name || "User");
  };

  const formatTime = (d) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredConversations = conversations?.filter(conv => {
    if (!chatSearch.trim()) return true;
    const query = chatSearch.toLowerCase();
    const otherUserName = (conv.otherUser?.firstName || "").toLowerCase() + " " + (conv.otherUser?.lastName || "").toLowerCase();
    const itemTitle = (conv.item?.title || "").toLowerCase();
    return otherUserName.includes(query) || itemTitle.includes(query);
  });

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground font-sans flex flex-col">
      <Navbar />

      <div className="flex flex-1 min-h-0 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 gap-4 sm:gap-6">

        {/* LEFT: Conversation List */}
        <aside className={`${itemId ? "hidden lg:flex" : "flex"} w-full lg:w-[320px] shrink-0 flex-col bg-card/30 border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/20`}>
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5 relative">
            <h2 className="font-bold text-xl tracking-tight">Messages</h2>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 rounded-lg transition-colors ${sidebarMenuOpen ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                onClick={() => setSidebarMenuOpen(!sidebarMenuOpen)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              
              {sidebarMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSidebarMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      onClick={() => {
                        setSidebarMenuOpen(false);
                        navigate("/blocked-messages");
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Ban className="h-4 w-4" /> Blocked Chats
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Input
                placeholder="Search chats..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="bg-white/5 border-white/10 h-10 rounded-xl text-sm pl-9 pr-8"
              />
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              {chatSearch && (
                <button 
                  onClick={() => setChatSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {convLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : filteredConversations && filteredConversations.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-sm text-muted-foreground">
                  {chatSearch ? "No chats match your search." : "No active conversations yet."}
                </p>
              </div>
            ) : (
              filteredConversations && filteredConversations.map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => conv.otherUser?._id && navigate(`/messages/${conv.item?._id}/${conv.otherUser._id}`)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative border ${
                    // Highlight if this is the active user
                    location.pathname.includes(conv.otherUser?._id)
                      ? "bg-primary/20 border-primary/30"
                      : "hover:bg-white/5 border-transparent"
                  }`}
                >
                  {/* Participant Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12 rounded-xl border border-white/10 shadow-lg group-hover:scale-105 transition-transform duration-200">
                      <AvatarImage src={conv.otherUser?.avatar} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-black">
                        {conv.otherUser?.firstName?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {/* Tiny Item Thumbnail overlay */}
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-lg bg-card border border-white/10 overflow-hidden shadow-md flex items-center justify-center p-0.5">
                      {conv.item?.imageUrl ? (
                        <img src={conv.item.imageUrl} alt={conv.item.title} className="w-full h-full object-cover rounded-sm" />
                      ) : (
                        <Package className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Chat Info */}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`font-bold text-sm truncate ${itemId === conv.item?._id ? "text-white" : "text-white/90"}`}>
                        {conv.otherUser?.firstName || "User"}
                      </p>
                      {conv.latestMessage && (
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {formatTime(conv.latestMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-black text-primary/80 uppercase tracking-tighter truncate max-w-[120px]">
                        {conv.item?.title || "Unknown Item"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                       <p className={`text-xs truncate flex-1 leading-snug ${conv.unreadCount > 0 ? "text-white font-black" : "text-muted-foreground"}`}>
                        {conv.latestMessage?.sender?._id === dbUser?._id && (
                          <span className="text-primary/70 mr-1 font-bold">You:</span>
                        )}
                        {conv.latestMessage?.message || "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="h-5 min-w-[20px] px-1.5 bg-primary rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 animate-pulse shadow-lg shadow-primary/20">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT: Chat Window */}
        <main className={`${!itemId ? "hidden lg:flex" : "flex"} flex-1 flex-col bg-card/30 border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 relative`}>
          {!itemId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 animate-bounce duration-3000">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Open any chat to start conversation</h3>
              <p className="text-muted-foreground max-w-sm">
                Select a conversation from the left sidebar to begin Messaging or view previously opened chats.
              </p>
            </div>
          ) : loading ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-white/5 flex items-center gap-4">
                <Skeleton className="h-11 w-11 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex-1 p-5 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className={`h-16 rounded-2xl ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              {item && (
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-4 bg-white/5 backdrop-blur-sm z-10">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white rounded-lg lg:hidden" onClick={() => navigate("/messages")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="h-11 w-11 rounded-xl border border-white/10 overflow-hidden bg-white/5 shrink-0">
                    <Avatar className="h-full w-full rounded-none">
                      <AvatarImage src={otherUser?.avatar} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-black">
                        {otherUser?.firstName?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg text-white truncate">
                        {otherUser?.firstName ? `${otherUser.firstName} ${otherUser.lastName || ""}` : "User"}
                      </p>
                      {claimStatus === "approved" && <Badge className="text-[9px] font-bold text-green-400 border-green-400/30 bg-green-400/10 px-1.5 py-0.5">APPROVED</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground truncate font-medium">
                        {item.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/item/${itemId}`}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white rounded-xl">
                        <Info className="h-4 w-4" />
                      </Button>
                    </Link>
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-9 w-9 rounded-xl transition-colors ${chatMenuOpen ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                        onClick={() => setChatMenuOpen(!chatMenuOpen)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      
                      {chatMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setChatMenuOpen(false)} />
                          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                            <button
                              onClick={() => {
                                setChatMenuOpen(false);
                                setShowReportAlert(true);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-white/5 transition-colors border-b border-white/5"
                            >
                              <Flag className="h-4 w-4" /> Report User
                            </button>
                            <button
                              onClick={() => {
                                setChatMenuOpen(false);
                                setShowBlockAlert(true);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            >
                              <Ban className="h-4 w-4" /> Block User
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              {item?.state === "returned" && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-red-400" />
                  <p className="text-xs font-bold text-red-400">
                    Item Marked as Returned. Chat disabled. Conversation will auto-delete soon.
                  </p>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {error ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                    <XCircle className="h-10 w-10 mb-3 opacity-30" />
                    <p className="font-semibold">{error}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-16">
                    <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center"><ShieldCheck className="h-8 w-8 text-primary/40" /></div>
                    <div>
                      <p className="text-lg font-bold text-white mb-2">No messages yet</p>
                      <p className="text-sm text-muted-foreground max-w-xs">Send a message to start the conversation.</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const mine = isMe(msg);
                    return (
                      <div key={msg._id || idx} className={`flex items-end gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-8 w-8 border border-white/10 shrink-0 mb-1">
                          <AvatarImage src={mine ? dbUser?.avatar : msg.sender?.avatar} />
                          <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-bold">
                            {(mine ? dbUser?.firstName?.[0] : msg.sender?.firstName?.[0] || "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col max-w-[70%] ${mine ? "items-end" : "items-start"}`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed relative ${mine ? "bg-primary text-white rounded-br-none shadow-lg shadow-primary/20" : "bg-white/10 text-white rounded-bl-none"}`}>
                            {msg.message}
                            {mine && msg._id && !msg._id.startsWith("temp-") && (
                                <div className="absolute bottom-1 right-2 flex items-center">
                                    {msg.status === "sent" && <Check className="h-3 w-3 text-white/50" />}
                                    {msg.status === "delivered" && <CheckCheck className="h-3 w-3 text-white/50" />}
                                    {msg.status === "read" && <CheckCheck className="h-3 w-3 text-blue-300" />}
                                </div>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1 px-1">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
                
                {/* Typing Indicator */}
                {conversationId && typingUsers.get(conversationId)?.size > 0 && (
                  <div className="flex items-center gap-2 px-6 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                      <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium italic">
                      Someone is typing...
                    </span>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-white/5 flex items-center gap-3 relative overflow-hidden">
                {item?.state === "returned" && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
                    <p className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" /> Interaction Locked
                    </p>
                  </div>
                )}
                <Input
                  value={newMessage}
                  onChange={e => {
                      setNewMessage(e.target.value);
                      emitTyping(conversationId, otherUser?._id);
                  }}
                  onBlur={() => stopTyping(conversationId, otherUser?._id)}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border-white/10 h-11 rounded-xl text-sm"
                  disabled={sending || item?.state === "returned"}
                />
                <Button 
                    type="submit" 
                    size="icon" 
                    className="h-11 w-11 rounded-xl shrink-0 bg-primary hover:bg-primary/90" 
                    disabled={sending || !newMessage.trim() || item?.state === "returned"}
                    onClick={() => stopTyping(conversationId, otherUser?._id)}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </>
          )}
        </main>
      </div>


      <AlertDialog open={showBlockAlert} onOpenChange={setShowBlockAlert}>
        <AlertDialogContent className="bg-card border-white/10 text-white rounded-2xl shadow-2xl p-8 max-w-lg mx-auto backdrop-blur-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Ban className="h-7 w-7 text-red-500" />
              Block this User?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-lg mt-2">
              The user will be blocked and now no one can chat unless you unblock them. Blocked chats will move to the "Blocked Chats" category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogCancel className="rounded-xl px-6 h-12 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggleBlock}
              className="rounded-xl px-6 h-12 bg-red-600 hover:bg-red-500 text-white font-bold border-0"
            >
              Confirm Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showReportAlert} onOpenChange={setShowReportAlert}>
        <AlertDialogContent className="bg-card border-white/10 text-white rounded-2xl shadow-2xl p-8 max-w-lg mx-auto backdrop-blur-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Flag className="h-7 w-7 text-yellow-500" />
              Report this User?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-lg mt-2">
              Are you sure you want to report this user? The last 5 messages from this chat will be forwarded securely to the Administrator for review. 
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-8">
            <AlertDialogCancel disabled={reportSending} className="rounded-xl px-6 h-12 border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReportUser}
              disabled={reportSending}
              className="rounded-xl px-6 h-12 bg-yellow-600 hover:bg-yellow-500 text-white font-bold border-0"
            >
              {reportSending ? "Submitting..." : "Submit Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

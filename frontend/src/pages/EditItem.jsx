import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { IKContext, IKUpload } from "imagekitio-react";
import {
  Laptop, Shirt, FileText, Key, Briefcase, Package,
  MapPin, Calendar, UploadCloud, X, ArrowLeft, Search, CheckCircle2,
  Book, CreditCard
} from "lucide-react";

import Navbar from "../components/Navbar";
import { fetchWithAuth, API_URL } from "../hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const categories = [
  { id: "electronics", label: "Electronics", icon: Laptop },
  { id: "clothings", label: "Clothings", icon: Shirt },
  { id: "keys", label: "Keys", icon: Key },
  { id: "ids", label: "IDs", icon: CreditCard },
  { id: "books", label: "Books", icon: Book },
  { id: "bags", label: "Bags", icon: Briefcase },
  { id: "other", label: "Other", icon: Package },
];

export default function EditItem() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load existing item data
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`${API_URL}/items/${id}`);
        const data = await res.json();
        const item = data.data;
        setFormData({
          status: item.status || "Lost",
          title: item.title || "",
          description: item.description || "",
          category: item.category || "other",
          location: item.location || "",
          date: item.date ? new Date(item.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          claimQuestion: item.claimQuestion || "",
          imageUrl: item.imageUrl || "",
        });
      } catch {
        toast.error("Failed to load item data.");
        navigate("/my-posts");
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const authenticator = async () => {
    const response = await fetchWithAuth("/auth/imagekit-auth", {}, getToken);
    return { signature: response.signature, expire: response.expire, token: response.token };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchWithAuth(
        `/items/${id}`,
        { method: "PATCH", body: JSON.stringify(formData) },
        getToken
      );
      toast.success("Item updated successfully!");
      navigate("/my-posts");
    } catch (err) {
      toast.error(err.message || "Failed to update item.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-12 w-full space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-14 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col">
      <Navbar />

      <main className="flex-1 py-10 lg:py-16 relative">
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent z-0 pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">

          <Button
            variant="ghost"
            onClick={() => navigate("/my-posts")}
            className="mb-8 text-muted-foreground hover:text-foreground hover:bg-secondary pl-0"
          >
            <ArrowLeft size={18} className="mr-2" /> Back to My Posts
          </Button>

          <div className="mb-10">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 text-foreground">Edit Post</h1>
            <p className="text-xl text-muted-foreground">Update the details of your reported item.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10 lg:space-y-12">

            {/* STEP 1: Type */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30">1</div>
                <h2 className="text-2xl font-bold text-foreground">Report Type</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 ml-11">
                <label className={`cursor-pointer border-2 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all ${formData.status === "Lost" ? "border-primary bg-primary/10" : "border-border bg-card/30 hover:bg-secondary"}`}>
                  <input type="radio" name="status" value="Lost" checked={formData.status === "Lost"} onChange={handleChange} className="sr-only" />
                  <Search className={`h-8 w-8 ${formData.status === "Lost" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <p className={`font-bold text-lg ${formData.status === "Lost" ? "text-primary" : "text-foreground"}`}>I Lost Something</p>
                    <p className="text-xs text-muted-foreground mt-1">I am looking for my own item</p>
                  </div>
                </label>
                <label className={`cursor-pointer border-2 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all ${formData.status === "Found" ? "border-green-500 bg-green-500/10" : "border-border bg-card/30 hover:bg-secondary"}`}>
                  <input type="radio" name="status" value="Found" checked={formData.status === "Found"} onChange={handleChange} className="sr-only" />
                  <CheckCircle2 className={`h-8 w-8 ${formData.status === "Found" ? "text-green-500" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <p className={`font-bold text-lg ${formData.status === "Found" ? "text-green-500" : "text-foreground"}`}>I Found Something</p>
                    <p className="text-xs text-muted-foreground mt-1">I want to return an item to its owner</p>
                  </div>
                </label>
              </div>
            </div>

            {/* STEP 2: Category & Title */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30">2</div>
                <h2 className="text-2xl font-bold text-foreground">Item Info</h2>
              </div>
              <div className="ml-11 space-y-6">
                <div>
                  <Label className="text-base text-muted-foreground mb-3 block">Category</Label>
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    {categories.map(cat => {
                      const Icon = cat.icon;
                      const isSelected = formData.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${isSelected ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary hover:bg-secondary text-muted-foreground"}`}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-base text-muted-foreground">Title</Label>
                  <Input name="title" required placeholder="e.g., Navy Blue Herschel Backpack" value={formData.title} onChange={handleChange} className="h-14 bg-card border-border text-lg rounded-xl" />
                </div>
              </div>
            </div>

            {/* STEP 3: Details */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30">3</div>
                <h2 className="text-2xl font-bold text-foreground">Specific Details</h2>
              </div>
              <div className="ml-11 space-y-6">
                <div className="space-y-2">
                  <Label className="text-base text-muted-foreground">Detailed Description</Label>
                  <Textarea name="description" required className="min-h-[140px] bg-card border-border rounded-xl p-4 resize-none" placeholder="Identifying details like color, brand, condition, distinctive marks..." value={formData.description} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-base text-muted-foreground">{formData.status === "Lost" ? "Where did you lose it?" : "Where did you find it?"}</Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input name="location" required placeholder="e.g., Science Library 2nd Fl" value={formData.location} onChange={handleChange} className="h-14 pl-12 bg-card border-border rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base text-muted-foreground">Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                      <Input name="date" type="date" required value={formData.date} onChange={handleChange} className="h-14 pl-12 bg-card border-border rounded-xl [&::-webkit-calendar-picker-indicator]:invert-[0.8] cursor-pointer" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-base text-muted-foreground">Claim Verification Question <span className="text-muted-foreground/50 text-sm font-normal">(Optional)</span></Label>
                  <Input name="claimQuestion" placeholder="e.g., What is the lock screen wallpaper?" value={formData.claimQuestion} onChange={handleChange} className="h-14 bg-card border-border rounded-xl" />
                </div>
              </div>
            </div>

            {/* STEP 4: Photo */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30">4</div>
                <h2 className="text-2xl font-bold text-foreground">Photo</h2>
              </div>
              <div className="ml-11">
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${formData.imageUrl ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 bg-secondary"}`}>
                  {formData.imageUrl ? (
                    <div className="flex flex-col items-center relative group isolate">
                      <div className="absolute inset-0 bg-card opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center z-10 backdrop-blur-sm">
                        <Button variant="destructive" type="button" onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))} className="rounded-full font-bold">
                          <X className="mr-2 h-4 w-4" /> Remove Photo
                        </Button>
                      </div>
                      <img src={formData.imageUrl} alt="Item" className="h-56 rounded-xl object-contain ring-1 ring-white/10 relative z-0" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center mb-5">
                        <UploadCloud className="h-7 w-7 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">Upload a new photo</h3>
                      <p className="text-muted-foreground mb-6 text-sm">Max 5MB.</p>
                      <IKContext publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY} urlEndpoint={import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT} authenticator={authenticator}>
                        <IKUpload
                          style={{ display: "none" }}
                          ref={fileInputRef}
                          fileName="campus_crate_item.jpg"
                          onError={() => { toast.error("Upload failed."); setUploading(false); }}
                          onSuccess={res => { setFormData(prev => ({ ...prev, imageUrl: res.url })); setUploading(false); toast.success("Image uploaded!"); }}
                          onUploadStart={() => setUploading(true)}
                          validateFile={f => f.size < 5000000}
                        />
                        <Button type="button" variant="secondary" className="h-11 px-8 rounded-full font-bold bg-white text-black hover:bg-white/90" disabled={uploading} onClick={() => fileInputRef.current.click()}>
                          {uploading ? <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" /> Uploading...</span> : "Browse Files"}
                        </Button>
                      </IKContext>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="ml-11 pt-6 border-t border-border pb-20">
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-border" onClick={() => navigate("/my-posts")}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 h-14 rounded-2xl font-bold text-lg" disabled={submitting || uploading}>
                  {submitting ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}

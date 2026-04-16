import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useDbAuth } from "../context/AuthContext";
import { IKContext, IKUpload } from "imagekitio-react";
import { 
  Laptop, Shirt, FileText, Key, Briefcase, Package, 
  MapPin, Calendar, UploadCloud, X, ArrowLeft, Search, CheckCircle2,
  Book, CreditCard
} from "lucide-react";

import Navbar from "../components/Navbar";
import { fetchWithAuth } from "../hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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

export default function ReportItem() {
  const { getToken } = useAuth();
  const { dbUser } = useDbAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    status: "Lost",
    title: "",
    description: "",
    category: "electronics",
    location: "",
    date: new Date().toISOString().split('T')[0],
    claimQuestion: "",
    imageUrl: ""
  });

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Setup ImageKit Authentication function pulling from our exact backend endpoint
  const authenticator = async () => {
    try {
      const response = await fetchWithAuth("/auth/imagekit-auth", {}, getToken);
      return {
        signature: response.signature,
        expire: response.expire,
        token: response.token
      };
    } catch (error) {
      throw new Error(`Authentication request failed: ${error.message}`);
    }
  };

  const handleError = err => {
    console.error("ImageKit Error: ", err);
    toast.error("Failed to upload image. Try again.");
    setUploading(false);
  };

  const handleSuccess = res => {
    setFormData(prev => ({ ...prev, imageUrl: res.url }));
    setUploading(false);
    toast.success("Image uploaded successfully!");
  };

  const handleUploadStart = () => {
    setUploading(true);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Guard: make sure profile is complete before allowing submission
    if (!dbUser || !dbUser.profileCompleted) {
      toast.error("Please complete your profile setup first.");
      navigate("/complete-profile");
      setSubmitting(false);
      return;
    }

    try {
      await fetchWithAuth(
        "/items",
        {
          method: "POST",
          body: JSON.stringify(formData)
        },
        getToken
      );

      toast.success("Item reported successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Failed to submit item report.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col">
      <Navbar />
      
      <main className="flex-1 py-10 lg:py-16 relative">
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-primary/5 to-transparent z-0 pointer-events-none" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
          
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')} 
            className="mb-8 text-muted-foreground hover:text-white hover:bg-white/5 pl-0"
          >
            <ArrowLeft size={18} className="mr-2" /> Back to Dashboard
          </Button>

          <div className="mb-10 lg:mb-12">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 text-white">
              Report an Item
            </h1>
            <p className="text-xl text-muted-foreground">
              Provide details to help reunite this item with its owner.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10 lg:space-y-12">
            
            {/* STEP 1: Type Selection */}
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30">1</div>
                 <h2 className="text-2xl font-bold text-white">Report Type</h2>
               </div>
               
               <div className="grid grid-cols-2 gap-4 ml-11">
                  <label className={`cursor-pointer border-2 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all ${formData.status === 'Lost' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(37,99,235,0.15)]' : 'border-white/10 bg-card/30 hover:bg-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="status" value="Lost" checked={formData.status === 'Lost'} onChange={handleChange} className="sr-only" />
                    <Search className={`h-8 w-8 ${formData.status === 'Lost' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="text-center">
                       <p className={`font-bold text-lg ${formData.status === 'Lost' ? 'text-primary' : 'text-white'}`}>I Lost Something</p>
                       <p className="text-xs text-muted-foreground mt-1">I am looking for my own item</p>
                    </div>
                  </label>
                  
                  <label className={`cursor-pointer border-2 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all ${formData.status === 'Found' ? 'border-green-500 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'border-white/10 bg-card/30 hover:bg-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="status" value="Found" checked={formData.status === 'Found'} onChange={handleChange} className="sr-only" />
                    <CheckCircle2 className={`h-8 w-8 ${formData.status === 'Found' ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <div className="text-center">
                       <p className={`font-bold text-lg ${formData.status === 'Found' ? 'text-green-500' : 'text-white'}`}>I Found Something</p>
                       <p className="text-xs text-muted-foreground mt-1">I want to return an item to its owner</p>
                    </div>
                  </label>
               </div>
            </div>

            {/* STEP 2: Basic Info (Category & Title) */}
            <div className="space-y-6">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30">2</div>
                 <h2 className="text-2xl font-bold text-white">Item Basic Info</h2>
               </div>
               
               <div className="ml-11 space-y-6">
                 <div>
                   <Label className="text-base text-muted-foreground mb-3 block">What kind of item is it?</Label>
                   <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                     {categories.map(cat => {
                       const Icon = cat.icon;
                       const isSelected = formData.category === cat.id;
                       return (
                         <button
                           key={cat.id}
                           type="button"
                           onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                           className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${isSelected ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(37,99,235,0.2)]' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-muted-foreground'}`}
                         >
                           <Icon className="h-6 w-6" />
                           <span className="text-[10px] uppercase font-bold tracking-wider">{cat.label}</span>
                         </button>
                       )
                     })}
                   </div>
                 </div>

                 <div className="space-y-2">
                   <Label className="text-base text-muted-foreground">Short Title</Label>
                   <Input 
                     name="title" 
                     required 
                     placeholder="e.g., Navy Blue Herschel Backpack" 
                     value={formData.title} 
                     onChange={handleChange} 
                     className="h-14 bg-black/40 border-white/10 text-lg placeholder:text-white/20 focus-visible:ring-primary/50 rounded-xl"
                   />
                 </div>
               </div>
            </div>

            {/* STEP 3: Details */}
            <div className="space-y-6">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30">3</div>
                 <h2 className="text-2xl font-bold text-white">Specific Details</h2>
               </div>

               <div className="ml-11 space-y-6">
                 <div className="space-y-2">
                   <Label className="text-base text-muted-foreground">Detailed Description</Label>
                   <Textarea 
                     name="description" 
                     required 
                     className="min-h-[140px] bg-black/40 border-white/10 text-base placeholder:text-white/20 focus-visible:ring-primary/50 rounded-xl p-4 resize-none"
                     placeholder="Provide any identifying details like color, brand, condition, or distinctive marks to help the owner identify it." 
                     value={formData.description} 
                     onChange={handleChange} 
                   />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <Label className="text-base text-muted-foreground">{formData.status === 'Lost' ? 'Where did you lose it?' : 'Where did you find it?'}</Label>
                     <div className="relative">
                       <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                       <Input 
                         name="location" 
                         required 
                         placeholder="e.g., Science Library 2nd Fl" 
                         value={formData.location} 
                         onChange={handleChange} 
                         className="h-14 pl-12 bg-black/40 border-white/10 text-base placeholder:text-white/20 focus-visible:ring-primary/50 rounded-xl"
                       />
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <Label className="text-base text-muted-foreground">Date</Label>
                     <div className="relative">
                       <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                       <Input 
                         name="date" 
                         type="date" 
                         required
                         value={formData.date} 
                         onChange={handleChange} 
                         className="h-14 pl-12 bg-black/40 border-white/10 text-base focus-visible:ring-primary/50 rounded-xl [&::-webkit-calendar-picker-indicator]:invert-[0.8] cursor-pointer"
                       />
                     </div>
                   </div>
                 </div>

                 <div className="space-y-2 pt-2">
                   <Label className="text-base text-muted-foreground flex flex-col gap-1">
                     <span>Claim Verification Question <span className="text-white/30 text-sm font-normal">(Optional)</span></span>
                     <span className="text-xs text-muted-foreground/70 font-normal">Ask a specific question only the true owner would know to prove ownership.</span>
                   </Label>
                   <Input 
                     name="claimQuestion" 
                     placeholder={formData.status === 'Found' ? "e.g., What is the lock screen wallpaper?" : "e.g., What color is the inner lining?"} 
                     value={formData.claimQuestion} 
                     onChange={handleChange} 
                     className="h-14 bg-black/40 border-white/10 text-base placeholder:text-white/20 focus-visible:ring-primary/50 rounded-xl"
                   />
                 </div>
               </div>
            </div>

            {/* STEP 4: Photo */}
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm border border-primary/30">4</div>
                 <h2 className="text-2xl font-bold text-white">Add a Photo <span className="text-muted-foreground text-sm font-normal ml-2">(Optional)</span></h2>
               </div>

               <div className="ml-11">
                 <div className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${formData.imageUrl ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-primary/50 bg-black/20 hover:bg-black/40'}`}>
                    {formData.imageUrl ? (
                      <div className="flex flex-col items-center relative group isolate">
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center z-10 backdrop-blur-sm">
                           <Button 
                             variant="destructive"
                             type="button" 
                             onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}
                             className="rounded-full font-bold shadow-xl"
                           >
                             <X className="mr-2 h-4 w-4" /> Remove Photo
                           </Button>
                        </div>
                        <img src={formData.imageUrl} alt="Uploaded" className="h-64 rounded-xl object-contain shadow-2xl ring-1 ring-white/10 relative z-0" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                          <UploadCloud className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Upload a clear photo</h3>
                        <p className="text-muted-foreground mb-8 text-sm">Drag and drop or click to browse. Max 5MB.</p>

                        <IKContext 
                          publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY} 
                          urlEndpoint={import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT} 
                          authenticator={authenticator} 
                        >
                          <IKUpload
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            fileName="campus_crate_item.jpg"
                            onError={handleError}
                            onSuccess={handleSuccess}
                            onUploadStart={handleUploadStart}
                            validateFile={(file) => file.size < 5000000}
                          />
                          
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-12 px-8 rounded-full font-bold bg-white text-black hover:bg-white/90"
                            disabled={uploading}
                            onClick={() => fileInputRef.current.click()}
                          >
                            {uploading ? (
                              <span className="flex items-center gap-2">
                                <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" /> 
                                Uploading...
                              </span>
                            ) : "Browse Files"}
                          </Button>
                        </IKContext>
                      </div>
                    )}
                 </div>
               </div>
            </div>

            {/* Submit */}
            <div className="ml-11 pt-6 border-t border-white/10 pb-20">
              <Button 
                type="submit" 
                className="w-full text-lg h-16 rounded-2xl font-bold shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)] transition-all"
                disabled={submitting || uploading}
              >
                {submitting ? "Submitting Report..." : `Submit ${formData.status} Item Report`}
              </Button>
            </div>

          </form>

        </div>
      </main>
    </div>
  );
}

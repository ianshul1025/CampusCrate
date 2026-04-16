import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useDbAuth } from "../context/AuthContext";
import { ArrowLeft } from "lucide-react";

export default function Profile() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { dbUser, setDbUser } = useDbAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    course: "",
    branch: "",
    batchYear: "",
    semester: "",
    urn: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dbUser) {
      setFormData({
        firstName: dbUser.firstName || "",
        middleName: dbUser.middleName || "",
        lastName: dbUser.lastName || "",
        gender: dbUser.gender || "",
        course: dbUser.course || "",
        branch: dbUser.branch || "",
        batchYear: dbUser.batchYear || "",
        semester: dbUser.semester || "",
        urn: dbUser.urn || "",
      });
    }
  }, [dbUser]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/users/me/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      toast.success("Profile updated successfully!");
      setDbUser(data.data);
    } catch (err) {
      toast.error(err.message || "Something went wrong updating your profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 bg-background">
      <div className="max-w-3xl w-full mb-6 flex items-center">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Button>
      </div>

      <Card className="p-8 max-w-3xl w-full bg-card/50 backdrop-blur-sm border-muted shadow-xl">
        
        <div className="flex items-center gap-6 mb-8 border-b border-border pb-6 mt-4">
             <Avatar className="h-20 w-20 border-4 border-primary/20">
               <AvatarImage src={dbUser?.avatar} alt="Avatar" />
               <AvatarFallback>{dbUser?.firstName?.[0] || 'U'}</AvatarFallback>
             </Avatar>
             <div>
                <h2 className="text-3xl font-bold text-foreground">
                  Your Profile
                </h2>
                <p className="text-muted-foreground text-md mt-1">
                  Manage your personal and university information.
                </p>
             </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6 text-left">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>First Name <span className="text-rose-500">*</span></Label>
              <Input name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label>Middle Name</Label>
              <Input name="middleName" value={formData.middleName} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input name="lastName" value={formData.lastName} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 flex flex-col justify-end">
              <Label>Gender <span className="text-rose-500">*</span></Label>
              <Select value={formData.gender} onValueChange={(val) => handleSelectChange("gender", val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URN / Roll No.</Label>
              <Input name="urn" value={formData.urn} onChange={handleChange} placeholder="e.g. 210xxxx" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Course <span className="text-rose-500">*</span></Label>
              <Input name="course" value={formData.course} onChange={handleChange} placeholder="e.g. B.Tech" required />
            </div>
            <div className="space-y-2">
              <Label>Branch / Major <span className="text-rose-500">*</span></Label>
              <Input name="branch" value={formData.branch} onChange={handleChange} placeholder="e.g. Computer Science" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Batch Year <span className="text-rose-500">*</span></Label>
              <Input name="batchYear" value={formData.batchYear} onChange={handleChange} placeholder="e.g. 2024" required />
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <Label>Semester <span className="text-rose-500">*</span></Label>
              <Select value={formData.semester} onValueChange={(val) => handleSelectChange("semester", val)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="text-xs text-muted-foreground italic">
               {dbUser?.updatedAt && `Last updated: ${new Date(dbUser.updatedAt).toLocaleString()}`}
             </div>
             <div className="flex gap-3 w-full sm:w-auto">
               <Button 
                 type="button"
                 variant="outline"
                 onClick={() => navigate("/dashboard")}
                 className="flex-1 sm:flex-none px-6"
               >
                 Cancel
               </Button>
               <Button 
                 type="submit" 
                 disabled={loading}
                 size="lg"
                 className="flex-1 sm:flex-none px-10 text-md font-bold shadow-lg shadow-primary/10"
               >
                 {loading ? 'Saving...' : 'Save Changes'}
               </Button>
             </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

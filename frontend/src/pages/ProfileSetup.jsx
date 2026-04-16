import { useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useDbAuth } from "../context/AuthContext";

export default function ProfileSetup() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { setDbUser } = useDbAuth();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    middleName: "",
    lastName: user?.lastName || "",
    gender: "",
    course: "",
    branch: "",
    batchYear: "",
    semester: "",
    urn: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSetupProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/auth/complete-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to complete profile");
      }

      toast.success("Profile completed successfully!");
      setDbUser(data.data);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message || "Something went wrong saving your profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-16 pb-12 px-4 bg-background">
      <Card className="p-8 max-w-2xl w-full text-center bg-card/50 backdrop-blur-sm border-muted shadow-xl">
        
        <h2 className="text-3xl font-bold mb-2 text-foreground">
          Welcome to CampusCrate!
        </h2>
        
        <p className="text-muted-foreground mb-8 text-md">
          Please complete your university profile to access your dashboard.
        </p>

        <form onSubmit={handleSetupProfile} className="space-y-6 text-left">
          
          <div className="flex justify-center mb-6">
             <Avatar className="h-24 w-24 border-4 border-primary/20">
               <AvatarImage src={user?.imageUrl} alt="Avatar" />
               <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
             </Avatar>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gender <span className="text-rose-500">*</span></Label>
              <Select onValueChange={(val) => handleSelectChange("gender", val)} required>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Course <span className="text-rose-500">*</span></Label>
              <Input name="course" value={formData.course} onChange={handleChange} placeholder="e.g. B.Tech" required />
            </div>
            <div className="space-y-2">
              <Label>Branch / Major <span className="text-rose-500">*</span></Label>
              <Input name="branch" value={formData.branch} onChange={handleChange} placeholder="e.g. Computer Science" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Batch Year <span className="text-rose-500">*</span></Label>
              <Input name="batchYear" value={formData.batchYear} onChange={handleChange} placeholder="e.g. 2024" required />
            </div>
            <div className="space-y-2">
              <Label>Semester <span className="text-rose-500">*</span></Label>
              <Select onValueChange={(val) => handleSelectChange("semester", val)} required>
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

          <Button 
            type="submit" 
            disabled={loading}
            size="lg"
            className="w-full mt-6 text-lg"
          >
            {loading ? 'Saving...' : 'Complete Profile'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

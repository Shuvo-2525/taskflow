"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, setDoc, addDoc, collection, serverTimestamp, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [companyName, setCompanyName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    // 1. If auth is done loading and no user, go to login
    if (!authLoading && !user) {
      router.push("/login");
    }
    
    // 2. If user already has a company, go to Dashboard (prevent stuck in onboarding)
    const checkExistingCompany = async () => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().currentCompanyId) {
                router.push("/");
            }
        }
    }
    if (!authLoading) checkExistingCompany();

  }, [user, authLoading, router]);

  const createOrUpdateUserProfile = async (companyId: string, role: string) => {
    if (!user) return;
    
    // Check if user profile exists first
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // Create new profile (Google Login case)
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "User",
            photoURL: user.photoURL,
            role: role,
            currentCompanyId: companyId,
            createdAt: serverTimestamp()
        });
    } else {
        // Update existing profile
        await updateDoc(userRef, {
            role: role,
            currentCompanyId: companyId
        });
    }
  };

  const handleCreateCompany = async () => {
    if (!companyName.trim()) return toast.error("Company name is required");
    if (!user) return;

    setIsLoading(true);
    try {
      // 1. Create Company Document
      const companyRef = await addDoc(collection(db, "companies"), {
        name: companyName,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
        pendingRequests: []
      });

      // 2. Create/Update User Profile
      await createOrUpdateUserProfile(companyRef.id, "admin");

      toast.success("Company created successfully!");
      router.push("/"); // Go to Dashboard
    } catch (error) {
      console.error(error);
      toast.error("Failed to create company.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinCompany = async () => {
    if (!joinCode.trim()) return toast.error("Company ID is required");
    if (!user) return;

    setIsLoading(true);
    try {
      // 1. Check if company exists
      const companyRef = doc(db, "companies", joinCode);
      const companySnap = await getDoc(companyRef);

      if (!companySnap.exists()) {
        toast.error("Company not found! Check the ID.");
        return;
      }

      // 2. Create/Update User Profile
      await createOrUpdateUserProfile(joinCode, "employee");

      // 3. Add to Company's Members List (Directly for now, per user request simplicity)
      // In a strict app, you might use 'pendingRequests'
      await updateDoc(companyRef, {
        members: arrayUnion(user.uid)
      });
      
      toast.success("Joined company successfully!");
      router.push("/");
    } catch (error) {
      console.error(error);
      toast.error("Failed to join company.");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Welcome, {user?.displayName}!</CardTitle>
          <CardDescription>Let's get you set up. Create a new workspace or join an existing one.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Company</TabsTrigger>
              <TabsTrigger value="join">Join Company</TabsTrigger>
            </TabsList>
            
            {/* CREATE COMPANY TAB */}
            <TabsContent value="create" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  placeholder="Ex: Tech Solutions Ltd." 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <Button onClick={handleCreateCompany} className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & Start
              </Button>
            </TabsContent>

            {/* JOIN COMPANY TAB */}
            <TabsContent value="join" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Company ID / Invite Code</Label>
                <Input 
                  placeholder="Paste the ID here..." 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </div>
              <Button onClick={handleJoinCompany} variant="secondary" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join Workspace
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
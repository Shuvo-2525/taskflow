"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, setDoc, addDoc, collection, serverTimestamp, getDoc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Building2, Copy, Check, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Company {
    id: string;
    name: string;
    ownerId: string;
    memberCount?: number;
}

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // State for pending request
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    
    const checkUserStatus = async () => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                // If user already has a company assigned, go to dashboard
                if (userData.currentCompanyId) {
                    router.push("/");
                }
                // Check if user has a pending request status in their profile (optional, but good for persistence)
                // Alternatively, check the companies collection for requests from this user
                if (userData.pendingCompanyId) {
                    setHasPendingRequest(true);
                    setPendingCompanyId(userData.pendingCompanyId);
                }
            }
        }
    }
    
    const fetchCompanies = async () => {
        try {
            const snapshot = await getDocs(collection(db, "companies"));
            const companyList = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                ownerId: doc.data().ownerId,
                memberCount: doc.data().members?.length || 0
            })) as Company[];
            setCompanies(companyList);
        } catch (error) {
            console.error("Failed to load companies", error);
        }
    };

    if (!authLoading) {
        checkUserStatus();
        fetchCompanies();
    }

  }, [user, authLoading, router]);

  const createOrUpdateUserProfile = async (role: string, companyId: string | null, pendingId: string | null) => {
    if (!user) return;
    
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    const data = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "User",
        photoURL: user.photoURL,
        role: role,
        currentCompanyId: companyId,
        pendingCompanyId: pendingId,
        createdAt: serverTimestamp()
    };

    if (!userSnap.exists()) {
        await setDoc(userRef, data);
    } else {
        await updateDoc(userRef, {
            role: role,
            currentCompanyId: companyId,
            pendingCompanyId: pendingId
        });
    }
  };

  const handleCreateCompany = async () => {
    if (!companyName.trim()) return toast.error("Company name is required");
    if (!user) return;

    setIsLoading(true);
    try {
      const companyRef = await addDoc(collection(db, "companies"), {
        name: companyName,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
        pendingRequests: []
      });

      // Creator gets immediate access
      await createOrUpdateUserProfile("admin", companyRef.id, null);

      toast.success("Company created successfully!");
      router.push("/"); 
    } catch (error) {
      console.error(error);
      toast.error("Failed to create company.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRequest = async (companyIdToJoin?: string) => {
    const targetId = companyIdToJoin || joinCode;
    
    if (!targetId.trim()) return toast.error("Company ID is required");
    if (!user) return;

    setIsLoading(true);
    try {
      const companyRef = doc(db, "companies", targetId);
      const companySnap = await getDoc(companyRef);

      if (!companySnap.exists()) {
        toast.error("Company not found! Check the ID.");
        setIsLoading(false);
        return;
      }

      // Update User Profile to mark as pending
      await createOrUpdateUserProfile("employee", null, targetId);

      // Add user ID to Company's pendingRequests array
      await updateDoc(companyRef, {
        pendingRequests: arrayUnion(user.uid)
      });
      
      setHasPendingRequest(true);
      setPendingCompanyId(targetId);
      toast.success("Request sent! Waiting for approval.");
      
    } catch (error) {
      console.error(error);
      toast.error("Failed to send request.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("ID copied to clipboard");
  };

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  // Render "Pending Approval" Screen
  if (hasPendingRequest) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
            <Card className="w-full max-w-md text-center shadow-lg border-0">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                        <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <CardTitle className="text-xl">Request Pending</CardTitle>
                    <CardDescription>
                        You have requested to join a workspace. Please wait for an administrator to approve your request.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm">
                        Company ID: <span className="font-mono font-bold">{pendingCompanyId}</span>
                    </div>
                    <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.location.reload()}
                    >
                        Check Status
                    </Button>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-lg shadow-lg border-0">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome, {user?.displayName?.split(' ')[0]}!</CardTitle>
          <CardDescription>Let's get you set up with a workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create">Create Company</TabsTrigger>
              <TabsTrigger value="join">Join Existing</TabsTrigger>
            </TabsList>
            
            {/* CREATE COMPANY TAB */}
            <TabsContent value="create" className="space-y-4">
                <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input 
                        placeholder="Ex: Acme Corp" 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="bg-white dark:bg-slate-950"
                        />
                    </div>
                    <Button onClick={handleCreateCompany} className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create & Start
                    </Button>
                </div>
            </TabsContent>

            {/* JOIN COMPANY TAB */}
            <TabsContent value="join" className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Paste Company ID here..." 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="font-mono"
                />
                <Button onClick={() => handleJoinRequest()} disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!isLoading && "Request to Join"}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or choose from list</span>
                </div>
              </div>

              <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                      {companies.length === 0 ? (
                          <p className="text-center text-sm text-muted-foreground py-8">No active companies found.</p>
                      ) : (
                          companies.map((company) => (
                              <div key={company.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/50 hover:border-primary/50 transition-colors">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                      <Avatar className="h-10 w-10 bg-white">
                                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                              {company.name.substring(0, 2).toUpperCase()}
                                          </AvatarFallback>
                                      </Avatar>
                                      <div className="truncate">
                                          <p className="font-medium text-sm truncate">{company.name}</p>
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                              <span>{company.memberCount} Members</span>
                                              <span className="w-1 h-1 rounded-full bg-slate-300" />
                                              <button 
                                                onClick={() => copyToClipboard(company.id)}
                                                className="flex items-center gap-1 hover:text-primary transition-colors"
                                              >
                                                <span className="font-mono text-[10px] max-w-[60px] truncate">{company.id}</span>
                                                {copiedId === company.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="secondary"
                                    onClick={() => handleJoinRequest(company.id)}
                                    disabled={isLoading}
                                  >
                                    Request
                                  </Button>
                              </div>
                          ))
                      )}
                  </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
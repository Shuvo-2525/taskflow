"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, X, Copy, Loader2, UserPlus, Briefcase } from "lucide-react";
import { NewTaskDialog } from "@/components/kanban/NewTaskDialog";

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: string;
}

export default function TeamPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<UserProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch Company and Member Data
  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if (!userSnap.exists()) return;
        const userData = userSnap.data();
        const companyId = userData.currentCompanyId;
        setIsAdmin(userData.role === "admin");

        const companyDocRef = doc(db, "companies", companyId);
        const companySnap = await getDoc(companyDocRef);
        
        if (companySnap.exists()) {
          const data = companySnap.data();
          setCompanyData({ id: companySnap.id, ...data });

          if (data.members && data.members.length > 0) {
            const memberPromises = data.members.map((uid: string) => getDoc(doc(db, "users", uid)));
            const memberSnaps = await Promise.all(memberPromises);
            setMembers(memberSnaps.map(s => s.data() as UserProfile));
          }

          if (data.pendingRequests && data.pendingRequests.length > 0) {
            const requestPromises = data.pendingRequests.map((uid: string) => getDoc(doc(db, "users", uid)));
            const requestSnaps = await Promise.all(requestPromises);
            setRequests(requestSnaps.map(s => s.data() as UserProfile));
          }
        }
      } catch (error) {
        console.error("Error fetching team:", error);
        toast.error("Failed to load team data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  const handleRequest = async (targetUid: string, action: "accept" | "reject") => {
    if (!companyData) return;
    try {
      const companyRef = doc(db, "companies", companyData.id);
      
      // 1. Always remove from pending requests on company doc
      await updateDoc(companyRef, {
        pendingRequests: arrayRemove(targetUid)
      });

      // 2. Also update the user's profile status
      const userRef = doc(db, "users", targetUid);

      if (action === "accept") {
        // Add to members list
        await updateDoc(companyRef, { members: arrayUnion(targetUid) });
        
        // Update user to officially be in the company
        await updateDoc(userRef, {
            currentCompanyId: companyData.id,
            pendingCompanyId: null, // Clear pending status
            role: "employee"
        });

        const acceptedUser = requests.find(u => u.uid === targetUid);
        if (acceptedUser) {
          setMembers([...members, acceptedUser]);
          setRequests(requests.filter(u => u.uid !== targetUid));
        }
        toast.success("User accepted");
      } else {
        // Update user to clear pending status so they can try again or elsewhere
        await updateDoc(userRef, {
            pendingCompanyId: null
        });

        setRequests(requests.filter(u => u.uid !== targetUid));
        toast.info("Request rejected");
      }
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    }
  };

  const copyInviteCode = () => {
    if (companyData?.id) {
      navigator.clipboard.writeText(companyData.id);
      toast.success("Copied to clipboard");
    }
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage your team members and permissions.</p>
        </div>
        
        <Card className="w-full md:w-auto bg-slate-100 dark:bg-slate-800 border-none">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Invite Code</p>
              <p className="text-sm font-bold font-mono">{companyData?.id}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={copyInviteCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">Active Members ({members.length})</TabsTrigger>
          {isAdmin && <TabsTrigger value="requests">Pending Requests ({requests.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.uid}>
                      <TableCell className="flex items-center gap-3 font-medium">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.photoURL} />
                          <AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {member.displayName}
                      </TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* ASSIGN TASK BUTTON */}
                        <NewTaskDialog defaultAssignee={member.uid}>
                            <Button size="sm" variant="outline" className="gap-2">
                                <Briefcase className="h-3.5 w-3.5" />
                                Assign Task
                            </Button>
                        </NewTaskDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="requests" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Join Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No pending requests.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((req) => (
                        <TableRow key={req.uid}>
                          <TableCell className="flex items-center gap-3 font-medium">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={req.photoURL} />
                              <AvatarFallback>{req.displayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            {req.displayName}
                          </TableCell>
                          <TableCell>{req.email}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleRequest(req.uid, "reject")}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" className="bg-green-600" onClick={() => handleRequest(req.uid, "accept")}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
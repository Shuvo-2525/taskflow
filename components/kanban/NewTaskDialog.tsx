"use client";

import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { addDoc, collection, serverTimestamp, getDoc, doc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

interface Member {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface NewTaskDialogProps {
  children: React.ReactNode;
  defaultAssignee?: string;
}

export function NewTaskDialog({ children, defaultAssignee }: NewTaskDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false); // Add member loading state

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState(""); // Initialize empty first
  const [deadline, setDeadline] = useState("");

  // Fetch Members AND THEN set default assignee
  useEffect(() => {
    if (open && user) {
        const fetchData = async () => {
            setIsMembersLoading(true);
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const companyId = userDoc.data()?.currentCompanyId;
                
                if (companyId) {
                    const q = query(collection(db, "users"), where("currentCompanyId", "==", companyId));
                    const snapshot = await getDocs(q);
                    const fetchedMembers = snapshot.docs.map(d => d.data() as Member);
                    setMembers(fetchedMembers);
                    
                    // Only set default assignee AFTER members are loaded to ensure Select finds the value
                    if (defaultAssignee) {
                        setAssignee(defaultAssignee);
                    }
                }
            } catch (error) {
                console.error("Failed to load members", error);
            } finally {
                setIsMembersLoading(false);
            }
        };
        fetchData();
    }
  }, [open, user, defaultAssignee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        toast.error("User profile not found");
        return;
      }
      const companyId = userDoc.data().currentCompanyId;

      let assigneeData = {};
      if (assignee && assignee !== "unassigned") {
        const selectedMember = members.find(m => m.uid === assignee);
        if (selectedMember) {
            assigneeData = {
                assignedTo: selectedMember.uid,
                assigneeName: selectedMember.displayName,
                assigneePhoto: selectedMember.photoURL || null
            };
        }
      }

      await addDoc(collection(db, "tasks"), {
        title,
        description,
        priority,
        status: "todo",
        companyId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
        ...assigneeData
      });

      toast.success("Task created successfully!");
      setOpen(false); 
      
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAssignee("");
      setDeadline("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  // Get the display name for the placeholder manually if needed, though Select handles it if value matches option
  const currentAssigneeName = members.find(m => m.uid === assignee)?.displayName;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Assign work to your team.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          
          <div className="grid gap-2">
            <Label htmlFor="title">Task Title</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ex: Redesign Homepage" 
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="assignee">
                    Assign To {isMembersLoading && <span className="text-xs text-muted-foreground">(Loading...)</span>}
                </Label>
                <Select 
                    value={assignee} 
                    onValueChange={setAssignee} 
                    disabled={isMembersLoading}
                >
                    <SelectTrigger>
                        {/* Ensure placeholder shows correct name even if loading finishes late */}
                        <SelectValue placeholder={defaultAssignee ? "Loading..." : "Unassigned"}>
                             {currentAssigneeName || "Unassigned"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members.map((m) => (
                            <SelectItem key={m.uid} value={m.uid}>
                                {m.displayName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="deadline">Deadline</Label>
            <div className="relative">
                <Input 
                    id="deadline" 
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="pl-10"
                />
                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Detailed instructions..." 
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
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
import { Loader2, Calendar as CalendarIcon, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]); // Array of UIDs
  const [deadline, setDeadline] = useState("");

  // Fetch Members
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
                    
                    if (defaultAssignee) {
                        setSelectedAssignees([defaultAssignee]);
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

  const handleAssigneeSelect = (uid: string) => {
      if (uid === "unassigned") return; // Do nothing
      if (!selectedAssignees.includes(uid)) {
          setSelectedAssignees([...selectedAssignees, uid]);
      }
  };

  const removeAssignee = (uid: string) => {
      setSelectedAssignees(selectedAssignees.filter(id => id !== uid));
  };

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

      // Prepare Assignee Data array
      const assigneesList = selectedAssignees.map(uid => {
          const member = members.find(m => m.uid === uid);
          return member ? {
              uid: member.uid,
              displayName: member.displayName,
              photoURL: member.photoURL || null
          } : null;
      }).filter(Boolean); // Remove nulls

      const taskRef = await addDoc(collection(db, "tasks"), {
        title,
        description,
        priority,
        status: "todo",
        companyId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
        assignees: assigneesList
      });

      // Notifications for all assignees
      const notificationPromises = assigneesList
        .filter(a => a!.uid !== user.uid)
        .map(a => 
            addDoc(collection(db, "notifications"), {
                recipientId: a!.uid,
                senderId: user.uid,
                senderName: user.displayName,
                senderPhoto: user.photoURL,
                type: "task_assigned",
                taskId: taskRef.id,
                taskTitle: title,
                isRead: false,
                createdAt: serverTimestamp(),
                companyId
            })
        );
      
      await Promise.all(notificationPromises);

      toast.success("Task created successfully!");
      setOpen(false); 
      
      // Reset
      setTitle("");
      setDescription("");
      setPriority("medium");
      setSelectedAssignees([]);
      setDeadline("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Assign work to your team members.
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
          </div>

          {/* Multi-select Assignee */}
          <div className="grid gap-2">
            <Label>Assign To {isMembersLoading && <span className="text-xs text-muted-foreground">(Loading...)</span>}</Label>
            
            <Select onValueChange={handleAssigneeSelect} disabled={isMembersLoading}>
                <SelectTrigger>
                    <SelectValue placeholder="Select members..." />
                </SelectTrigger>
                <SelectContent>
                    {members.map((m) => (
                        <SelectItem key={m.uid} value={m.uid} disabled={selectedAssignees.includes(m.uid)}>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={m.photoURL} />
                                    <AvatarFallback className="text-[8px]">{m.displayName[0]}</AvatarFallback>
                                </Avatar>
                                {m.displayName}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Selected Tags */}
            <div className="flex flex-wrap gap-2 mt-1">
                {selectedAssignees.map(uid => {
                    const m = members.find(mem => mem.uid === uid);
                    if (!m) return null;
                    return (
                        <Badge key={uid} variant="secondary" className="pl-1 pr-2 py-1 flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                                <AvatarImage src={m.photoURL} />
                                <AvatarFallback className="text-[6px]">{m.displayName[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{m.displayName}</span>
                            <button 
                                type="button"
                                onClick={() => removeAssignee(uid)} 
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )
                })}
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
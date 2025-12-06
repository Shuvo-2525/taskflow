"use client";

import { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
} from "@/components/ui/sheet";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User, CalendarDays, Flag, Edit2, Check, X, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TaskDetailsSheetProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Comment {
  id: string;
  text: string;
  userId: string;
  userDisplayName: string;
  userPhoto?: string;
  createdAt: any;
}

interface Member {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export function TaskDetailsSheet({ task, isOpen, onClose }: TaskDetailsSheetProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Editing States
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
  
  // Assignee Editing States
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize edit form
  useEffect(() => {
      if (task) {
          setEditTitle(task.title);
          setEditDescription(task.description || "");
          setEditPriority(task.priority);
          // Initialize selected assignees from current task
          const currentAssigneeIds = task.assignees?.map(a => a.uid) || [];
          setSelectedAssignees(currentAssigneeIds);
      }
  }, [task]);

  // Fetch Comments Real-time
  useEffect(() => {
    if (!task?.id || !isOpen) return;

    const q = query(
      collection(db, "tasks", task.id, "comments"), 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [task, isOpen]);

  // Fetch Members when editing starts
  useEffect(() => {
      if (isEditing && task?.companyId) {
          const fetchMembers = async () => {
              setIsMembersLoading(true);
              try {
                  const q = query(collection(db, "users"), where("currentCompanyId", "==", task.companyId));
                  const snapshot = await getDocs(q);
                  const fetchedMembers = snapshot.docs.map(d => d.data() as Member);
                  setMembers(fetchedMembers);
              } catch (error) {
                  console.error("Error fetching members", error);
                  toast.error("Failed to load team members");
              } finally {
                  setIsMembersLoading(false);
              }
          };
          fetchMembers();
      }
  }, [isEditing, task?.companyId]);


  const handleSendComment = async () => {
    if (!newComment.trim() || !user || !task) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, "tasks", task.id, "comments"), {
        text: newComment,
        userId: user.uid,
        userDisplayName: user.displayName || "User",
        userPhoto: user.photoURL || null,
        createdAt: serverTimestamp()
      });
      
      // Notify assignees
      if (task.assignees && task.assignees.length > 0) {
          task.assignees.forEach(async (assignee) => {
              if (assignee.uid !== user.uid) { 
                  await addDoc(collection(db, "notifications"), {
                      recipientId: assignee.uid,
                      senderId: user.uid,
                      senderName: user.displayName,
                      senderPhoto: user.photoURL,
                      type: "comment",
                      taskId: task.id,
                      taskTitle: task.title,
                      commentPreview: newComment.substring(0, 50),
                      isRead: false,
                      createdAt: serverTimestamp(),
                      companyId: task.companyId
                  });
              }
          });
      }

      setNewComment("");
    } catch (error) {
      console.error("Failed to send comment", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSending(false);
    }
  };

  const handleAssigneeSelect = (uid: string) => {
      if (!selectedAssignees.includes(uid)) {
          setSelectedAssignees([...selectedAssignees, uid]);
      }
  };

  const removeAssignee = (uid: string) => {
      setSelectedAssignees(selectedAssignees.filter(id => id !== uid));
  };

  const handleSaveEdit = async () => {
      if (!task || !task.id) return;
      setIsSaving(true);
      try {
          const taskRef = doc(db, "tasks", task.id);
          
          // Reconstruct assignee objects from selected IDs
          const updatedAssignees = selectedAssignees.map(uid => {
              // Check current task assignees first (optimization)
              const existing = task.assignees?.find(a => a.uid === uid);
              if (existing) return existing;
              
              // Fallback to finding in the fetched members list
              const member = members.find(m => m.uid === uid);
              return member ? {
                  uid: member.uid,
                  displayName: member.displayName,
                  photoURL: member.photoURL || null
              } : null;
          }).filter(Boolean);

          await updateDoc(taskRef, {
              title: editTitle,
              description: editDescription,
              priority: editPriority,
              assignees: updatedAssignees
          });
          
          toast.success("Task updated");
          setIsEditing(false);
      } catch (error) {
          console.error("Edit failed", error);
          toast.error("Failed to update task");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteTask = async () => {
      if (!task || !task.id) return;
      setIsDeleting(true);
      try {
          await deleteDoc(doc(db, "tasks", task.id));
          toast.success("Task deleted successfully");
          setIsDeleteDialogOpen(false);
          onClose(); // Close sheet
      } catch (error) {
          console.error("Delete failed", error);
          toast.error("Failed to delete task");
      } finally {
          setIsDeleting(false);
      }
  };

  const getPriorityColor = (priority: string) => {
      switch (priority) {
          case "high": return "destructive";
          case "medium": return "default"; 
          case "low": return "secondary";
          default: return "outline";
      }
  };

  const formatDate = (date: any) => {
      if (!date) return "No deadline set";
      if (date.toDate) return format(date.toDate(), "PPP");
      try {
          return format(new Date(date), "PPP");
      } catch (e) {
          return "Invalid Date";
      }
  };

  if (!task) return null;
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if(!open) setIsEditing(false); if(!open) onClose(); }}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full sm:max-w-[540px] p-0 gap-0 border-l shadow-2xl">
        
        {/* Header Section */}
        <div className="p-6 pb-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header Actions Row */}
            <div className="flex items-center justify-between mb-4">
                 {isEditing ? (
                     <Select value={editPriority} onValueChange={setEditPriority}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                     </Select>
                 ) : (
                    <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(task.priority) as any} className="uppercase text-[10px] tracking-wider font-bold px-2 py-0.5 shadow-sm">
                            {task.priority} Priority
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {task.status.replace("-", " ")}
                        </span>
                    </div>
                 )}

                 <div className="flex gap-2">
                     {isEditing ? (
                         <>
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                                <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                                <Check className="h-4 w-4 mr-1" /> Save
                            </Button>
                         </>
                     ) : (
                        <div className="flex gap-1">
                            {/* Delete Dialog */}
                            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Delete Task?</DialogTitle>
                                        <DialogDescription>
                                            This action cannot be undone. This will permanently delete the task "{task.title}".
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
                                        <Button variant="destructive" onClick={handleDeleteTask} disabled={isDeleting}>
                                            {isDeleting ? "Deleting..." : "Delete"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                                <Edit2 className="h-4 w-4 text-slate-500" />
                            </Button>
                        </div>
                     )}
                 </div>
            </div>

            {/* Title */}
            {isEditing ? (
                <Input 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold mb-2 h-auto py-2"
                />
            ) : (
                <SheetTitle className="text-xl sm:text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">
                    {task.title}
                </SheetTitle>
            )}

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                 <div className="flex items-center gap-1.5">
                     <CalendarDays className="h-3.5 w-3.5" />
                     <span>Created {task.createdAt ? formatDate(task.createdAt) : "Unknown"}</span>
                 </div>
                 {task.deadline && (
                     <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-medium">
                         <Flag className="h-3.5 w-3.5" />
                         <span>Due {formatDate(task.deadline)}</span>
                     </div>
                 )}
            </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
          <ScrollArea className="flex-1 p-6">
            <div className="flex flex-col gap-8">
                
                {/* Assignees Section */}
                <div className="flex flex-col gap-3 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900/30 shadow-sm">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            Assigned People
                            {isEditing && isMembersLoading && <span className="text-[10px] font-normal animate-pulse">(Loading...)</span>}
                        </h4>
                    </div>
                    
                    {isEditing ? (
                        <div className="space-y-3">
                            <Select onValueChange={handleAssigneeSelect} disabled={isMembersLoading}>
                                <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue placeholder="Add assignee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {members.map((m) => (
                                        <SelectItem key={m.uid} value={m.uid} disabled={selectedAssignees.includes(m.uid)}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-4 w-4">
                                                    <AvatarImage src={m.photoURL} />
                                                    <AvatarFallback className="text-[6px]">{m.displayName?.[0]}</AvatarFallback>
                                                </Avatar>
                                                {m.displayName}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            <div className="flex flex-wrap gap-2">
                                {selectedAssignees.map(uid => {
                                    // Try to find details in members array first, then fallback to current task info if not yet fetched
                                    const memberInfo = members.find(m => m.uid === uid) || task.assignees?.find(a => a.uid === uid);
                                    if (!memberInfo) return null;
                                    
                                    return (
                                        <Badge key={uid} variant="secondary" className="pl-1 pr-2 py-1 flex items-center gap-1 bg-white border">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={memberInfo.photoURL} />
                                                <AvatarFallback className="text-[6px]">{memberInfo.displayName?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs">{memberInfo.displayName}</span>
                                            <button 
                                                type="button"
                                                onClick={() => removeAssignee(uid)} 
                                                className="ml-1 hover:text-red-500"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {task.assignees && task.assignees.length > 0 ? (
                                task.assignees.map((assignee) => (
                                    <div key={assignee.uid} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1.5 rounded-md border shadow-sm">
                                        <Avatar className="h-6 w-6 border border-slate-200">
                                            <AvatarImage src={assignee.photoURL} />
                                            <AvatarFallback className="text-[9px] bg-blue-50 text-blue-600">
                                                {assignee.displayName?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs font-medium">{assignee.displayName}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center gap-2 text-slate-500">
                                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm italic">No one assigned</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Description Section */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Description
                    </h4>
                    {isEditing ? (
                        <Textarea 
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="min-h-[150px] text-sm bg-white"
                        />
                    ) : (
                        <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-md border border-slate-100 dark:border-slate-800">
                            {task.description || <span className="italic text-muted-foreground">No additional description provided.</span>}
                        </div>
                    )}
                </div>

                {/* Activity / Comments Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-sm font-semibold">Activity & Comments</h4>
                        <span className="text-xs text-muted-foreground">{comments.length} comments</span>
                    </div>
                    
                    <div className="space-y-6 pl-2">
                        {comments.length === 0 ? (
                             <div className="text-center py-8">
                                <p className="text-sm text-muted-foreground">No comments yet. Be the first to add one!</p>
                             </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 group relative">
                                    <div className="absolute left-4 top-10 bottom-[-24px] w-[2px] bg-slate-100 dark:bg-slate-800 group-last:hidden" />
                                    
                                    <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-950 z-10 mt-1">
                                        <AvatarImage src={comment.userPhoto} />
                                        <AvatarFallback className="text-xs">{comment.userDisplayName[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                                {comment.userDisplayName}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), "MMM d, h:mm a") : "Just now"}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-br-lg rounded-bl-lg rounded-tr-lg">
                                            {comment.text}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
          </ScrollArea>

          {/* Footer: Comment Input */}
          <div className="p-4 border-t bg-white dark:bg-slate-950">
            <div className="flex gap-3 items-end">
              <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback>Me</AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..." 
                    className="min-h-[44px] max-h-[120px] py-3 resize-none pr-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendComment();
                        }
                    }}
                />
                <Button 
                    size="icon" 
                    variant="ghost"
                    className="absolute right-1 bottom-1 h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={handleSendComment} 
                    disabled={isSending || !newComment.trim()}
                >
                    {isSending ? <span className="animate-spin">↻</span> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-right mt-2 mr-1">
                Press <kbd className="font-mono bg-slate-100 px-1 rounded">Enter</kbd> to send
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
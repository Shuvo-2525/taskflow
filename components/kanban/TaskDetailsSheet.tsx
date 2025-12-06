"use client";

import { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Send, User, CalendarDays, Flag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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

export function TaskDetailsSheet({ task, isOpen, onClose }: TaskDetailsSheetProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch Comments Real-time
  useEffect(() => {
    if (!task?.id || !isOpen) return;

    // Comments are a sub-collection of the Task
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
      setNewComment("");
    } catch (error) {
      console.error("Failed to send comment", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSending(false);
    }
  };

  const getPriorityColor = (priority: string) => {
      switch (priority) {
          case "high": return "destructive";
          case "medium": return "default"; // or a custom yellow if defined
          case "low": return "secondary";
          default: return "outline";
      }
  };

  // Helper to safely format date
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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full sm:max-w-[540px] p-0 gap-0">
        {/* Header Section */}
        <div className="p-6 pb-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-4">
                 <Badge variant={getPriorityColor(task.priority) as any} className="uppercase text-[10px] tracking-wider font-bold px-2 py-0.5">
                    {task.priority} Priority
                 </Badge>
                 <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                     {task.status.replace("-", " ")}
                 </span>
            </div>
            <SheetTitle className="text-xl sm:text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">
                {task.title}
            </SheetTitle>
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
                
                {/* Assignee Section - Improved UI */}
                <div className="flex flex-col gap-3 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900/30">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</h4>
                    <div className="flex items-center gap-3">
                        {task.assignedTo ? (
                            <>
                                <Avatar className="h-10 w-10 border-2 border-white dark:border-slate-800 shadow-sm">
                                    <AvatarImage src={task.assigneePhoto} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                                        {task.assigneeName?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {task.assigneeName || "Unknown User"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Project Member</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-500">
                                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700">
                                    <User className="h-5 w-5" />
                                </div>
                                <span className="text-sm italic">No one assigned</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Description Section */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Description
                    </h4>
                    <div className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-4 rounded-md border border-slate-100 dark:border-slate-800">
                        {task.description || <span className="italic text-muted-foreground">No additional description provided.</span>}
                    </div>
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
                                    {/* Connector Line */}
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
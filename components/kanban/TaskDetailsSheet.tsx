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
  serverTimestamp
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
import { Send, User } from "lucide-react";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  if (!task) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
              {task.priority.toUpperCase()}
            </Badge>
            <Badge variant="outline">{task.status.replace("-", " ").toUpperCase()}</Badge>
          </div>
          <SheetTitle className="text-xl">{task.title}</SheetTitle>
          <SheetDescription>
            Created on {task.createdAt ? format(task.createdAt.toDate(), "PPP") : "Unknown date"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 pr-4">
            {/* Description */}
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-sm font-medium mb-1 text-muted-foreground">Description</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {task.description || "No description provided."}
                </p>
              </div>

              {/* Assignee Section (Placeholder for now) */}
              <div>
                <h4 className="text-sm font-medium mb-1 text-muted-foreground">Assigned To</h4>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Comments Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Comments & Activity</h4>
              
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No comments yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.userPhoto} />
                        <AvatarFallback>{comment.userDisplayName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="grid gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{comment.userDisplayName}</span>
                          <span className="text-xs text-muted-foreground">
                            {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), "MMM d, h:mm a") : "Just now"}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Comment Input (Fixed at bottom) */}
          <div className="pt-4 mt-auto border-t bg-background">
            <div className="flex gap-2">
              <Textarea 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..." 
                className="min-h-[80px]"
              />
              <Button 
                size="icon" 
                className="h-[80px] w-[50px]" 
                onClick={handleSendComment} 
                disabled={isSending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User } from "lucide-react";
import { Task } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Priority Colors
  const priorityColor = {
    high: "border-l-red-500",
    medium: "border-l-yellow-500",
    low: "border-l-blue-500",
  };

  const priorityBadge = {
    high: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
    medium: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200",
    low: "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200",
  };

  // Helper to safely format date from Firestore Timestamp or JS Date
  const formatDate = (date: Timestamp | Date | null | undefined) => {
    if (!date) return null;
    
    // Type guard for Firestore Timestamp
    if (date instanceof Timestamp || (typeof (date as any).toDate === 'function')) {
        return format((date as any).toDate(), "MMM d");
    }
    
    // Fallback for standard Date or string (if valid)
    try {
        return format(new Date(date as any), "MMM d");
    } catch (e) {
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none mb-3 group"
    >
      <Card 
        onClick={onClick}
        className={cn(
          "cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 border-l-[4px] border-t-0 border-r-0 border-b-0 bg-white dark:bg-slate-950",
          priorityColor[task.priority]
        )}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header: Badge & Title */}
          <div className="flex justify-between items-start gap-2">
            <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider h-5 px-1.5 border-0", priorityBadge[task.priority])}>
              {task.priority}
            </Badge>
          </div>

          <h4 className="text-sm font-semibold leading-tight text-slate-800 dark:text-slate-100">
            {task.title}
          </h4>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
            {/* Deadline */}
            <div className="flex items-center gap-2">
                {task.deadline ? (
                <div className={cn(
                    "flex items-center text-[10px] font-medium px-2 py-1 rounded-full",
                    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}>
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(task.deadline)}
                </div>
                ) : (
                    <span className="text-[10px] text-muted-foreground">No Due Date</span>
                )}
            </div>

            {/* Assignee Avatar */}
            {task.assignedTo ? (
               <Avatar className="h-6 w-6 ring-2 ring-white dark:ring-slate-950">
                  <AvatarImage src={task.assigneePhoto} />
                  <AvatarFallback className="text-[9px] bg-indigo-100 text-indigo-700 font-bold">
                      {task.assigneeName?.charAt(0) || "U"}
                  </AvatarFallback>
               </Avatar>
            ) : (
                <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
                    <User className="h-3 w-3 text-slate-400" />
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock } from "lucide-react";
import { Task } from "@/types";
import { format } from "date-fns";

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const formatDate = (date: any) => {
    if (!date) return null;
    return format(date.toDate ? date.toDate() : new Date(date), "MMM d");
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none mb-3"
    >
      <Card 
        onClick={onClick}
        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all border-l-4"
      >
        <CardHeader className="p-3 pb-2 space-y-0">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-sm font-medium leading-tight">
              {task.title}
            </CardTitle>
            <Badge variant={getPriorityColor(task.priority) as any} className="text-[10px] h-5 px-1.5 uppercase">
              {task.priority}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 pt-1 pb-3">
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-auto">
            {/* Deadline */}
            {task.deadline ? (
              <div className="flex items-center text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-sm">
                <Clock className="h-3 w-3 mr-1" />
                {formatDate(task.deadline)}
              </div>
            ) : <div />}

            {/* Assignee Avatar */}
            {task.assignedTo && (
              <div className="flex -space-x-2">
                 <Avatar className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={task.assigneePhoto} />
                    <AvatarFallback className="text-[9px] bg-blue-100 text-blue-700">
                        {task.assigneeName?.charAt(0) || "U"}
                    </AvatarFallback>
                 </Avatar>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
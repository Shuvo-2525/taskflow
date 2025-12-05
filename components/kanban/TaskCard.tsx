"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Task } from "@/types";
import { format } from "date-fns";

interface TaskCardProps {
  task: Task;
  onClick?: () => void; // Added this prop
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none mb-3"
    >
      {/* Added onClick here */}
      <Card 
        onClick={onClick}
        className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      >
        <CardHeader className="p-4 pb-2 space-y-0">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-sm font-medium leading-tight">
              {task.title}
            </CardTitle>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Badge variant={getPriorityColor(task.priority) as any} className="text-[10px] uppercase">
              {task.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}
          
          {task.deadline && (
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Clock className="h-3 w-3 mr-1" />
              {format(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (task.deadline as any).toDate ? (task.deadline as any).toDate() : task.deadline, 
                "MMM d"
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
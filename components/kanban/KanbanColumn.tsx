"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, Column } from "@/types";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({ column, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  // Status Colors for Header
  const statusColor = {
    "todo": "bg-slate-500",
    "in-progress": "bg-blue-500",
    "review": "bg-orange-500",
    "done": "bg-green-500",
  };

  return (
    <div className="flex flex-col h-full w-full min-w-[280px] max-w-[350px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", statusColor[column.id])} />
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            {column.title}
            </h3>
        </div>
        <span className="text-xs font-medium text-slate-500 bg-white dark:bg-slate-800 border px-2 py-0.5 rounded-full shadow-sm">
          {tasks.length}
        </span>
      </div>

      {/* Column Content/Drop Zone - Removed manual overflow, using ScrollArea implicitly via parent or just letting it flow nicely */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-xl p-2 transition-colors duration-200 flex flex-col",
          "bg-slate-50 dark:bg-slate-900/50 border-2 border-transparent", // Cleaner bg
          tasks.length === 0 && "border-dashed border-slate-200 dark:border-slate-800"
        )}
      >
        {/* ScrollArea inside the column for vertical scrolling if many tasks */}
        <ScrollArea className="h-full w-full pr-3"> 
            <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2 pb-4">
                {tasks.map((task) => (
                    <TaskCard 
                    key={task.id} 
                    task={task} 
                    onClick={() => onTaskClick(task)} 
                    />
                ))}
            </div>
            </SortableContext>
            
            {tasks.length === 0 && (
            <div className="h-32 flex items-center justify-center text-slate-400 text-xs font-medium">
                Drop items here
            </div>
            )}
        </ScrollArea>
      </div>
    </div>
  );
}
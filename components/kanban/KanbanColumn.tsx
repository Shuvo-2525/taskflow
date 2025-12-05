"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, Column } from "@/types";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void; // Added prop
}

export function KanbanColumn({ column, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex flex-col h-full w-full min-w-[280px]">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200">
          {column.title}
        </h3>
        <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 min-h-[500px]",
          tasks.length === 0 && "border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)} // Pass the click handler
            />
          ))}
        </SortableContext>
        
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">No tasks</p>
        )}
      </div>
    </div>
  );
}
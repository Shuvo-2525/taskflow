"use client";

import KanbanBoard from "@/components/kanban/KanbanBoard";

export default function TasksPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <KanbanBoard />
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragEndEvent 
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { Task, TASK_STATUSES, TaskStatus } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { NewTaskDialog } from "./NewTaskDialog";
import { TaskDetailsSheet } from "./TaskDetailsSheet";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function KanbanBoard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    let unsubscribe = () => {};

    const setupSubscription = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!isMounted) return;

        if (!userDoc.exists()) {
            setLoading(false);
            return;
        }
        
        const userData = userDoc.data();
        const companyId = userData?.currentCompanyId;

        if (!companyId) {
             setLoading(false);
             return;
        }

        const q = query(collection(db, "tasks"), where("companyId", "==", companyId));

        unsubscribe = onSnapshot(q, (snapshot) => {
          if (!isMounted) return;
          const fetchedTasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Task[];
          setTasks(fetchedTasks);
          setLoading(false);
        }, (error) => {
          console.error("Snapshot error:", error);
          if (isMounted) setLoading(false);
        });

      } catch (error) {
        console.error("Error setting up task listener:", error);
        if (isMounted) setLoading(false);
      }
    };

    setupSubscription();

    return () => {
        isMounted = false;
        unsubscribe();
    };
  }, [user]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveTask(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    const currentTask = tasks.find((t) => t.id === activeId);
    if (!currentTask) return;

    let newStatus: TaskStatus | undefined;

    if (TASK_STATUSES.some(s => s.id === overId)) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    if (newStatus && currentTask.status !== newStatus) {
      setTasks(prev => prev.map(t => t.id === activeId ? { ...t, status: newStatus! } : t));
      try {
        const taskRef = doc(db, "tasks", activeId);
        await updateDoc(taskRef, { status: newStatus });
        toast.success("Task updated");
      } catch (error) {
        console.error("Update failed", error);
        toast.error("Failed to save change");
      }
    }
    setActiveTask(null);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsSheetOpen(true);
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 px-1">
        <h1 className="text-2xl font-bold tracking-tight">Project Board</h1>
        <NewTaskDialog>
          <Button>
              <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </NewTaskDialog>
      </div>

      {/* ScrollArea replaces the simple overflow div to fix "ugly scroller" */}
      <ScrollArea className="flex-1 h-full rounded-lg border bg-slate-100/50 dark:bg-slate-900/50 p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full min-w-[1000px]">
            {TASK_STATUSES.map((status) => (
              <KanbanColumn
                key={status.id}
                column={status}
                tasks={tasks.filter((task) => task.status === status.id)}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <TaskDetailsSheet 
        task={selectedTask} 
        isOpen={isSheetOpen} 
        onClose={() => setIsSheetOpen(false)} 
      />
    </div>
  );
}
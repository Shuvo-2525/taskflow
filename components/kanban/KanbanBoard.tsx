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
import { TaskDetailsSheet } from "./TaskDetailsSheet"; // Import Sheet
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KanbanBoard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null); // For Dragging
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // For Details View
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
    
    let isMounted = true; // Track if component is mounted
    let unsubscribe = () => {}; // Placeholder for cleanup

    const setupSubscription = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        // If component unmounted while waiting, stop
        if (!isMounted) return;

        if (!userDoc.exists()) {
            console.error("User profile not found");
            setLoading(false); // Stop loading so screen isn't stuck
            return;
        }
        
        const userData = userDoc.data();
        const companyId = userData?.currentCompanyId;

        if (!companyId) {
             console.error("User has no company assigned");
             setLoading(false); // Stop loading
             return;
        }

        const q = query(collection(db, "tasks"), where("companyId", "==", companyId));

        // Start Listener
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

  // Handler for opening the sheet
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsSheetOpen(true);
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Tasks</h1>
        <NewTaskDialog>
          <Button>
              <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        </NewTaskDialog>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full pb-4 min-w-[1000px]">
            {TASK_STATUSES.map((status) => (
              <KanbanColumn
                key={status.id}
                column={status}
                tasks={tasks.filter((task) => task.status === status.id)}
                onTaskClick={handleTaskClick} // Pass handler
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>

        {/* DETAILS SHEET */}
        <TaskDetailsSheet 
          task={selectedTask} 
          isOpen={isSheetOpen} 
          onClose={() => setIsSheetOpen(false)} 
        />
      </div>
    </div>
  );
}
import { Timestamp } from "firebase/firestore";

export type TaskStatus = "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Assignee {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: Timestamp | Date | null;
  assignees?: Assignee[]; // Changed from single assignedTo to array
  createdBy?: string;
  companyId: string;
  createdAt?: Timestamp;
}

export interface Column {
  id: TaskStatus;
  title: string;
}

export const TASK_STATUSES: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];
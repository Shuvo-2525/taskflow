"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Clock, Users, Bell, MessageSquare, CheckSquare, Briefcase, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { Task } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Notification {
    id: string;
    type: 'task_assigned' | 'comment';
    senderName: string;
    senderPhoto?: string;
    taskTitle: string;
    commentPreview?: string;
    createdAt: any;
    isRead: boolean;
}

interface Member {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    role: string;
}

interface MemberWorkload extends Member {
    tasks: Task[];
    todo: Task[];
    inProgress: Task[];
    review: Task[];
    done: Task[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    totalMembers: 0,
  });
  
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [workload, setWorkload] = useState<MemberWorkload[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return;
        
        const companyId = userDoc.data().currentCompanyId;
        if (!companyId) return;

        // 1. Fetch Company Info & Members
        const companyDoc = await getDoc(doc(db, "companies", companyId));
        let fetchedMembers: Member[] = [];
        
        if (companyDoc.exists()) {
            setCompanyName(companyDoc.data().name);
            const memberIds = companyDoc.data().members || [];
            
            // Fetch Member Details
            if (memberIds.length > 0) {
                const memberPromises = memberIds.map((uid: string) => getDoc(doc(db, "users", uid)));
                const memberSnaps = await Promise.all(memberPromises);
                fetchedMembers = memberSnaps.map(s => s.data() as Member).filter(Boolean);
            }
            
            setStats(prev => ({ ...prev, totalMembers: fetchedMembers.length }));
        }

        // 2. Fetch ALL Tasks for calculation
        const tasksQuery = query(collection(db, "tasks"), where("companyId", "==", companyId));
        const tasksSnapshot = await getDocs(tasksQuery);
        
        const allTasks: Task[] = [];
        let pendingCount = 0;
        let completedCount = 0;

        tasksSnapshot.forEach((doc) => {
          const task = { id: doc.id, ...doc.data() } as Task;
          allTasks.push(task);
          if (task.status === "done") completedCount++;
          else pendingCount++;
        });

        setStats(prev => ({ ...prev, pending: pendingCount, completed: completedCount }));

        // 3. Process Recent Tasks (Client side sort for efficiency since we fetched all)
        const sortedTasks = [...allTasks].sort((a,b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
        setRecentTasks(sortedTasks.slice(0, 5));

        // 4. Calculate Workload per Employee
        const workloadData: MemberWorkload[] = fetchedMembers.map(member => {
            // Find tasks where this member is an assignee
            const memberTasks = allTasks.filter(t => 
                t.assignees && t.assignees.some(a => a.uid === member.uid)
            );

            return {
                ...member,
                tasks: memberTasks,
                todo: memberTasks.filter(t => t.status === 'todo'),
                inProgress: memberTasks.filter(t => t.status === 'in-progress'),
                review: memberTasks.filter(t => t.status === 'review'),
                done: memberTasks.filter(t => t.status === 'done'),
            };
        });
        
        setWorkload(workloadData);

      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  // Real-time Notifications Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Notification[];
        setNotifications(notifs);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  // Helper to format time safely
  const formatTime = (timestamp: any) => {
      if (!timestamp) return "";
      if (timestamp.toDate) return format(timestamp.toDate(), "MMM d, h:mm a");
      try { return format(new Date(timestamp), "MMM d, h:mm a"); } catch (e) { return ""; }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
                Overview for <span className="font-semibold text-foreground">{companyName}</span>
            </p>
        </div>
        <div className="text-sm font-medium bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Pending Tasks</CardTitle>
            <div className="p-2 bg-blue-200/50 dark:bg-blue-900/50 rounded-full">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.pending}</div>
            <p className="text-xs text-blue-600/80 dark:text-blue-300/80 mt-1">Tasks waiting for completion</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-100 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Completed</CardTitle>
            <div className="p-2 bg-green-200/50 dark:bg-green-900/50 rounded-full">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.completed}</div>
            <p className="text-xs text-green-600/80 dark:text-green-300/80 mt-1">Tasks finished successfully</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-100 dark:border-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Team Size</CardTitle>
            <div className="p-2 bg-purple-200/50 dark:bg-purple-900/50 rounded-full">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.totalMembers}</div>
            <p className="text-xs text-purple-600/80 dark:text-purple-300/80 mt-1">Active workspace members</p>
          </CardContent>
        </Card>
      </div>

      {/* NEW SECTION: Employee Wise Task Lists */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardHeader className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" />
                            Employee Workload
                        </CardTitle>
                        <CardDescription>Real-time task distribution across the team</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                        <TableRow>
                            <TableHead className="w-[200px] pl-6">Employee</TableHead>
                            <TableHead>Current Focus (In Progress)</TableHead>
                            <TableHead className="w-[150px]">Backlog (Todo)</TableHead>
                            <TableHead className="w-[150px]">In Review</TableHead>
                            <TableHead className="text-right pr-6 w-[100px]">Done</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workload.map((member) => (
                            <TableRow key={member.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                <TableCell className="pl-6 font-medium">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 ring-1 ring-slate-200 dark:ring-slate-800">
                                            <AvatarImage src={member.photoURL} />
                                            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                                                {member.displayName?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm">{member.displayName}</span>
                                            <span className="text-[10px] text-muted-foreground">{member.role}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-2">
                                        {member.inProgress.length > 0 ? (
                                            member.inProgress.map(task => (
                                                <Badge key={task.id} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-normal truncate max-w-[200px]">
                                                    {task.title}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">No active tasks</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {member.todo.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{member.todo.length} Tasks</span>
                                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                                                Next: {member.todo[0].title}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {member.review.map(task => (
                                            <div key={task.id} className="h-2 w-2 rounded-full bg-orange-400" title={task.title} />
                                        ))}
                                        {member.review.length > 0 && <span className="text-xs ml-1">{member.review.length}</span>}
                                        {member.review.length === 0 && <span className="text-xs text-muted-foreground">-</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge variant="outline" className="font-mono">
                                        {member.done.length}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {workload.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No team members found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notifications Feed */}
        <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notifications
                </h2>
                <Badge variant="secondary" className="text-xs">{notifications.length}</Badge>
            </div>
            
            <Card className="h-[400px] border-slate-200 dark:border-slate-800 shadow-sm">
                <ScrollArea className="h-full">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                            <Bell className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {notifications.map((notif) => (
                                <div key={notif.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex gap-3 items-start">
                                    <Avatar className="h-8 w-8 mt-1">
                                        <AvatarImage src={notif.senderPhoto} />
                                        <AvatarFallback>{notif.senderName?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm text-slate-800 dark:text-slate-200">
                                            <span className="font-semibold">{notif.senderName}</span>
                                            {notif.type === 'task_assigned' ? (
                                                <span className="text-slate-500"> assigned you a task: </span>
                                            ) : (
                                                <span className="text-slate-500"> commented on: </span>
                                            )}
                                            <span className="font-medium text-primary">{notif.taskTitle}</span>
                                        </p>
                                        {notif.commentPreview && (
                                            <p className="text-xs text-slate-500 italic border-l-2 pl-2 border-slate-200">
                                                "{notif.commentPreview}"
                                            </p>
                                        )}
                                        <p className="text-[10px] text-slate-400">{formatTime(notif.createdAt)}</p>
                                    </div>
                                    {notif.type === 'task_assigned' ? 
                                        <CheckSquare className="h-4 w-4 text-blue-500 mt-1" /> : 
                                        <MessageSquare className="h-4 w-4 text-green-500 mt-1" />
                                    }
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </Card>
        </div>

        {/* Recent Tasks List */}
        <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    Recent Tasks
                </h2>
            </div>
            
            <div className="space-y-3">
                {recentTasks.length === 0 ? (
                    <Card className="border-dashed p-8 text-center text-muted-foreground">
                        No tasks created yet.
                    </Card>
                ) : (
                    recentTasks.map(task => (
                        <Card key={task.id} className="hover:shadow-md transition-all overflow-hidden group border-l-4 border-l-transparent hover:border-l-primary">
                            <div className="flex items-center p-4 gap-4">
                                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                                    task.priority === 'high' ? 'bg-red-500' : 
                                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                }`} />
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold truncate text-sm text-slate-900 dark:text-slate-100">{task.title}</h4>
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 uppercase tracking-wide font-medium bg-slate-100 text-slate-600">
                                            {task.status.replace("-", " ")}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">{task.description || "No description"}</p>
                                </div>

                                <div className="flex items-center -space-x-2 overflow-hidden pl-1 flex-shrink-0">
                                    {task.assignees && task.assignees.length > 0 ? (
                                        <>
                                            {task.assignees.slice(0, 3).map((assignee, i) => (
                                                <Avatar key={assignee.uid || i} className="h-8 w-8 border-2 border-white dark:border-slate-900 ring-1 ring-slate-100 inline-block">
                                                    <AvatarImage src={assignee.photoURL} />
                                                    <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700 font-bold">
                                                        {assignee.displayName?.charAt(0) || "U"}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ))}
                                            {task.assignees.length > 3 && (
                                                <div className="h-8 w-8 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-[10px] font-medium text-slate-600 border-2 border-white">
                                                    +{task.assignees.length - 3}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-300">
                                            NA
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
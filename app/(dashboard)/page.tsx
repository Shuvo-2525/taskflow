"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { CheckCircle2, Clock, Users, Briefcase } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    totalMembers: 0,
    totalProjects: 0 // In this schema, maybe "total tasks" or we can treat tasks as projects
  });
  
  // Analytics data for the chart
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;

      try {
        // 1. Get User's Company ID
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return;
        
        const companyId = userDoc.data().currentCompanyId;
        if (!companyId) return;

        // 2. Fetch Tasks for this Company
        const tasksQuery = query(collection(db, "tasks"), where("companyId", "==", companyId));
        const tasksSnapshot = await getDocs(tasksQuery);
        
        let pendingCount = 0;
        let completedCount = 0;
        const taskDistribution = {
          "Todo": 0,
          "In Progress": 0,
          "Review": 0,
          "Done": 0
        };

        tasksSnapshot.forEach((doc) => {
          const task = doc.data();
          const status = task.status; // todo, in-progress, review, done

          if (status === "done") {
            completedCount++;
            taskDistribution["Done"]++;
          } else {
            pendingCount++;
            if (status === "todo") taskDistribution["Todo"]++;
            if (status === "in-progress") taskDistribution["In Progress"]++;
            if (status === "review") taskDistribution["Review"]++;
          }
        });

        // 3. Fetch Company Members Count
        const companyDoc = await getDoc(doc(db, "companies", companyId));
        let membersCount = 0;
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          membersCount = companyData.members ? companyData.members.length : 1;
        }

        setStats({
          pending: pendingCount,
          completed: completedCount,
          totalMembers: membersCount,
          totalProjects: tasksSnapshot.size
        });

        setChartData([
          { name: "To Do", total: taskDistribution["Todo"] },
          { name: "In Progress", total: taskDistribution["In Progress"] },
          { name: "Review", total: taskDistribution["Review"] },
          { name: "Done", total: taskDistribution["Done"] },
        ]);

      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Tasks waiting for review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Finished total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Active in workspace</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
            <CardHeader>
            <CardTitle>Task Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* Recent Activity / Welcome Card */}
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Welcome back!</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
                        <div className="p-2 bg-white dark:bg-slate-700 rounded-full">
                            <Briefcase className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">Total Workload</p>
                            <p className="text-2xl font-bold">{stats.totalProjects}</p>
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Stay updated with your team's progress. Use the Kanban board to manage tasks efficiently.
                    </p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
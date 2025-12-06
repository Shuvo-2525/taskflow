"use client";

import { LayoutDashboard, Kanban, Users, Settings, LogOut, Briefcase, ChevronRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils"; 
import { useAuth } from "@/components/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  userRole?: "admin" | "employee";
}

export function Sidebar({ userRole }: SidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "My Tasks", icon: Kanban, path: "/tasks" },
    ...(userRole === "admin" ? [{ name: "Team Members", icon: Users, path: "/team" }] : []),
    // { name: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div className="h-screen w-64 bg-slate-900 text-slate-100 flex flex-col fixed left-0 top-0 border-r border-slate-800 shadow-xl z-50">
      {/* Header / Logo Area */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950/30">
        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Briefcase className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-lg tracking-tight">TaskFlow</span>
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 py-6 px-4">
        <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Menu</p>
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                    key={item.path}
                    className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                    isActive 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/20" 
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                    )}
                    onClick={() => router.push(item.path)}
                >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300")} />
                    <span className="flex-1 text-left">{item.name}</span>
                    {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
                </button>
              )
            })}
        </div>
      </ScrollArea>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-3 mb-4 px-2">
            <Avatar className="h-8 w-8 border border-slate-700">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback className="bg-slate-800 text-xs">{user?.displayName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.displayName || "User"}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
        </div>
        <Separator className="bg-slate-800 mb-4" />
        <button 
          className="w-full flex items-center gap-2 px-2 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
"use client";

import { LayoutDashboard, Kanban, Users, Settings, LogOut, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils"; // Utility for conditional classes

interface SidebarProps {
  userRole?: "admin" | "employee";
}

export function Sidebar({ userRole }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/" },
    { name: "My Tasks (Kanban)", icon: Kanban, path: "/tasks" },
    // Only show Team Management if user is admin (Company Owner)
    ...(userRole === "admin" ? [{ name: "Team Members", icon: Users, path: "/team" }] : []),
    { name: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 border-r border-slate-800">
      {/* Header / Logo Area */}
      <div className="p-6 flex items-center gap-2 border-b border-slate-800">
        <Briefcase className="h-6 w-6 text-blue-400" />
        <span className="font-bold text-xl tracking-tight">TaskFlow</span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-800",
              pathname === item.path && "bg-slate-800 text-white shadow-sm border-l-4 border-blue-500 rounded-none"
            )}
            onClick={() => router.push(item.path)}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Button>
        ))}
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <Button 
          variant="destructive" 
          className="w-full justify-start gap-3" 
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
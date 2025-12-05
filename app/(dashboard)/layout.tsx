"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sidebar } from "@/components/layout/Sidebar";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      if (authLoading) return;
      
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRole(userData.role);
          setIsChecking(false);
        } else {
          // User logged in but no profile (e.g. skipped onboarding)
          router.push("/onboarding");
        }
      } catch (error) {
        console.error("Profile check error", error);
      }
    }

    checkProfile();
  }, [user, authLoading, router]);

  if (authLoading || isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar is now persistent across all dashboard pages */}
      <Sidebar userRole={role} />
      
      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
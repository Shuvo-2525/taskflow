"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sidebar } from "@/components/layout/Sidebar";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      // Wait for auth to initialize
      if (authLoading) return;
      
      // If not logged in, redirect to login
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRole(userData.role);
          // Profile found, stop checking
          setIsChecking(false);
        } else {
          // User logged in but no profile (e.g. skipped onboarding), redirect to onboarding
          router.push("/onboarding");
        }
      } catch (error: any) {
        console.error("Profile check error", error);
        // Even on error, we must stop the loading spinner or the user gets stuck
        setIsChecking(false);
        
        // If it's an offline error, show a toast
        if (error.code === 'unavailable' || error.message.includes("offline")) {
             toast.error("You are offline. Using cached data if available.");
        } else {
             toast.error("Failed to load profile data.");
        }
      }
    }

    checkProfile();
  }, [user, authLoading, router]);

  // Show loader only while checking auth state or profile existence
  if (authLoading || isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
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
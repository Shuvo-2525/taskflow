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
      // 1. Wait for Auth to initialize
      if (authLoading) return;
      
      // 2. If no user, kick to login
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // 3. Check if User Profile exists in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // 4. Check if they have completed onboarding (have a company)
          if (!userData.currentCompanyId) {
             router.push("/onboarding");
             return;
          }

          setRole(userData.role);
          setIsChecking(false);
        } else {
          // 5. User authenticated but no profile (First time Google Login) -> Go to Onboarding
          router.push("/onboarding");
        }
      } catch (error: any) {
        console.error("Profile check error", error);
        
        // Handle "Offline" error specifically to avoid blocking the UI forever
        if (error.code === 'unavailable' || error.message?.includes("offline")) {
             toast.error("Network error. Please check your connection.");
             // Optional: You might want to allow access or show a specific offline screen here
        } else {
             toast.error("Failed to verify account status.");
        }
        setIsChecking(false); 
      }
    }

    checkProfile();
  }, [user, authLoading, router]);

  // Loading Screen
  if (authLoading || isChecking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Setting up your workspace...</p>
              <p className="text-xs text-muted-foreground">Verifying profile & company data</p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar is now persistent across all dashboard pages */}
      <Sidebar userRole={role} />
      
      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        {children}
      </main>
    </div>
  );
}
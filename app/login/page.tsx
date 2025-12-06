"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Only for registration
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // We do NOT create the user doc here for Google Login.
      // The Dashboard Layout or Onboarding Page handles the "First Time User" check.
      router.push("/"); 
    } catch (error: any) {
      console.error("Google login error:", error);
      toast.error(error.message || "Failed to login with Google");
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Auth (Login or Register)
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // LOGIN FLOW
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/");
      } else {
        // REGISTER FLOW
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update Display Name
        if (name) {
            await updateProfile(user, { displayName: name });
        }

        // Create User Document immediately for Email users
        // They still need to pick a company in Onboarding, so currentCompanyId is null
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            displayName: name || user.email?.split('@')[0],
            role: "employee", // Default role
            createdAt: serverTimestamp(),
            photoURL: null,
            currentCompanyId: null // Will be set during onboarding
        });

        toast.success("Account created!");
        router.push("/onboarding");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      let msg = "Authentication failed";
      if (error.code === 'auth/email-already-in-use') msg = "Email already in use";
      if (error.code === 'auth/weak-password') msg = "Password should be at least 6 characters";
      if (error.code === 'auth/invalid-credential') msg = "Invalid email or password";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">TaskFlow</CardTitle>
          <CardDescription>
            {isLogin ? "Login to access your workspace" : "Create a new account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Google Login Button */}
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleLogin} 
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLogin ? "Sign in with Google" : "Sign up with Google"}
            </Button>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              
              {/* Name Field (Register Only) */}
              {!isLogin && (
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                    id="name" 
                    type="text" 
                    placeholder="John Doe" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                    />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? "Sign In" : "Create Account"}
              </Button>
            </form>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
                className="text-primary cursor-pointer hover:underline font-medium"
                onClick={() => setIsLogin(!isLogin)}
            >
                {isLogin ? "Register" : "Login"}
            </span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
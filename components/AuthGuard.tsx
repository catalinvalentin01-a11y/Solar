"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      setLoading(true);

      const { data } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!data.user) {
        setUser(null);
        setLoading(false);
        router.replace("/login");
        return;
      }

      setUser(data.user);
      setLoading(false);
    };

    checkUser();

    // 🔥 ASCULTĂ SCHIMBĂRI DE LOGIN (FOARTE IMPORTANT PE MOBILE)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          router.replace("/login");
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Se încarcă...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
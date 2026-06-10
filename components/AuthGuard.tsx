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
  const [accessStatus, setAccessStatus] = useState<string | null>(null);
  const router = useRouter();

  const checkAccess = async (email: string) => {
    // Încearcă să găsești înregistrarea
    const { data } = await supabase
      .from("user_access")
      .select("status")
      .eq("email", email)
      .single();

    if (!data) {
      // Prima dată — inserează cererea automată
      await supabase.from("user_access").insert({ email, status: "pending" });
      return "pending";
    }

    return data.status;
  };

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

      const status = await checkAccess(data.user.email!);
      if (!mounted) return;

      setUser(data.user);
      setAccessStatus(status);
      setLoading(false);
    };

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const status = await checkAccess(session.user.email!);
          if (!mounted) return;
          setUser(session.user);
          setAccessStatus(status);
        } else {
          setUser(null);
          setAccessStatus(null);
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

  if (!user) return null;

  if (accessStatus === "pending") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-4">
        <div className="text-4xl">⏳</div>
        <h2 className="text-xl font-semibold">Acces în așteptare</h2>
        <p className="text-gray-500 max-w-sm">
          Cererea ta a fost trimisă. Vei putea accesa site-ul după ce administratorul îți aprobă contul.
        </p>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}
          className="mt-4 text-sm text-red-500 underline"
        >
          Deconectează-te
        </button>
      </div>
    );
  }

  if (accessStatus === "rejected") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-4">
        <div className="text-4xl">🚫</div>
        <h2 className="text-xl font-semibold">Acces refuzat</h2>
        <p className="text-gray-500 max-w-sm">
          Cererea ta a fost respinsă. Contactează administratorul pentru mai multe detalii.
        </p>
        <button
          onClick={() => supabase.auth.signOut().then(() => router.replace("/login"))}
          className="mt-4 text-sm text-red-500 underline"
        >
          Deconectează-te
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
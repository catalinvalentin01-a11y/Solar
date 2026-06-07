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
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setLoading(false);
    };

    check();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-500">
        Se încarcă...
      </div>
    );
  }

  return <>{children}</>;
}
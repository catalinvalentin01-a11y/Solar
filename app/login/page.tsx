"use client";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const loginWithGoogle = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/projects`,
    },
  });
};

  return (
    <div className="flex items-center justify-center h-screen">
      <button
        onClick={loginWithGoogle}
        className="bg-black text-white px-6 py-3 rounded"
      >
        Login cu Google
      </button>
    </div>
  );
}
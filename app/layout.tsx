"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

const SUPER_ADMIN = "catalinvalentin01@gmail.com";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const checkAdmin = async (userEmail: string) => {
    if (userEmail === SUPER_ADMIN) { setIsAdmin(true); return; }
    const { data } = await supabase
      .from("user_access")
      .select("is_admin")
      .eq("email", userEmail)
      .single();
    setIsAdmin(data?.is_admin === true);
  };

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      const userEmail = data.user?.email ?? null;
      setEmail(userEmail);
      if (userEmail) checkAdmin(userEmail);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userEmail = session?.user?.email ?? null;
      setEmail(userEmail);
      if (userEmail) checkAdmin(userEmail);
      else setIsAdmin(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <html lang="ro">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-screen flex flex-col md:flex-row">

        {/* SIDEBAR */}
        <aside className="w-full md:w-64 bg-gray-900 text-white p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">☀️ Solar</h1>
            {/* Clopoțel — vizibil doar pentru admini */}
            {isAdmin && <NotificationBell />}
          </div>

          <nav className="space-y-2 flex-1">
            <Link href="/" className="block hover:text-gray-300">
              Dashboard
            </Link>

            {isAdmin && (
              <Link href="/clients" className="block hover:text-gray-300">
                Clienți
              </Link>
            )}

            <Link href="/projects" className="block hover:text-gray-300">
              Proiecte
            </Link>

            <Link href="/today" className="block hover:text-gray-300">
              Montaje Azi
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="block mt-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 text-sm font-semibold px-3 py-2 rounded text-center transition"
              >
                ⚙️ Admin
              </Link>
            )}
          </nav>

          <div className="border-t border-gray-700 pt-3 mt-2">
            {email ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-400 truncate">Logat ca:</p>
                <p className="text-sm font-semibold text-white truncate">{email}</p>
                <button
                  onClick={handleLogout}
                  className="mt-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-2 rounded transition"
                >
                  Delogare
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded text-center transition"
              >
                Login
              </Link>
            )}
          </div>

        </aside>

        {/* CONTINUT */}
        <main className="flex-1 bg-gray-50 p-4 md:p-6 overflow-auto">
          {children}
        </main>

      </body>
    </html>
  );
}

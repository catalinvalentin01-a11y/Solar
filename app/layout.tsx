"use client";

import "./globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import NotificationBell from "@/components/NotificationBell";

const SUPER_ADMIN = "catalinvalentin01@gmail.com";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItem = (href: string, icon: React.ReactNode, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
        }`}
      >
        <span className={active ? "text-blue-400" : "text-slate-500"}>{icon}</span>
        {label}
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
      </Link>
    );
  };

  const AdminNav = () => (
    <>
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mt-4 mb-2">Gestionare</p>
      {navItem("/clients", <IconUsers />, "Clienți")}
      {navItem("/stocks", <IconBox />, "Stocuri")}
      {navItem("/admin", <IconSettings />, "Admin")}
    </>
  );

  const Sidebar = () => (
    <aside className="w-64 shrink-0 h-full bg-[#080f1a] border-r border-[#1e3a5f] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1e3a5f]">
        <div className="flex items-center gap-3">
          <SunLogo />
          <div>
            <div className="text-white font-bold text-lg leading-tight tracking-tight">
              Solar <span className="text-blue-400">Blu</span>
            </div>
            <div className="text-slate-500 text-xs">CRM Intern</div>
          </div>
          {isAdmin && (
            <div className="ml-auto">
              <NotificationBell />
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Principal</p>

        {navItem("/", <IconDashboard />, "Dashboard")}
        {navItem("/projects", <IconFolder />, "Proiecte")}
        {navItem("/today", <IconWrench />, "Montaje Azi")}

        {isAdmin && <AdminNav />}
      </nav>

      {/* Footer user */}
      <div className="px-3 py-4 border-t border-[#1e3a5f]">
        {email ? (
          <div className="space-y-2">
            <div className="px-3 py-2 rounded-xl bg-[#0d1b2a] border border-[#1e3a5f]">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Logat ca</p>
              <p className="text-xs font-semibold text-slate-300 truncate">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-sm font-medium px-3 py-2 rounded-xl transition"
            >
              Delogare
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-2 rounded-xl text-center transition"
          >
            Login
          </Link>
        )}
      </div>
    </aside>
  );

  return (
    <html lang="ro">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-screen bg-[#0d1b2a] text-slate-200 flex flex-col">

        {/* ── MOBILE TOP BAR ── */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#080f1a] border-b border-[#1e3a5f] sticky top-0 z-50">
          <div className="flex items-center gap-2.5">
            <SunLogo small />
            <span className="text-white font-bold text-base">
              Solar <span className="text-blue-400">Blu</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && <NotificationBell />}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-[#1e3a5f] border border-[#2a4a7f]"
            >
              <span className={`block w-5 h-0.5 bg-slate-300 transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block w-5 h-0.5 bg-slate-300 transition-all ${mobileOpen ? "opacity-0" : ""}`} />
              <span className={`block w-5 h-0.5 bg-slate-300 transition-all ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── MOBILE DRAWER ── */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="relative z-50 w-72 h-full bg-[#080f1a] border-r border-[#1e3a5f] flex flex-col shadow-2xl">
              {/* Logo */}
              <div className="px-5 py-5 border-b border-[#1e3a5f] flex items-center gap-3">
                <SunLogo />
                <div>
                  <div className="text-white font-bold text-lg leading-tight">
                    Solar <span className="text-blue-400">Blu</span>
                  </div>
                  <div className="text-slate-500 text-xs">CRM Intern</div>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Principal</p>
                {navItem("/", <IconDashboard />, "Dashboard")}
                {navItem("/projects", <IconFolder />, "Proiecte")}
                {navItem("/today", <IconWrench />, "Montaje Azi")}
                {isAdmin && <AdminNav />}
              </nav>

              {/* Footer */}
              <div className="px-3 py-4 border-t border-[#1e3a5f]">
                {email ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 rounded-xl bg-[#0d1b2a] border border-[#1e3a5f]">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">Logat ca</p>
                      <p className="text-xs font-semibold text-slate-300 truncate">{email}</p>
                    </div>
                    <button onClick={handleLogout} className="w-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-sm font-medium px-3 py-2 rounded-xl transition">
                      Delogare
                    </button>
                  </div>
                ) : (
                  <Link href="/login" className="block w-full bg-blue-600 text-white text-sm font-medium px-3 py-2 rounded-xl text-center">Login</Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DESKTOP LAYOUT ── */}
        <div className="hidden md:flex flex-1 min-h-screen">
          <Sidebar />
          <main className="flex-1 bg-[#0d1b2a] overflow-auto">
            {children}
          </main>
        </div>

        {/* ── MOBILE CONTENT ── */}
        <main className="md:hidden flex-1 bg-[#0d1b2a] overflow-auto">
          {children}
        </main>

      </body>
    </html>
  );
}

/* ── Sun Logo ── */
function SunLogo({ small }: { small?: boolean }) {
  const size = small ? 28 : 36;
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="19" cy="19" r="10" fill="#3b82f6" />
      <line x1="19" y1="2"  x2="19" y2="7"  stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="19" y1="31" x2="19" y2="36" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="2"  y1="19" x2="7"  y2="19" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="31" y1="19" x2="36" y2="19" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="6.5"  y1="6.5"  x2="10" y2="10" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="28"   y1="28"   x2="31.5" y2="31.5" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="31.5" y1="6.5"  x2="28" y2="10" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10"   y1="28"   x2="6.5" y2="31.5" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19" cy="19" r="6.5" fill="#1d4ed8" />
      <circle cx="19" cy="19" r="3.5" fill="#93c5fd" />
    </svg>
  );
}

/* ── Icons ── */
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconFolder = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  </svg>
);
const IconWrench = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconBox = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

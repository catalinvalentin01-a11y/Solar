"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  title: string;
  message: string;
  project_id: string;
  read: boolean;
  created_at: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unread = notifications.filter((n) => !n.read).length;

  async function handleNotificationClick(n: Notification) {
    await markOneRead(n.id);
    setOpen(false);
    if (n.project_id) {
      router.push(`/projects?open=${n.project_id}`);
    }
  }

  async function loadNotifications() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications(data || []);
  }

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markOneRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  // Calculează poziția panelului față de buton, ca să nu iasă din ecran
  function calcPanelStyle() {
    if (!ref.current) return;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // pe mobile rămâne fixed full-width
      setPanelStyle({});
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const panelWidth = 320;
    const margin = 8;

    // încearcă aliniere la dreapta butonului
    let left = rect.right - panelWidth;
    // dacă iese pe stânga, ancorează la stânga butonului
    if (left < margin) left = rect.left;
    // dacă iese pe dreapta, trage înapoi
    if (left + panelWidth > window.innerWidth - margin) {
      left = window.innerWidth - panelWidth - margin;
    }

    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: Math.max(margin, left),
      width: panelWidth,
    });
  }

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Închide dropdown când dai click în afară
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Recalculează poziția la resize
  useEffect(() => {
    if (!open) return;
    const handler = () => calcPanelStyle();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [open]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      loadNotifications();
      // mic delay ca ref-ul să fie randat
      setTimeout(() => calcPanelStyle(), 0);
    }
  };

  return (
    <div ref={ref} className="relative">
      {/* Buton clopoțel */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-gray-700 transition"
        title="Notificări"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay închidere pe mobile */}
          <div
            className="fixed inset-0 z-[9998] md:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Panel notificări — mobile: fixed full-width, desktop: poziționat calculat */}
          <div
            className="
              fixed left-2 right-2 top-16 z-[9999]
              md:left-auto md:right-auto md:top-auto
              bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden
            "
            style={
              // pe desktop aplicăm stilul calculat dinamic
              Object.keys(panelStyle).length > 0
                ? { ...panelStyle, zIndex: 9999 }
                : undefined
            }
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-gray-900 text-sm">Notificări</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Marchează toate citite
                </button>
              )}
            </div>

            {/* Listă notificări */}
            <div className="max-h-[60vh] md:max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-400 italic p-4 text-center">
                  Nicio notificare
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${
                      !n.read ? "bg-blue-50" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base mt-0.5">
                        {!n.read ? "🔵" : "⚪"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">
                          {n.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

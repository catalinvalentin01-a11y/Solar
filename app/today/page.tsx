"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

type Project = {
  id: string;
  client: string;
  phone: string;
  location: string;
  title: string;
  kw: string;
  battery: string;
  panels: string;
  inverter: string;
  status: string;
  date: string;
  roof_images: string[];
};

type Filter = "all" | "today" | "tomorrow";

export default function TodayPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // 🔥 FIX ZONE (timezone safe)
  const todayStr = new Date().toLocaleDateString("en-CA");
  const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");

  // ================= LOAD PROJECTS =================
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("date", { ascending: true });

      if (data) setProjects(data);
    };

    load();
  }, []);

  // ================= FILTER =================
  const filteredProjects = projects.filter((p) => {
    if (filter === "all") return true;
    if (filter === "today") return p.date === todayStr;
    if (filter === "tomorrow") return p.date === tomorrowStr;
    return true;
  });

  return (
    <AuthGuard>
      <div className="p-4 space-y-4 bg-gray-100 min-h-screen">

        <h1 className="text-2xl font-bold">
          📍 Plan montaj
        </h1>

        {/* FILTER */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded ${
              filter === "all" ? "bg-black text-white" : "bg-white"
            }`}
          >
            Toate
          </button>

          <button
            onClick={() => setFilter("today")}
            className={`px-3 py-1 rounded ${
              filter === "today" ? "bg-black text-white" : "bg-white"
            }`}
          >
            Azi
          </button>

          <button
            onClick={() => setFilter("tomorrow")}
            className={`px-3 py-1 rounded ${
              filter === "tomorrow" ? "bg-black text-white" : "bg-white"
            }`}
          >
            Mâine
          </button>
        </div>

        {/* EMPTY STATE */}
        {filteredProjects.length === 0 && (
          <p className="text-gray-500">
            Nu există proiecte în perioada selectată
          </p>
        )}

        {/* LIST */}
        {filteredProjects.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl p-4 shadow active:scale-[0.98] transition"
            onClick={() => setSelected(p)}
          >
            <div className="text-lg font-bold">{p.client}</div>
            <div className="text-gray-600">📍 {p.location}</div>

            <div className="mt-2">📅 {p.date}</div>
            <div className="mt-2">⚡ {p.kw} kW</div>
            <div>🔋 {p.battery}</div>
            <div>📦 {p.panels} panouri</div>
            <div>📞 {p.phone}</div>

            <div className="mt-2 font-semibold">
              Status: {p.status}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-4">

            <div className="text-lg font-bold mb-2">
              {selected.client}
            </div>

            <div className="text-gray-600">
              📍 {selected.location}
            </div>

            <div className="mt-2">📅 {selected.date}</div>
            <div className="mt-2">⚡ {selected.kw} kW</div>
            <div>🔋 {selected.battery}</div>
            <div>📦 {selected.panels}</div>

            <div className="mt-2 font-semibold">
              Status: {selected.status}
            </div>

            <div className="flex gap-2 mt-4">
              <a
                href={`tel:${selected.phone}`}
                className="flex-1 bg-green-600 text-white text-center py-2 rounded"
              >
                📞 Sună
              </a>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${selected.location}`}
                target="_blank"
                className="flex-1 bg-blue-600 text-white text-center py-2 rounded"
              >
                🧭 GPS
              </a>
            </div>

            <button
              className="mt-3 w-full bg-gray-200 py-2 rounded"
              onClick={() => setSelected(null)}
            >
              Închide
            </button>

          </div>
        </div>
      )}
    </AuthGuard>
  );
}
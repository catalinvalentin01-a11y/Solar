"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
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
  const [filter, setFilter] = useState<Filter>("today");
  const router = useRouter();

  const todayStr = new Date().toLocaleDateString("en-CA");
  const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");

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

  const filteredProjects = projects.filter((p) => {
    if (filter === "all") return true;
    if (filter === "today") return p.date === todayStr;
    if (filter === "tomorrow") return p.date === tomorrowStr;
    return true;
  });

  const getStatusColor = (status: string) => {
    if (status === "Finalizat") return "text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-sm font-semibold";
    if (status === "În lucru") return "text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-sm font-semibold";
    return "text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full text-sm font-semibold";
  };

  return (
    <AuthGuard>
      <div className="p-4 space-y-4 bg-gray-100 min-h-screen" style={{ fontFamily: "inherit" }}>

        <h1 className="text-2xl font-bold text-gray-900">📍 Plan montaj</h1>

        {/* FILTER */}
        <div className="flex gap-2 mb-2">
          {(["all", "today", "tomorrow"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded font-semibold text-base border ${
                filter === f
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-800 border-gray-300"
              }`}
            >
              {f === "all" ? "Toate" : f === "today" ? "Azi" : "Mâine"}
            </button>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <p className="text-gray-600 font-medium">Nu există proiecte în perioada selectată</p>
        )}

        {filteredProjects.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl p-4 shadow active:scale-[0.98] transition cursor-pointer"
            onClick={() => setSelected(p)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-lg font-bold text-gray-900">{p.client}</div>
              <span className={getStatusColor(p.status)}>{p.status}</span>
            </div>
            <div className="text-gray-700 font-medium mt-1">📍 {p.location}</div>
            <div className="mt-2 text-gray-800 font-medium">📅 {p.date}</div>
            <div className="mt-1 text-gray-800 font-medium">⚡ {p.kw} kW</div>
            <div className="text-gray-800 font-medium">🔋 {p.battery}</div>
            <div className="text-gray-800 font-medium">📦 {p.panels} panouri</div>
            <div className="text-gray-800 font-medium">📞 {p.phone}</div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-5" style={{ fontFamily: "inherit" }}>

            <div className="text-xl font-bold text-gray-900 mb-1">{selected.client}</div>
            <div className="text-gray-500 text-sm mb-3">{selected.title}</div>

            <div className="text-gray-700 font-medium">📍 {selected.location}</div>
            <div className="mt-2 text-gray-800 font-medium">📅 {selected.date}</div>
            <div className="mt-1 text-gray-800 font-medium">⚡ {selected.kw} kW</div>
            <div className="text-gray-800 font-medium">🔋 {selected.battery}</div>
            <div className="text-gray-800 font-medium">📦 {selected.panels}</div>

            <div className="mt-2">
              <span className={
                selected.status === "Finalizat"
                  ? "text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-sm font-semibold"
                  : selected.status === "În lucru"
                  ? "text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-sm font-semibold"
                  : "text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full text-sm font-semibold"
              }>
                {selected.status}
              </span>
            </div>

            {/* Butoane actiuni */}
            <div className="flex gap-2 mt-4">
              <a
                href={`tel:${selected.phone}`}
                className="flex-1 bg-green-600 text-white text-center py-3 rounded-lg font-semibold text-base"
              >
                📞 Sună
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.location)}`}
                target="_blank"
                className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg font-semibold text-base"
              >
                🧭 GPS
              </a>
            </div>

            {/* Buton Vezi proiect complet */}
            <button
              className="mt-3 w-full bg-gray-900 text-white font-semibold py-3 rounded-lg text-base hover:bg-gray-800 transition"
              onClick={() => {
                setSelected(null);
                router.push(`/projects?open=${selected.id}`);
              }}
            >
              📋 Vezi proiect complet
            </button>

            <button
              className="mt-2 w-full bg-gray-200 text-gray-900 font-semibold py-3 rounded-lg text-base"
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

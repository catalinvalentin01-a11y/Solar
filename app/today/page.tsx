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

function getStatusBadge(status: string) {
  if (status === "Finalizat") return "bg-green-500/20 text-green-400 border border-green-500/30";
  if (status === "În lucru")  return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
}

export default function TodayPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [filter, setFilter]     = useState<Filter>("today");
  const [showNavMenu, setShowNavMenu] = useState(false);
  const router = useRouter();

  const todayStr    = new Date().toLocaleDateString("en-CA");
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

  const filtered = projects.filter((p) => {
    if (filter === "all")      return true;
    if (filter === "today")    return p.date === todayStr;
    if (filter === "tomorrow") return p.date === tomorrowStr;
    return true;
  });

  return (
    <AuthGuard>
      <div className="p-4 md:p-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Plan montaj</h1>
          <p className="text-slate-400 text-sm mt-1">Proiecte programate pe zile</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["today", "tomorrow", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-[#0a1628] border border-[#1e3a5f] text-slate-400 hover:text-slate-200 hover:border-blue-500/50"
              }`}
            >
              {f === "all" ? "Toate" : f === "today" ? "Azi" : "Mâine"}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3 opacity-40">📋</div>
            <p className="text-sm">Niciun proiect în perioada selectată</p>
          </div>
        )}

        {/* Project cards */}
        <div className="flex flex-col gap-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4 cursor-pointer hover:border-blue-500/50 transition"
              onClick={() => setSelected(p)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="font-bold text-white text-base">{p.client}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${getStatusBadge(p.status)}`}>{p.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {p.location}
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {p.date}
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  {p.kw} kW
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-1a2 2 0 0 0-2 2v2H11V5a2 2 0 0 0-2-2H8"/></svg>
                  {p.panels} panouri
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/></svg>
                {p.phone}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal — bottom sheet */}
      {selected && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => { setSelected(null); setShowNavMenu(false); }}
        >
          <div
            className="relative w-full max-w-lg bg-[#0d1b2a] border border-[#1e3a5f] rounded-t-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-9 h-1 bg-[#1e3a5f] rounded-full mx-auto mb-5" />

            {/* Title */}
            <div className="mb-4">
              <div className="text-lg font-bold text-white mb-1">{selected.client}</div>
              <div className="text-sm text-slate-400">{selected.title}</div>
            </div>

            {/* Details */}
            <div className="space-y-2 mb-5">
              {[
                { icon: <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>, val: selected.location },
                { icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>, val: selected.date },
                { icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>, val: `${selected.kw} kW` },
                { icon: <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-1a2 2 0 0 0-2 2v2H11V5a2 2 0 0 0-2-2H8"/></>, val: selected.battery },
                { icon: <><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>, val: selected.panels },
              ].map((row, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[#1e3a5f] text-sm text-slate-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{row.icon}</svg>
                  <span className="font-semibold">{row.val}</span>
                </div>
              ))}
              <div className="pt-2">
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${getStatusBadge(selected.status)}`}>{selected.status}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <a
                href={`tel:${selected.phone}`}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/></svg>
                Sună
              </a>
              <div className="relative">
                <button
                  onClick={() => setShowNavMenu((v) => !v)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  GPS
                </button>

                {showNavMenu && (
                  <div
                    className="absolute bottom-full mb-2 left-0 right-0 bg-[#0d1b2a] border border-[#1e3a5f] rounded-xl shadow-2xl overflow-hidden z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.location)}`}
                      target="_blank"
                      onClick={() => setShowNavMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-[#1e3a5f] transition border-b border-[#1e3a5f]"
                    >
                      📍 Google Maps
                    </a>
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent(selected.location)}&navigate=yes`}
                      target="_blank"
                      onClick={() => setShowNavMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-[#1e3a5f] transition border-b border-[#1e3a5f]"
                    >
                      🚗 Waze
                    </a>
                    <a
                      href={`https://maps.apple.com/?q=${encodeURIComponent(selected.location)}`}
                      target="_blank"
                      onClick={() => setShowNavMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-200 hover:bg-[#1e3a5f] transition"
                    >
                      🗺️ Apple Maps
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button
              className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-slate-300 font-semibold px-4 py-2.5 rounded-xl text-sm transition mb-2"
              onClick={() => {
                const id = selected.id;
                setSelected(null);
                setShowNavMenu(false);
                router.push(`/projects?open=${id}`);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Vezi proiect complet
            </button>

            <button
              className="w-full flex items-center justify-center bg-transparent border border-[#1e3a5f] hover:border-blue-500/50 text-slate-400 hover:text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-sm transition"
              onClick={() => { setSelected(null); setShowNavMenu(false); }}
            >
              Închide
            </button>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}

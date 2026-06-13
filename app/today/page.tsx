"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import SolarBluSidebar from "@/components/SolarBluSidebar";

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
  if (status === "Finalizat") return "sb-badge green";
  if (status === "În lucru")  return "sb-badge blue";
  return "sb-badge gray";
}

export default function TodayPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [filter, setFilter]     = useState<Filter>("today");
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
      <div className="sb-layout">
        <SolarBluSidebar />

        <main className="sb-main">
          {/* Header */}
          <div className="sb-page-header">
            <div>
              <h1 className="sb-page-title">Plan montaj</h1>
              <p className="sb-page-sub">Proiecte programate pe zile</p>
            </div>
          </div>

          <div style={{ padding: "0 24px 32px" }}>

            {/* Filter */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {(["today", "tomorrow", "all"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`sb-filter-btn ${filter === f ? "active" : ""}`}
                >
                  {f === "all" ? "Toate" : f === "today" ? "Azi" : "Mâine"}
                </button>
              ))}
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div style={{
                textAlign: "center",
                padding: "48px 0",
                color: "var(--sb-text-muted)",
                fontSize: "14px",
              }}>
                <div style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.4 }}>📋</div>
                Niciun proiect în perioada selectată
              </div>
            )}

            {/* Project cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="sb-project-card"
                  onClick={() => setSelected(p)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px" }}>
                    <div className="sb-project-card-name">{p.client}</div>
                    <span className={getStatusBadge(p.status)}>{p.status}</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                    <div className="sb-project-card-meta">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {p.location}
                    </div>
                    <div className="sb-project-card-meta">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {p.date}
                    </div>
                    <div className="sb-project-card-meta">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      {p.kw} kW
                    </div>
                    <div className="sb-project-card-meta">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-1a2 2 0 0 0-2 2v2H11V5a2 2 0 0 0-2-2H8"/></svg>
                      {p.panels} panouri
                    </div>
                  </div>

                  <div className="sb-project-card-meta" style={{ marginTop: "8px" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/></svg>
                    {p.phone}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Modal — bottom sheet */}
      {selected && (
        <div className="sb-modal-overlay" style={{ alignItems: "flex-end" }} onClick={() => setSelected(null)}>
          <div className="sb-modal-sheet" onClick={(e) => e.stopPropagation()}>

            {/* Handle */}
            <div style={{ width: "36px", height: "4px", background: "var(--sb-border-strong)", borderRadius: "2px", margin: "0 auto 18px" }} />

            {/* Title */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--sb-text-primary)", marginBottom: "4px" }}>
                {selected.client}
              </div>
              <div style={{ fontSize: "13px", color: "var(--sb-text-muted)" }}>{selected.title}</div>
            </div>

            {/* Details */}
            <div style={{ marginBottom: "18px" }}>
              <div className="sb-detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <strong>{selected.location}</strong>
              </div>
              <div className="sb-detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <strong>{selected.date}</strong>
              </div>
              <div className="sb-detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <strong>{selected.kw} kW</strong>
              </div>
              <div className="sb-detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-1a2 2 0 0 0-2 2v2H11V5a2 2 0 0 0-2-2H8"/></svg>
                <strong>{selected.battery}</strong>
              </div>
              <div className="sb-detail-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                <strong>{selected.panels}</strong>
              </div>
              <div className="sb-detail-row" style={{ border: "none" }}>
                <span className={getStatusBadge(selected.status)}>{selected.status}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <a href={`tel:${selected.phone}`} className="sb-btn success" style={{ justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.12 6.12l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/></svg>
                Sună
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.location)}`}
                target="_blank"
                className="sb-btn primary"
                style={{ justifyContent: "center" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                GPS
              </a>
            </div>

            <button
              className="sb-btn ghost"
              style={{ width: "100%", justifyContent: "center", marginBottom: "8px" }}
              onClick={() => {
                setSelected(null);
                router.push(`/projects?open=${selected.id}`);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              Vezi proiect complet
            </button>

            <button
              className="sb-btn ghost"
              style={{ width: "100%", justifyContent: "center" }}
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

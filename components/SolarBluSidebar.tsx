"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SolarBluSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sb-sidebar">
      {/* Logo */}
      <div className="sb-logo-area">
        <SunLogo />
        <div>
          <div className="sb-brand">Solar <span>Blu</span></div>
          <div className="sb-brand-sub">CRM Intern</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        <div className="sb-nav-label">Principal</div>

        <Link href="/" className={`sb-nav-item ${pathname === "/" ? "active" : ""}`}>
          <IconDashboard /> Dashboard
        </Link>

        <Link href="/projects" className={`sb-nav-item ${pathname === "/projects" ? "active" : ""}`}>
          <IconFolder /> Proiecte
        </Link>

        <Link href="/today" className={`sb-nav-item ${pathname === "/today" ? "active" : ""}`}>
          <IconWrench /> Montaje Azi
        </Link>

        <div className="sb-nav-label">Gestionare</div>

        <a href="#" className="sb-nav-item">
          <IconUsers /> Clienți
        </a>

        <a href="#" className="sb-nav-item">
          <IconChart /> Rapoarte
        </a>
      </nav>

      {/* Footer */}
      <div className="sb-nav-footer">
        <a href="#" className="sb-nav-item">
          <IconSettings /> Setări
        </a>
      </div>
    </aside>
  );
}

/* ── Sun logo SVG ── */
function SunLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 38 38" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="19" cy="19" r="10" fill="#3b82f6" />
      <line x1="19" y1="2" x2="19" y2="7" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="19" y1="31" x2="19" y2="36" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="2" y1="19" x2="7" y2="19" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="31" y1="19" x2="36" y2="19" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="6.5" y1="6.5" x2="10" y2="10" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="28" y1="28" x2="31.5" y2="31.5" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="31.5" y1="6.5" x2="28" y2="10" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="10" y1="28" x2="6.5" y2="31.5" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="19" cy="19" r="6.5" fill="#1d4ed8" />
      <circle cx="19" cy="19" r="3.5" fill="#93c5fd" />
    </svg>
  );
}

/* ── Inline icons ── */
const IconDashboard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconFolder = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

const IconWrench = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IconUsers = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconChart = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

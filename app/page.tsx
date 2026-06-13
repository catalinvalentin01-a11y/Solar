import Link from "next/link";
import SolarBluSidebar from "@/components/SolarBluSidebar";

export default function Page() {
  const today = new Date().toLocaleDateString("ro-RO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="sb-layout">
      <SolarBluSidebar />

      <main className="sb-main">
        {/* Header */}
        <div className="sb-page-header">
          <div>
            <h1 className="sb-page-title">Bună ziua 👋</h1>
            <p className="sb-page-sub">Rezumatul activității Solar Blu</p>
          </div>
          <div style={{
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: "var(--sb-radius-sm)",
            padding: "8px 14px",
            fontSize: "12.5px",
            color: "var(--sb-blue-muted)",
            textTransform: "capitalize",
          }}>
            {today}
          </div>
        </div>

        <div style={{ padding: "0 32px 32px" }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "12px", marginBottom: "24px" }}>
            <div className="sb-stat">
              <div className="sb-stat-label">Proiecte active</div>
              <div className="sb-stat-val blue">—</div>
              <div className="sb-stat-sub">în desfășurare</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat-label">Finalizate</div>
              <div className="sb-stat-val green">—</div>
              <div className="sb-stat-sub">total</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat-label">Montaje azi</div>
              <div className="sb-stat-val amber">—</div>
              <div className="sb-stat-sub">programate</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat-label">Total proiecte</div>
              <div className="sb-stat-val">—</div>
              <div className="sb-stat-sub">înregistrate</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="sb-card" style={{ marginBottom: "20px" }}>
            <div className="sb-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Acces rapid
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <Link href="/projects" className="sb-btn primary" style={{ justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
                Proiecte
              </Link>
              <Link href="/today" className="sb-btn success" style={{ justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                Montaje Azi
              </Link>
            </div>
          </div>

          {/* Info */}
          <div className="sb-card">
            <div className="sb-card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Despre Solar Blu CRM
            </div>
            <p style={{ fontSize: "13px", color: "var(--sb-text-secondary)", lineHeight: 1.7, margin: 0 }}>
              Sistem intern de gestionare a proiectelor fotovoltaice. Urmărește montajele, materialele și statusul fiecărui proiect din calendarul de proiecte.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}

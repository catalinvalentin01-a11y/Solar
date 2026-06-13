import Link from "next/link";

export default function Page() {
  const today = new Date().toLocaleDateString("ro-RO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="p-4 md:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Bună ziua 👋</h1>
          <p className="text-slate-400 text-sm mt-1">Rezumatul activității Solar Blu</p>
        </div>
        <div className="inline-flex items-center bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-xs text-blue-400 capitalize font-medium">
          {today}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-2">Proiecte active</p>
          <p className="text-2xl font-bold text-blue-400">—</p>
          <p className="text-xs text-slate-500 mt-1">în desfășurare</p>
        </div>
        <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-2">Finalizate</p>
          <p className="text-2xl font-bold text-green-400">—</p>
          <p className="text-xs text-slate-500 mt-1">total</p>
        </div>
        <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-2">Montaje azi</p>
          <p className="text-2xl font-bold text-yellow-400">—</p>
          <p className="text-xs text-slate-500 mt-1">programate</p>
        </div>
        <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-2">Total proiecte</p>
          <p className="text-2xl font-bold text-slate-300">—</p>
          <p className="text-xs text-slate-500 mt-1">înregistrate</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Acces rapid
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/projects"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            Proiecte
          </Link>
          <Link
            href="/today"
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            Montaje Azi
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#0a1628] border border-[#1e3a5f] rounded-xl p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Despre Solar Blu CRM
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          Sistem intern de gestionare a proiectelor fotovoltaice. Urmărește montajele, materialele și statusul fiecărui proiect din calendarul de proiecte.
        </p>
      </div>

    </div>
  );
}

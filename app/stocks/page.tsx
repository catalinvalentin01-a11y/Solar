"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

const SUPER_ADMIN = "catalinvalentin01@gmail.com";

type Material = {
  id: string;
  name: string;
  unit: string;
  role: string;
  quantity: number;
  min_quantity: number;
  code?: string | null;
  photo_url?: string | null;
};

type StockMovement = {
  id: string;
  material_id: string;
  project_id: string | null;
  quantity_change: number;
  type: string;
  note: string | null;
  created_at: string;
  projects?: { client: string; title: string } | null;
};

type AdjustModal = {
  material: Material;
  mode: "add" | "remove";
} | null;

type AddMaterialModal = {
  role: "montator" | "electrician" | "hala";
} | null;

type AssignModal = {
  material: Material;
} | null;

export default function StocksPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "montator" | "electrician" | "hala">("all");

  const [adjustModal, setAdjustModal] = useState<AdjustModal>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const [addMaterialModal, setAddMaterialModal] = useState<AddMaterialModal>(null);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("buc");
  const [newMinQty, setNewMinQty] = useState("");

  const [assignModal, setAssignModal] = useState<AssignModal>(null);

  const [movementsModal, setMovementsModal] = useState<Material | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingUnit, setEditingUnit] = useState("");
  const [editingMinQty, setEditingMinQty] = useState("");
  const [editingCode, setEditingCode] = useState("");
  const [editingPhotoUrl, setEditingPhotoUrl] = useState<string | null>(null);
  const [editingUploading, setEditingUploading] = useState(false);

  const [newCode, setNewCode] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState<string | null>(null);
  const [newPhotoUploading, setNewPhotoUploading] = useState(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      if (data.user.email === SUPER_ADMIN) {
        setIsAdmin(true);
        setIsSuperAdmin(true);
        setLoading(false);
        return;
      }
      const { data: access } = await supabase
        .from("user_access")
        .select("is_admin")
        .eq("email", data.user.email)
        .single();
      setIsAdmin(access?.is_admin === true);
      setLoading(false);
    };
    check();
  }, []);

  useEffect(() => {
    if (!loading) loadMaterials();
  }, [loading]);

  async function loadMaterials() {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("name", { ascending: true });
    if (error) { console.error(error); return; }
    setMaterials(data || []);
  }

  async function loadMovements(materialId: string) {
    setMovementsLoading(true);
    const { data, error } = await supabase
      .from("stock_movements")
      .select("*, projects(client, title)")
      .eq("material_id", materialId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { console.error(error); }
    setMovements(data || []);
    setMovementsLoading(false);
  }

  async function uploadMaterialPhoto(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const fileName = `materials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("project-images")
      .upload(fileName, file, { upsert: false });
    if (error) { alert("Eroare upload: " + error.message); return null; }
    const { data } = supabase.storage.from("project-images").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleAddMaterial() {
    if (!addMaterialModal) return;
    const name = newName.trim();
    if (!name) return;
    const { error } = await supabase.from("materials").insert({
      name,
      unit: newUnit,
      role: addMaterialModal.role,
      quantity: 0,
      min_quantity: parseFloat(newMinQty) || 0,
      code: newCode.trim() || null,
      photo_url: newPhotoUrl || null,
    });
    if (error) { alert(error.message); return; }
    setNewName(""); setNewUnit("buc"); setNewMinQty(""); setNewCode(""); setNewPhotoUrl(null);
    setAddMaterialModal(null);
    await loadMaterials();
  }

  async function handleAdjust() {
    if (!adjustModal) return;
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty <= 0) { alert("Introdu o cantitate validă"); return; }
    const change = adjustModal.mode === "add" ? qty : -qty;
    const newQty = (adjustModal.material.quantity || 0) + change;
    if (newQty < 0) { alert("Stocul nu poate fi negativ!"); return; }

    const { error: updateError } = await supabase
      .from("materials")
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", adjustModal.material.id);
    if (updateError) { alert(updateError.message); return; }

    await supabase.from("stock_movements").insert({
      material_id: adjustModal.material.id,
      project_id: null,
      quantity_change: change,
      type: adjustModal.mode === "add" ? "receptie" : "ajustare",
      note: adjustNote || null,
    });

    // Notificare automată dacă stocul a atins sau depășit minimul
    const mat = adjustModal.material;
    const prevQty = mat.quantity || 0;
    const wasOk = mat.min_quantity <= 0 || prevQty > mat.min_quantity;
    const nowCritic = mat.min_quantity > 0 && newQty <= mat.min_quantity;
    if (wasOk && nowCritic) {
      await supabase.from("notifications").insert({
        title: "⚠️ Stoc critic",
        message: `${mat.name} a ajuns la ${newQty} ${mat.unit} (minim: ${mat.min_quantity} ${mat.unit}). Comandă stoc!`,
        project_id: null,
        read: false,
      });
    }

    setAdjustModal(null);
    setAdjustQty("");
    setAdjustNote("");
    await loadMaterials();
  }

  async function handleAssign(role: "montator" | "electrician" | "hala") {
    if (!assignModal) return;
    const { error } = await supabase
      .from("materials")
      .update({ role })
      .eq("id", assignModal.material.id);
    if (error) { alert(error.message); return; }
    setAssignModal(null);
    await loadMaterials();
  }

  async function handleSaveEdit(id: string) {
    const name = editingName.trim();
    if (!name) return;
    const { error } = await supabase
      .from("materials")
      .update({ name, unit: editingUnit, min_quantity: parseFloat(editingMinQty) || 0, code: editingCode.trim() || null, photo_url: editingPhotoUrl || null })
      .eq("id", id);
    if (error) { alert(error.message); return; }
    setEditingId(null);
    await loadMaterials();
  }

  async function handleDelete(id: string) {
    if (!confirm("Ștergi materialul din stoc?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) { alert(error.message); return; }
    await loadMaterials();
  }

  // ── PDF EXPORT ──
  async function handlePrintPDF() {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageW = 210;
    const margin = 14;
    const now = new Date();
    const dateStr = now.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });

    // Header
    doc.setFillColor(8, 15, 26);
    doc.rect(0, 0, pageW, 28, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(96, 165, 250); // blue-400
    doc.text("Solar Blu", margin, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("CRM Intern — Gestiune Stocuri", margin, 18);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generat: ${dateStr} la ${timeStr}`, pageW - margin, 12, { align: "right" });
    doc.text(`${materials.length} materiale în evidență`, pageW - margin, 18, { align: "right" });

    // Linie separator header
    doc.setDrawColor(30, 58, 95);
    doc.setLineWidth(0.5);
    doc.line(margin, 28, pageW - margin, 28);

    let y = 36;

    // Alerte stoc critic
    const lowStock = materials.filter((m) => m.min_quantity > 0 && (m.quantity || 0) <= m.min_quantity);
    if (lowStock.length > 0) {
      doc.setFillColor(127, 29, 29, 0.15);
      doc.setDrawColor(239, 68, 68);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, pageW - margin * 2, 8 + lowStock.length * 5, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(248, 113, 113);
      doc.text(`! Stoc critic — ${lowStock.length} material${lowStock.length !== 1 ? "e" : ""}`, margin + 3, y + 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(252, 165, 165);
      lowStock.forEach((m, i) => {
        doc.text(`- ${m.name} — ${m.quantity || 0} ${m.unit} (min: ${m.min_quantity} ${m.unit})`, margin + 5, y + 10 + i * 5);
      });

      y += 12 + lowStock.length * 5 + 6;
    }

    // Funcție pentru a desena o secțiune
    const drawSection = (title: string, emoji: string, color: [number, number, number], items: Material[]) => {
      if (items.length === 0) return;

      // Verifică dacă mai e loc pe pagina curentă
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      // Titlu secțiune
      doc.setFillColor(...color, 0.15);
      doc.setDrawColor(...color);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, pageW - margin * 2, 9, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...color);
      doc.text(`>> ${title}`, margin + 4, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`${items.length} materiale`, pageW - margin - 3, y + 6, { align: "right" });

      y += 13;

      // Header tabel
      doc.setFillColor(13, 27, 42);
      doc.rect(margin, y, pageW - margin * 2, 6, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("MATERIAL", margin + 3, y + 4);
      doc.text("COD", margin + 85, y + 4);
      doc.text("U.M.", margin + 108, y + 4);
      doc.text("STOC CURENT", margin + 122, y + 4);
      doc.text("STOC MINIM", margin + 148, y + 4);
      doc.text("STATUS", margin + 170, y + 4);
      y += 7;

      // Rânduri materiale
      items.forEach((m, i) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }

        const rowBg = i % 2 === 0 ? [10, 22, 40] : [13, 27, 42];
        doc.setFillColor(...rowBg as [number,number,number]);
        doc.rect(margin, y, pageW - margin * 2, 7, "F");

        const qty = m.quantity || 0;
        const isCritic = m.min_quantity > 0 && qty <= m.min_quantity;
        const isEmpty = qty === 0;

        // Nume material
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(226, 232, 240);
        doc.text(m.name, margin + 3, y + 4.8);

        // Cod material
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(96, 165, 250);
        doc.text((m as any).code || "—", margin + 85, y + 4.8);

        // U.M.
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(m.unit, margin + 108, y + 4.8);

        // Stoc curent
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(isCritic ? 248 : isEmpty ? 100 : 74, isCritic ? 113 : isEmpty ? 116 : 222, isCritic ? 113 : isEmpty ? 139 : 128);
        doc.text(String(qty), margin + 122, y + 4.8);

        // Stoc minim
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(m.min_quantity > 0 ? String(m.min_quantity) : "—", margin + 148, y + 4.8);

        // Status badge
        const statusLabel = isCritic ? "CRITIC" : isEmpty ? "GOL" : "OK";
        const statusColor: [number, number, number] = isCritic ? [248, 113, 113] : isEmpty ? [100, 116, 139] : [74, 222, 128];
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...statusColor);
        doc.text(statusLabel, margin + 170, y + 4.8);

        y += 7;
      });

      y += 6; // spațiu după secțiune
    };

    const montatori = materials.filter((m) => m.role === "montator");
    const electricieni = materials.filter((m) => m.role === "electrician");
    const hala = materials.filter((m) => m.role === "hala");

    drawSection("Materiale Montator", "[M]", [59, 130, 246], montatori);
    drawSection("Materiale Electrician", "[E]", [234, 179, 8], electricieni);
    drawSection("Materiale Hala", "[H]", [168, 85, 247], hala);

    // Footer pe fiecare pagină
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.3);
      doc.line(margin, 287, pageW - margin, 287);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text("Solar Blu CRM — Raport Stocuri", margin, 292);
      doc.text(`Pagina ${i} / ${totalPages}`, pageW - margin, 292, { align: "right" });
    }

    doc.save(`stocuri-solar-blu-${dateStr.replace(/\./g, "-")}.pdf`);
  }

  // ── PRINT BROWSER ──
  function handlePrintBrowser() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = now.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });

    const montatori = materials.filter((m) => m.role === "montator");
    const electricieni = materials.filter((m) => m.role === "electrician");
    const hala = materials.filter((m) => m.role === "hala");

    const renderRows = (items: Material[]) =>
      items.map((m) => {
        const qty = m.quantity || 0;
        const isCritic = m.min_quantity > 0 && qty <= m.min_quantity;
        const isEmpty = qty === 0;
        const status = isCritic ? "CRITIC" : isEmpty ? "GOL" : "OK";
        const statusColor = isCritic ? "#dc2626" : isEmpty ? "#64748b" : "#16a34a";
        return `
          <tr>
            <td>${m.name}</td>
            <td>${m.unit}</td>
            <td style="font-weight:bold; color:${isCritic ? "#dc2626" : isEmpty ? "#64748b" : "#111"};">${qty}</td>
            <td>${m.min_quantity > 0 ? m.min_quantity : "—"}</td>
            <td style="font-weight:bold; color:${statusColor};">${status}</td>
          </tr>`;
      }).join("");

    const renderSection = (title: string, emoji: string, items: Material[]) => {
      if (items.length === 0) return "";
      return `
        <h2>${emoji} ${title} <span class="count">(${items.length} materiale)</span></h2>
        <table>
          <thead>
            <tr><th>Material</th><th>U.M.</th><th>Stoc curent</th><th>Stoc minim</th><th>Status</th></tr>
          </thead>
          <tbody>${renderRows(items)}</tbody>
        </table>`;
    };

    const lowStockList = materials.filter((m) => m.min_quantity > 0 && (m.quantity || 0) <= m.min_quantity);
    const alertHtml = lowStockList.length > 0 ? `
      <div class="alert">
        <strong>⚠ Stoc critic — ${lowStockList.length} material${lowStockList.length !== 1 ? "e" : ""}</strong>
        <ul>${lowStockList.map((m) => `<li>${m.name} — ${m.quantity || 0} ${m.unit} (min: ${m.min_quantity} ${m.unit})</li>`).join("")}</ul>
      </div>` : "";

    const html = `
      <!DOCTYPE html>
      <html lang="ro">
      <head>
        <meta charset="UTF-8" />
        <title>Stocuri Solar Blu — ${dateStr}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #111; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 2px; }
          .subtitle { color: #555; font-size: 12px; margin: 0 0 16px; }
          .meta { text-align: right; font-size: 11px; color: #555; margin-bottom: 12px; }
          h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
          .count { font-size: 11px; color: #777; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th, td { text-align: left; padding: 6px 8px; font-size: 12px; border-bottom: 1px solid #eee; }
          th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; color: #666; }
          .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 14px; margin-bottom: 18px; font-size: 12px; color: #b91c1c; }
          .alert ul { margin: 6px 0 0; padding-left: 18px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Solar Blu — Gestiune Stocuri</h1>
        <p class="subtitle">CRM Intern</p>
        <div class="meta">Generat: ${dateStr} la ${timeStr} &nbsp;|&nbsp; ${materials.length} materiale în evidență</div>
        ${alertHtml}
        ${renderSection("Materiale Montator", "🔩", montatori)}
        ${renderSection("Materiale Electrician", "⚡", electricieni)}
        ${renderSection("Materiale Hală", "🏪", hala)}
      </body>
      </html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) { alert("Permite ferestrele pop-up pentru a printa."); return; }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  const filtered = materials.filter((m) => {
    if (activeTab === "all") return true;
    return m.role === activeTab;
  });

  const lowStock = materials.filter(
    (m) => m.min_quantity > 0 && (m.quantity || 0) <= m.min_quantity
  );

  const stockBadge = (m: Material) => {
    const qty = m.quantity || 0;
    if (m.min_quantity > 0 && qty <= m.min_quantity) {
      return { color: "text-red-400 bg-red-500/10 border-red-500/30", label: "⚠️ Critic" };
    }
    if (qty === 0) {
      return { color: "text-slate-500 bg-slate-500/10 border-slate-500/30", label: "Gol" };
    }
    return { color: "text-green-400 bg-green-500/10 border-green-500/30", label: "OK" };
  };

  const roleBadge = (role: string) => {
    if (role === "montator") return "bg-blue-500/10 text-blue-400 border border-blue-500/30";
    if (role === "electrician") return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30";
    if (role === "hala") return "bg-purple-500/10 text-purple-400 border border-purple-500/30";
    return "bg-slate-500/10 text-slate-400 border border-slate-500/30";
  };

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500 text-sm">Acces restricționat.</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="p-3 md:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-900/30 text-xl">
              🏭
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Gestiune Stocuri</h1>
              <p className="text-xs text-slate-500">{materials.length} materiale în evidență</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Buton Print */}
            <button
              onClick={handlePrintBrowser}
              className="flex items-center gap-2 bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
              title="Printează stocuri"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </button>

            {/* Buton PDF */}
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
              title="Descarcă PDF stocuri"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9 15 12 18 15 15"/>
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        {/* Alerte stoc minim */}
        {lowStock.length > 0 && (
          <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 font-semibold text-sm mb-2">⚠️ Stoc critic — {lowStock.length} material{lowStock.length !== 1 ? "e" : ""}</p>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((m) => (
                <span key={m.id} className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-full">
                  {m.name} — {m.quantity || 0} {m.unit}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-[#0a1628] p-1 rounded-xl border border-[#1e3a5f]">
          {(["all", "montator", "electrician", "hala"] as const).map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "all" ? "🏭 Toate" : tab === "montator" ? "🔩 Montator" : tab === "electrician" ? "⚡ Electrician" : "🏪 Hală"}
              <span className="ml-1.5 text-xs opacity-70">
                ({tab === "all" ? materials.length : materials.filter((m) => m.role === tab).length})
              </span>
            </button>
          ))}
        </div>

        {/* Butoane adaugare */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-500/20 transition"
            onClick={() => setAddMaterialModal({ role: "montator" })}
          >
            + Material Montator
          </button>
          <button
            className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-yellow-500/20 transition"
            onClick={() => setAddMaterialModal({ role: "electrician" })}
          >
            + Material Electrician
          </button>
          <button
            className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-500/20 transition"
            onClick={() => setAddMaterialModal({ role: "hala" })}
          >
            + Material Hală
          </button>
        </div>

        {/* Lista materiale */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm italic">
            Nu există materiale{activeTab !== "all" ? ` pentru ${activeTab}` : ""}. Adaugă primul material mai sus.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((mat) => {
              const badge = stockBadge(mat);
              const isEditing = editingId === mat.id;
              return (
                <div
                  key={mat.id}
                  className="bg-[#0d1b2a] border border-[#1e3a5f] rounded-xl p-3 md:p-4 transition hover:border-blue-500/30"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          className="bg-[#0d2137] border border-blue-500 p-2 rounded-lg text-sm text-slate-200 flex-1 min-w-[140px] outline-none"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                        />
                        <input
                          className="bg-[#0d2137] border border-[#1e3a5f] p-2 rounded-lg text-sm text-slate-200 w-20 outline-none"
                          placeholder="U.M."
                          value={editingUnit}
                          onChange={(e) => setEditingUnit(e.target.value)}
                        />
                        <input
                          type="number"
                          className="bg-[#0d2137] border border-[#1e3a5f] p-2 rounded-lg text-sm text-slate-200 w-24 outline-none"
                          placeholder="Stoc minim"
                          value={editingMinQty}
                          onChange={(e) => setEditingMinQty(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          className="bg-[#0d2137] border border-[#1e3a5f] p-2 rounded-lg text-sm text-slate-200 w-36 outline-none font-mono"
                          placeholder="Cod material"
                          value={editingCode}
                          onChange={(e) => setEditingCode(e.target.value)}
                        />
                        <label className="cursor-pointer flex items-center gap-1.5 bg-[#1e3a5f] text-slate-300 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#2a4a6f] transition">
                          {editingUploading ? "Se urcă..." : "📷 Schimbă poza"}
                          <input type="file" accept="image/*" className="hidden" disabled={editingUploading} onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setEditingUploading(true);
                            const url = await uploadMaterialPhoto(file);
                            if (url) setEditingPhotoUrl(url);
                            setEditingUploading(false);
                          }} />
                        </label>
                        {editingPhotoUrl && (
                          <img src={editingPhotoUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-[#1e3a5f]" />
                        )}
                        <button className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500" onClick={() => handleSaveEdit(mat.id)}>✓</button>
                        <button className="bg-[#1e3a5f] text-slate-300 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4a6f]" onClick={() => setEditingId(null)}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Thumbnail poză */}
                      {mat.photo_url ? (
                        <button
                          onClick={() => setLightboxUrl(mat.photo_url!)}
                          className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-[#1e3a5f] hover:border-blue-500/50 transition"
                          title="Mărește poza"
                        >
                          <img src={mat.photo_url} alt={mat.name} className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <div className="shrink-0 w-12 h-12 rounded-lg border border-[#1e3a5f] bg-[#0a1628] flex items-center justify-center text-slate-600 text-xs">
                          📦
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-200 text-sm">{mat.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${roleBadge(mat.role)}`}>
                            {mat.role === "montator" ? "🔩 Montator" : mat.role === "electrician" ? "⚡ Electrician" : "🏪 Hală"}
                          </span>
                        </div>
                        {mat.code && (
                          <div className="text-xs text-blue-400/70 font-mono mt-0.5">#{mat.code}</div>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-2xl font-bold text-white">{mat.quantity || 0}</span>
                          <span className="text-slate-500 text-sm">{mat.unit}</span>
                          {mat.min_quantity > 0 && (
                            <span className="text-xs text-slate-600">min: {mat.min_quantity} {mat.unit}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        <button
                          className="bg-green-500/20 border border-green-500/40 text-green-400 w-8 h-8 rounded-lg text-lg font-bold hover:bg-green-500/30 transition flex items-center justify-center"
                          title="Adaugă în stoc"
                          onClick={() => { setAdjustModal({ material: mat, mode: "add" }); setAdjustQty(""); setAdjustNote(""); }}
                        >+</button>
                        <button
                          className="bg-red-500/20 border border-red-500/40 text-red-400 w-8 h-8 rounded-lg text-lg font-bold hover:bg-red-500/30 transition flex items-center justify-center"
                          title="Scoate din stoc"
                          onClick={() => { setAdjustModal({ material: mat, mode: "remove" }); setAdjustQty(""); setAdjustNote(""); }}
                        >−</button>
                        <button
                          className="bg-purple-500/20 border border-purple-500/40 text-purple-400 px-2.5 h-8 rounded-lg text-xs font-semibold hover:bg-purple-500/30 transition"
                          title="Asignează rol"
                          onClick={() => setAssignModal({ material: mat })}
                        >↔️</button>
                        <button
                          className="bg-[#1e3a5f] text-slate-400 px-2.5 h-8 rounded-lg text-xs font-semibold hover:bg-[#2a4a6f] hover:text-slate-200 transition"
                          onClick={() => { setMovementsModal(mat); loadMovements(mat.id); }}
                        >📋</button>
                        <button
                          className="text-blue-400 hover:text-blue-300 w-8 h-8 flex items-center justify-center text-sm transition"
                          onClick={() => { setEditingId(mat.id); setEditingName(mat.name); setEditingUnit(mat.unit); setEditingMinQty(String(mat.min_quantity || "")); setEditingCode(mat.code || ""); setEditingPhotoUrl(mat.photo_url || null); }}
                        >✏️</button>
                        <button
                          className="text-red-400 hover:text-red-300 w-8 h-8 flex items-center justify-center text-sm transition"
                          onClick={() => handleDelete(mat.id)}
                        >✕</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Lightbox poză material */}
        {lightboxUrl && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
            <div className="relative z-[100000] max-w-[90vw] max-h-[90vh]">
              <img src={lightboxUrl} alt="Material" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
              <button
                className="absolute top-3 right-3 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg hover:bg-black/80 transition"
                onClick={() => setLightboxUrl(null)}
              >✕</button>
            </div>
          </div>
        )}

        {/* Modal ajustare stoc */}
        {adjustModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAdjustModal(null)} />
            <div className="relative bg-[#0d1b2a] border border-[#1e3a5f] rounded-2xl p-6 w-[90vw] max-w-sm z-[10000] shadow-2xl">
              <h3 className="font-bold text-white text-lg mb-1">
                {adjustModal.mode === "add" ? "➕ Intrare în stoc" : "➖ Ieșire din stoc"}
              </h3>
              <p className="text-sm text-slate-400 mb-4">{adjustModal.material.name}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-blue-400 font-bold uppercase tracking-widest block mb-1">Cantitate ({adjustModal.material.unit})</label>
                  <input
                    type="number"
                    min="0"
                    className="bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-3 rounded-xl text-sm text-slate-200 outline-none transition w-full"
                    placeholder="0"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-400 font-bold uppercase tracking-widest block mb-1">Notă (opțional)</label>
                  <input
                    className="bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-3 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition w-full"
                    placeholder="ex: Recepție factură #123"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 bg-[#1e3a5f] text-slate-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2a4a6f] transition" onClick={() => setAdjustModal(null)}>Anulează</button>
                  <button
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition ${adjustModal.mode === "add" ? "bg-green-600 hover:bg-green-500" : "bg-red-600 hover:bg-red-500"}`}
                    onClick={handleAdjust}
                  >
                    {adjustModal.mode === "add" ? "Adaugă" : "Scoate"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal asignare rol */}
        {assignModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAssignModal(null)} />
            <div className="relative bg-[#0d1b2a] border border-[#1e3a5f] rounded-2xl p-6 w-[90vw] max-w-sm z-[10000] shadow-2xl">
              <h3 className="font-bold text-white text-lg mb-1">↔️ Asignează rol</h3>
              <p className="text-sm text-slate-400 mb-4">{assignModal.material.name}</p>
              <p className="text-xs text-slate-500 mb-4">
                Rol curent: <span className={`font-semibold ${assignModal.material.role === "montator" ? "text-blue-400" : assignModal.material.role === "electrician" ? "text-yellow-400" : "text-purple-400"}`}>
                  {assignModal.material.role === "montator" ? "🔩 Montator" : assignModal.material.role === "electrician" ? "⚡ Electrician" : "🏪 Hală"}
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-blue-500/20 border border-blue-500/40 text-blue-400 py-3 rounded-xl text-sm font-semibold hover:bg-blue-500/30 transition"
                  onClick={() => handleAssign("montator")}
                >🔩 Montator</button>
                <button
                  className="flex-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 py-3 rounded-xl text-sm font-semibold hover:bg-yellow-500/30 transition"
                  onClick={() => handleAssign("electrician")}
                >⚡ Electrician</button>
                <button
                  className="flex-1 bg-purple-500/20 border border-purple-500/40 text-purple-400 py-3 rounded-xl text-sm font-semibold hover:bg-purple-500/30 transition"
                  onClick={() => handleAssign("hala")}
                >🏪 Hală</button>
              </div>
              <button className="w-full mt-2 bg-[#1e3a5f] text-slate-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2a4a6f] transition" onClick={() => setAssignModal(null)}>Anulează</button>
            </div>
          </div>
        )}

        {/* Modal adaugare material */}
        {addMaterialModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAddMaterialModal(null)} />
            <div className="relative bg-[#0d1b2a] border border-[#1e3a5f] rounded-2xl p-6 w-[90vw] max-w-sm z-[10000] shadow-2xl">
              <h3 className="font-bold text-white text-lg mb-1">
                {addMaterialModal.role === "montator" ? "🔩 Material Montator" : addMaterialModal.role === "electrician" ? "⚡ Material Electrician" : "🏪 Material Hală"}
              </h3>
              <p className="text-sm text-slate-400 mb-4">Adaugă material nou în stoc</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-blue-400 font-bold uppercase tracking-widest block mb-1">Nume material</label>
                  <input
                    className="bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-3 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition w-full"
                    placeholder="ex: Clemă 35mm"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddMaterial(); }}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-400 font-bold uppercase tracking-widest block mb-1">Cod material (opțional)</label>
                  <input
                    className="bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-3 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition w-full font-mono"
                    placeholder="ex: CLM-35-BLU"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-blue-400 font-bold uppercase tracking-widest block mb-1">Unitate măsură</label>
                    <input
                      className="bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-3 rounded-xl text-sm text-slate-200 outline-none transition w-full"
                      placeholder="buc"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-blue-400 font-bold uppercase tracking-widest block mb-1">Stoc minim</label>
                    <input
                      type="number"
                      className="bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-3 rounded-xl text-sm text-slate-200 outline-none transition w-full"
                      placeholder="0"
                      value={newMinQty}
                      onChange={(e) => setNewMinQty(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-blue-400 font-bold uppercase tracking-widest block mb-1">Poză material (opțional)</label>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer flex items-center gap-2 bg-[#0d2137] border border-[#1e3a5f] hover:border-blue-500 p-3 rounded-xl text-sm text-slate-400 hover:text-slate-200 outline-none transition flex-1">
                      {newPhotoUploading ? "⏳ Se urcă..." : newPhotoUrl ? "✅ Poza adăugată" : "📷 Alege poză"}
                      <input type="file" accept="image/*" className="hidden" disabled={newPhotoUploading} onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setNewPhotoUploading(true);
                        const url = await uploadMaterialPhoto(file);
                        if (url) setNewPhotoUrl(url);
                        setNewPhotoUploading(false);
                      }} />
                    </label>
                    {newPhotoUrl && (
                      <div className="relative">
                        <img src={newPhotoUrl} alt="preview" className="w-14 h-14 rounded-xl object-cover border border-[#1e3a5f]" />
                        <button className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center" onClick={() => setNewPhotoUrl(null)}>✕</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 bg-[#1e3a5f] text-slate-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2a4a6f] transition" onClick={() => { setAddMaterialModal(null); setNewCode(""); setNewPhotoUrl(null); }}>Anulează</button>
                  <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-sm font-semibold transition" onClick={handleAddMaterial}>Adaugă</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal istoric mișcări */}
        {movementsModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMovementsModal(null)} />
            <div className="relative bg-[#0d1b2a] border border-[#1e3a5f] rounded-2xl w-[95vw] max-w-lg max-h-[80vh] flex flex-col z-[10000] shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e3a5f]">
                <div>
                  <h3 className="font-bold text-white text-lg">📋 Istoric mișcări</h3>
                  <p className="text-sm text-slate-400">{movementsModal.name}</p>
                </div>
                <button className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#1e3a5f] transition" onClick={() => setMovementsModal(null)}>✕</button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {movementsLoading ? (
                  <p className="text-slate-500 text-sm text-center py-8">Se încarcă...</p>
                ) : movements.length === 0 ? (
                  <p className="text-slate-500 text-sm italic text-center py-8">Nicio mișcare înregistrată.</p>
                ) : (
                  movements.map((mv) => {
                    const isPositive = mv.quantity_change > 0;
                    return (
                      <div key={mv.id} className="flex items-start gap-3 p-3 bg-[#0a1628] rounded-xl border border-[#1e3a5f]">
                        <span className={`text-lg shrink-0 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                          {isPositive ? "➕" : "➖"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-bold text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                              {isPositive ? "+" : ""}{mv.quantity_change} {movementsModal.unit}
                            </span>
                            <span className="text-xs text-slate-500 shrink-0">
                              {new Date(mv.created_at).toLocaleDateString("ro-RO")} {new Date(mv.created_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {mv.type === "receptie" ? "📦 Recepție" : mv.type === "consum_proiect" ? "🔧 Consum proiect" : "⚙️ Ajustare"}
                            {mv.projects && ` — ${mv.projects.client} / ${mv.projects.title}`}
                          </p>
                          {mv.note && <p className="text-xs text-slate-500 mt-0.5 italic">{mv.note}</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </AuthGuard>
  );
}

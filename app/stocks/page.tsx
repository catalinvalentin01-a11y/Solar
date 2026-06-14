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
  role: "montator" | "electrician";
} | null;

type AssignModal = {
  material: Material;
} | null;

export default function StocksPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "montator" | "electrician">("all");

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

  // Adaugă material nou în lista globală
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
    });
    if (error) { alert(error.message); return; }
    setNewName(""); setNewUnit("buc"); setNewMinQty("");
    setAddMaterialModal(null);
    await loadMaterials();
  }

  // Ajustare stoc (+ sau -)
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

    setAdjustModal(null);
    setAdjustQty("");
    setAdjustNote("");
    await loadMaterials();
  }

  // Asignează material la montator sau electrician
  async function handleAssign(role: "montator" | "electrician") {
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
      .update({ name, unit: editingUnit, min_quantity: parseFloat(editingMinQty) || 0 })
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
          {(["all", "montator", "electrician"] as const).map((tab) => (
            <button
              key={tab}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "all" ? "🏭 Toate" : tab === "montator" ? "🔩 Montator" : "⚡ Electrician"}
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
                      <button className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-500" onClick={() => handleSaveEdit(mat.id)}>✓</button>
                      <button className="bg-[#1e3a5f] text-slate-300 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a4a6f]" onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-200 text-sm">{mat.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${roleBadge(mat.role)}`}>
                            {mat.role === "montator" ? "🔩 Montator" : "⚡ Electrician"}
                          </span>
                        </div>
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

                      {/* Actiuni */}
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
                          onClick={() => { setEditingId(mat.id); setEditingName(mat.name); setEditingUnit(mat.unit); setEditingMinQty(String(mat.min_quantity || "")); }}
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
                Rol curent: <span className={`font-semibold ${assignModal.material.role === "montator" ? "text-blue-400" : "text-yellow-400"}`}>
                  {assignModal.material.role === "montator" ? "🔩 Montator" : "⚡ Electrician"}
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
                {addMaterialModal.role === "montator" ? "🔩 Material Montator" : "⚡ Material Electrician"}
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
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 bg-[#1e3a5f] text-slate-300 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2a4a6f] transition" onClick={() => setAddMaterialModal(null)}>Anulează</button>
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

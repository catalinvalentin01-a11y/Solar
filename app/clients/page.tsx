"use client";

import AuthGuard from "@/components/AuthGuard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Client = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  cod_montaj?: string;
  data_montaj?: string;
  status_montaj: string;
  observatii?: string;
  status: string;
};

const emptyForm = {
  name: "", email: "", phone: "", address: "",
  codMontaj: "", dataMontaj: "", statusMontaj: "În așteptare",
  observatii: "", status: "Lead",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        const { data: access } = await supabase
          .from("user_access").select("is_admin").eq("email", data.user.email).single();
        setIsAdmin(access?.is_admin === true);
      }
      await loadClients();
    };
    init();
  }, []);

  async function loadClients() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function saveClient() {
    if (!form.name.trim()) return alert("Numele este obligatoriu!");
    const method = editingId ? "PUT" : "POST";
    const body = editingId ? { ...form, id: editingId } : form;
    const res = await fetch("/api/clients", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) { const err = await res.json(); alert("Eroare: " + err.error); return; }
    setForm(emptyForm); setEditingId(null); setShowForm(false); loadClients();
  }

  async function deleteClient(id: number) {
    if (!confirm("Sigur dorești să ștergi acest client?")) return;
    await fetch("/api/clients", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    loadClients();
  }

  function startEdit(client: Client) {
    setForm({
      name: client.name, email: client.email || "", phone: client.phone || "",
      address: client.address || "", codMontaj: client.cod_montaj || "",
      dataMontaj: client.data_montaj ? new Date(client.data_montaj).toISOString().split("T")[0] : "",
      statusMontaj: client.status_montaj, observatii: client.observatii || "", status: client.status,
    });
    setEditingId(client.id); setShowForm(true);
  }

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.cod_montaj?.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 p-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition w-full";
  const selectClass = "bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-2.5 rounded-xl text-sm text-slate-200 outline-none transition w-full";

  if (loading) return <div className="p-6 text-slate-400">Se încarcă...</div>;

  if (!isAdmin) return (
    <AuthGuard>
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Nu ai acces la această secțiune.</p>
      </div>
    </AuthGuard>
  );

  return (
    <AuthGuard>
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Clienți</h1>
            <p className="text-slate-400 text-sm mt-1">{clients.length} clienți înregistrați</p>
          </div>
          <button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            + Adaugă client
          </button>
        </div>

        {/* MODAL FORM */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0d1b2a] border border-[#1e3a5f] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-5">
                {editingId ? "Editează client" : "Client nou"}
              </h2>
              <div className="space-y-3">
                <input className={inputClass} placeholder="Nume și Prenume *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className={inputClass} placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className={inputClass} placeholder="Locație (oraș/adresă)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <input className={inputClass} placeholder="Cod montaj" value={form.codMontaj} onChange={(e) => setForm({ ...form, codMontaj: e.target.value })} />
                <div>
                  <label className="text-xs text-slate-500 mb-1 block uppercase tracking-widest">Data montajului</label>
                  <input type="date" className={inputClass} value={form.dataMontaj} onChange={(e) => setForm({ ...form, dataMontaj: e.target.value })} />
                </div>
                <select className={selectClass} value={form.statusMontaj} onChange={(e) => setForm({ ...form, statusMontaj: e.target.value })}>
                  <option value="În așteptare">În așteptare</option>
                  <option value="Efectuat">Efectuat</option>
                  <option value="Anulat">Anulat</option>
                </select>
                <select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="Lead">Lead</option>
                  <option value="Activ">Activ</option>
                  <option value="Inactiv">Inactiv</option>
                </select>
                <textarea className={`${inputClass} resize-none`} placeholder="Observații" rows={3} value={form.observatii} onChange={(e) => setForm({ ...form, observatii: e.target.value })} />
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={saveClient} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-semibold text-sm transition">
                  {editingId ? "Salvează" : "Adaugă"}
                </button>
                <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                  className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-slate-300 py-2.5 rounded-xl font-semibold text-sm transition">
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEARCH */}
        <input
          className="bg-[#0a1628] border border-[#1e3a5f] focus:border-blue-500 p-3 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition w-full mb-4"
          placeholder="Caută după nume, telefon, email, cod montaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border border-[#1e3a5f]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#0a1628] border-b border-[#1e3a5f]">
                <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Nume</th>
                <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Telefon</th>
                <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Locație</th>
                <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Cod montaj</th>
                <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Data montaj</th>
                <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status montaj</th>
                <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client, i) => (
                <tr key={client.id} className={`border-b border-[#1e3a5f] hover:bg-white/5 transition ${i % 2 === 0 ? "bg-[#0d1b2a]" : "bg-[#0a1628]"}`}>
                  <td className="p-3 font-semibold text-slate-200">{client.name}</td>
                  <td className="p-3 text-slate-300">{client.phone || "—"}</td>
                  <td className="p-3 text-slate-300">{client.address || "—"}</td>
                  <td className="p-3 text-slate-300">{client.cod_montaj || "—"}</td>
                  <td className="p-3 text-slate-300">
                    {client.data_montaj ? new Date(client.data_montaj).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      client.status_montaj === "Efectuat" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                      client.status_montaj === "Anulat" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    }`}>{client.status_montaj}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      client.status === "Activ" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                      client.status === "Lead" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                      "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                    }`}>{client.status}</span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => startEdit(client)} className="text-blue-400 hover:text-blue-300 text-xs font-semibold mr-3 transition">Editează</button>
                    <button onClick={() => deleteClient(client.id)} className="text-red-400 hover:text-red-300 text-xs font-semibold transition">Șterge</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 italic">Niciun client găsit.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AuthGuard>
  );
}

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
  name: "",
  email: "",
  phone: "",
  address: "",
  codMontaj: "",
  dataMontaj: "",
  statusMontaj: "În așteptare",
  observatii: "",
  status: "Lead",
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
          .from("user_access")
          .select("is_admin")
          .eq("email", data.user.email)
          .single();
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
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Eroare: " + err.error);
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    loadClients();
  }

  async function deleteClient(id: number) {
    if (!confirm("Sigur dorești să ștergi acest client?")) return;
    await fetch("/api/clients", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadClients();
  }

  function startEdit(client: Client) {
    setForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      codMontaj: client.cod_montaj || "",
      dataMontaj: client.data_montaj
        ? new Date(client.data_montaj).toISOString().split("T")[0]
        : "",
      statusMontaj: client.status_montaj,
      observatii: client.observatii || "",
      status: client.status,
    });
    setEditingId(client.id);
    setShowForm(true);
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.cod_montaj?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="p-6">Se încarcă...</div>;

  if (!isAdmin) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-400">Nu ai acces la această secțiune.</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Clienți</h1>
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Adaugă client
          </button>
        </div>

        {/* FORM MODAL */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-screen overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">
                {editingId ? "Editează client" : "Client nou"}
              </h2>

              <div className="space-y-3">
                <input
                  className="border p-2 w-full rounded-lg"
                  placeholder="Nume și Prenume *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="border p-2 w-full rounded-lg"
                  placeholder="Telefon"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  className="border p-2 w-full rounded-lg"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="border p-2 w-full rounded-lg"
                  placeholder="Locație (oraș/adresă)"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <input
                  className="border p-2 w-full rounded-lg"
                  placeholder="Cod montaj"
                  value={form.codMontaj}
                  onChange={(e) => setForm({ ...form, codMontaj: e.target.value })}
                />
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Data montajului
                  </label>
                  <input
                    type="date"
                    className="border p-2 w-full rounded-lg"
                    value={form.dataMontaj}
                    onChange={(e) => setForm({ ...form, dataMontaj: e.target.value })}
                  />
                </div>
                <select
                  className="border p-2 w-full rounded-lg"
                  value={form.statusMontaj}
                  onChange={(e) => setForm({ ...form, statusMontaj: e.target.value })}
                >
                  <option value="În așteptare">În așteptare</option>
                  <option value="Efectuat">Efectuat</option>
                  <option value="Anulat">Anulat</option>
                </select>
                <select
                  className="border p-2 w-full rounded-lg"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="Lead">Lead</option>
                  <option value="Activ">Activ</option>
                  <option value="Inactiv">Inactiv</option>
                </select>
                <textarea
                  className="border p-2 w-full rounded-lg"
                  placeholder="Observații"
                  rows={3}
                  value={form.observatii}
                  onChange={(e) => setForm({ ...form, observatii: e.target.value })}
                />
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={saveClient}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium"
                >
                  {editingId ? "Salvează" : "Adaugă"}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  className="flex-1 border py-2 rounded-lg text-gray-600"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEARCH */}
        <input
          className="border p-2 w-full mb-4 rounded-lg"
          placeholder="Caută după nume, telefon, email, cod montaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Nume</th>
                <th className="border p-2 text-left">Telefon</th>
                <th className="border p-2 text-left">Locație</th>
                <th className="border p-2 text-left">Cod montaj</th>
                <th className="border p-2 text-left">Data montaj</th>
                <th className="border p-2 text-left">Status montaj</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="border p-2 font-medium">{client.name}</td>
                  <td className="border p-2">{client.phone || "-"}</td>
                  <td className="border p-2">{client.address || "-"}</td>
                  <td className="border p-2">{client.cod_montaj || "-"}</td>
                  <td className="border p-2">
                    {client.data_montaj
                      ? new Date(client.data_montaj).toLocaleDateString("ro-RO")
                      : "-"}
                  </td>
                  <td className="border p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        client.status_montaj === "Efectuat"
                          ? "bg-green-100 text-green-800"
                          : client.status_montaj === "Anulat"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {client.status_montaj}
                    </span>
                  </td>
                  <td className="border p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        client.status === "Activ"
                          ? "bg-green-100 text-green-800"
                          : client.status === "Lead"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => startEdit(client)}
                      className="text-blue-600 mr-3 text-xs"
                    >
                      Editează
                    </button>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="text-red-600 text-xs"
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="border p-4 text-center text-gray-400"
                  >
                    Niciun client găsit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AuthGuard>
  );
}
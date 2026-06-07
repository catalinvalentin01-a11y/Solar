"use client";

import AuthGuard from "@/components/AuthGuard";
import { useEffect, useState } from "react";

type Client = {
  id: number;
  name: string;
  email: string;
  status: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState("Lead");
  const [search, setSearch] = useState("");

  async function loadClients() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function addClient() {
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        status,
      }),
    });

    setName("");
    setEmail("");
    setStatus("Lead");
    loadClients();
  }

  async function updateClient() {
    if (!editingId) return;

    await fetch("/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        name,
        email,
        status,
      }),
    });

    setEditingId(null);
    setName("");
    setEmail("");
    setStatus("Lead");
    loadClients();
  }

 async function deleteClient(id: number) {
  const confirmDelete = confirm(
    "Sigur dorești să ștergi acest client?"
  );

  if (!confirmDelete) {
    return;
  }

  await fetch("/api/clients", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });

  loadClients();
}

  if (loading) return <div className="p-6">Se încarcă...</div>;

  return (
    <AuthGuard>
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Clienți</h1>

      {/* FORM */}
      <div className="space-y-2 mb-6">
        <input
          className="border p-2 w-full"
          placeholder="Nume"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="border p-2 w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
      
        />

        <select
  className="border p-2 w-full"
  value={status}
  onChange={(e) => setStatus(e.target.value)}
>
  <option value="Lead">Lead</option>
  <option value="Activ">Activ</option>
  <option value="Inactiv">Inactiv</option>
</select>

        <button
          onClick={editingId ? updateClient : addClient}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {editingId ? "Salvează" : "Adaugă client"}
        </button>
      </div>

      <input
  className="border p-2 w-full mb-4"
  placeholder="Caută după nume sau email..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>
      {/* LIST */}
<table className="w-full border-collapse border">
  <thead>
    <tr className="bg-gray-100">
      <th className="border p-2 text-left">Nume</th>
      <th className="border p-2 text-left">Email</th>
      <th className="border p-2 text-left">Status</th>
      <th className="border p-2 text-left">Acțiuni</th>
    </tr>
  </thead>

 <tbody>
  {clients
    .filter(
      (client) =>
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase())
    )
    .map((client) => (
      <tr key={client.id}>
        <td className="border p-2">{client.name}</td>
        <td className="border p-2">{client.email}</td>

        <td className="border p-2">
          <span
            className={`px-2 py-1 rounded text-sm ${
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
            onClick={() => {
              setEditingId(client.id);
              setName(client.name);
              setEmail(client.email);
              setStatus(client.status);
            }}
            className="text-blue-600 mr-4"
          >
            Editează
          </button>

          <button
            onClick={() => deleteClient(client.id)}
            className="text-red-600"
          >
            Șterge
          </button>
        </td>
      </tr>
    ))}
</tbody>
</table>
    </div>
    </AuthGuard>  
  );
}

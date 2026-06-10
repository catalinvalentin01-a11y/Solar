"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const SUPER_ADMIN = "catalinvalentin01@gmail.com";

type UserRequest = {
  id: string;
  email: string;
  status: string;
  is_admin: boolean;
  created_at: string;
};

export default function AdminPage() {
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.replace("/"); return; }

      const { data: access } = await supabase
        .from("user_access")
        .select("is_admin")
        .eq("email", data.user.email)
        .single();

      if (!access?.is_admin) { router.replace("/"); return; }

      setIsSuperAdmin(data.user.email === SUPER_ADMIN);
      await loadRequests();
    };
    init();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_access")
      .select("*")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase
      .from("user_access")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    await loadRequests();
  };

  const toggleAdmin = async (id: string, currentValue: boolean, email: string) => {
    if (email === SUPER_ADMIN) return;
    await supabase
      .from("user_access")
      .update({ is_admin: !currentValue })
      .eq("id", id);
    await loadRequests();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500" style={{ fontFamily: "inherit" }}>
        Se încarcă...
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const rejected = requests.filter((r) => r.status === "rejected");
  const admins = requests.filter((r) => r.is_admin);

  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col gap-8" style={{ fontFamily: "inherit" }}>
      <h1 className="text-2xl font-bold text-gray-900">⚙️ Panou administrator</h1>

      {/* CERERI ÎN AȘTEPTARE */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-gray-900">
          Cereri în așteptare ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-gray-400 text-sm">Nicio cerere în așteptare.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded-xl p-4">
                <div>
                  <p className="font-medium text-gray-900">{r.email}</p>
                  <p className="text-sm text-gray-400">
                    {new Date(r.created_at).toLocaleDateString("ro-RO")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(r.id, "approved")}
                    className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
                  >
                    Aprobă
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, "rejected")}
                    className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
                  >
                    Respinge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ADMINI — doar super-adminul vede și poate modifica */}
      {isSuperAdmin && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-900">
            Administratori ({admins.length})
          </h2>
          <div className="flex flex-col gap-3">
            {admins.map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-yellow-300 bg-yellow-50 rounded-xl p-4">
                <div>
                  <p className="font-medium text-gray-900">{r.email}</p>
                  {r.email === SUPER_ADMIN && (
                    <p className="text-xs text-yellow-600">Super admin</p>
                  )}
                </div>
                {r.email !== SUPER_ADMIN && (
                  <button
                    onClick={() => toggleAdmin(r.id, r.is_admin, r.email)}
                    className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                  >
                    Șterge admin
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Promovează un user la admin */}
          <h3 className="text-md font-semibold mt-5 mb-3 text-gray-900">Adaugă admin din utilizatori aprobați</h3>
          <div className="flex flex-col gap-3">
            {approved
              .filter((r) => !r.is_admin)
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between border rounded-xl p-4">
                  <p className="font-medium text-gray-900">{r.email}</p>
                  <button
                    onClick={() => toggleAdmin(r.id, r.is_admin, r.email)}
                    className="bg-yellow-500 text-gray-900 px-3 py-1.5 rounded-lg text-sm font-semibold"
                  >
                    Fă admin
                  </button>
                </div>
              ))}
            {approved.filter((r) => !r.is_admin).length === 0 && (
              <p className="text-gray-400 text-sm">Niciun utilizator aprobat fără rol de admin.</p>
            )}
          </div>
        </section>
      )}

      {/* TOȚI UTILIZATORII */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-gray-900">
          Utilizatori aprobați ({approved.length})
        </h2>
        <div className="flex flex-col gap-3">
          {approved.map((r) => (
            <div key={r.id} className="flex items-center justify-between border rounded-xl p-4">
              <div>
                <p className="font-medium text-gray-900">{r.email}</p>
                {r.is_admin && <p className="text-xs text-yellow-600">Admin</p>}
              </div>
              <button
                onClick={() => updateStatus(r.id, "rejected")}
                className="text-xs text-red-400 underline"
              >
                Revocă acces
              </button>
            </div>
          ))}
          {approved.length === 0 && (
            <p className="text-gray-400 text-sm">Niciun utilizator aprobat.</p>
          )}
        </div>
      </section>

      {/* RESPINSI */}
      {rejected.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-gray-900">
            Respinși ({rejected.length})
          </h2>
          <div className="flex flex-col gap-3">
            {rejected.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded-xl p-4">
                <p className="font-medium text-gray-400">{r.email}</p>
                <button
                  onClick={() => updateStatus(r.id, "approved")}
                  className="text-xs text-green-500 underline"
                >
                  Aprobă
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

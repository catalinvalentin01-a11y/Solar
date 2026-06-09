"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import roLocale from "@fullcalendar/core/locales/ro";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";
import ImageLightbox from "@/components/ImageLightbox";

const ADMIN_EMAIL = "catalinvalentin01@gmail.com";

type Project = {
  id?: string;
  client: string;
  phone: string;
  email: string;
  title: string;
  location: string;
  kw: string;
  battery: string;
  panels: string;
  inverter: string;
  notes: string;
  status: string;
  roof_images: string[];
  simulation_images: string[];
  date?: string;
};

type Material = {
  id: string;
  name: string;
  unit: string;
};

type ProjectMaterial = {
  id?: string;
  project_id: string;
  material_id: string;
  quantity: string;
  saved: boolean;
};

export default function ProjectsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openLightbox, setOpenLightbox] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [showClient, setShowClient] = useState(true);
  const [showTechnical, setShowTechnical] = useState(true);
  const [showRoof, setShowRoof] = useState(true);
  const [showSimulation, setShowSimulation] = useState(true);
  const [showMaterials, setShowMaterials] = useState(true);

  // Materiale
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [materialsSaved, setMaterialsSaved] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialUnit, setNewMaterialUnit] = useState("buc");
  const [autoSaving, setAutoSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Editare material în lista globală
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialName, setEditingMaterialName] = useState("");
  const [editingMaterialUnit, setEditingMaterialUnit] = useState("");

  const [form, setForm] = useState<Project>({
    client: "",
    phone: "",
    email: "",
    title: "",
    location: "",
    kw: "",
    battery: "",
    panels: "",
    inverter: "",
    notes: "",
    status: "Programat",
    roof_images: [],
    simulation_images: [],
  });

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      setIsAdmin(email === ADMIN_EMAIL);
    };
    check();
  }, []);

  async function loadProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const calendarEvents = (data || []).map((project) => ({
      id: project.id,
      title: `${project.client} - ${project.title}`,
      start: project.date,
      allDay: true,
      extendedProps: project,
    }));

    setEvents([...calendarEvents]);
  }

  async function loadMaterials() {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setMaterials(data || []);
  }

  async function loadProjectMaterials(projectId: string) {
    const { data, error } = await supabase
      .from("project_materials")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      console.error(error);
      return;
    }

    const rows = data || [];
    setProjectMaterials(rows);

    const q: Record<string, string> = {};
    rows.forEach((row) => {
      q[row.material_id] = row.quantity || "";
    });
    setQuantities(q);

    // FIX: salvat dacă ORICE rând are saved=true
    const anySaved = rows.some((r) => r.saved === true);
    setMaterialsSaved(anySaved);
  }

  useEffect(() => {
    loadProjects();
    loadMaterials();
  }, []);

  const resetForm = () => {
    setForm({
      client: "",
      phone: "",
      email: "",
      title: "",
      location: "",
      kw: "",
      battery: "",
      panels: "",
      inverter: "",
      notes: "",
      status: "Programat",
      roof_images: [],
      simulation_images: [],
    });
    setSelectedProject(null);
    setSelectedDate(null);
    setProjectMaterials([]);
    setQuantities({});
    setMaterialsSaved(false);
    setOpen(false);
    setEditingMaterialId(null);
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("projects")
      .insert({ ...form, date: selectedDate })
      .select();

    if (error) {
      alert(error.message);
      return;
    }

    resetForm();
    await loadProjects();
  };

  const handleUpdate = async () => {
    if (!selectedProject?.id) return;

    const { error } = await supabase
      .from("projects")
      .update({
        client: form.client,
        phone: form.phone,
        email: form.email,
        title: form.title,
        location: form.location,
        kw: form.kw,
        battery: form.battery,
        panels: form.panels,
        inverter: form.inverter,
        notes: form.notes,
        status: form.status,
        roof_images: form.roof_images,
        simulation_images: form.simulation_images,
      })
      .eq("id", selectedProject.id);

    if (error) {
      console.error(error);
      return;
    }

    await loadProjects();
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedProject?.id) return;

    const ok = confirm("Sigur dorești ștergerea proiectului?");
    if (!ok) return;

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", selectedProject.id);

    if (error) {
      console.error(error);
      return;
    }

    await loadProjects();
    resetForm();
  };

  // ── MATERIALE ──────────────────────────────────────────────

  const handleAddMaterial = async () => {
    const name = newMaterialName.trim();
    if (!name) return;

    const { error } = await supabase
      .from("materials")
      .insert({ name, unit: newMaterialUnit });

    if (error) {
      alert(error.message);
      return;
    }

    setNewMaterialName("");
    setNewMaterialUnit("buc");
    await loadMaterials();
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const ok = confirm("Ștergi materialul din listă?");
    if (!ok) return;

    const { error } = await supabase
      .from("materials")
      .delete()
      .eq("id", materialId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadMaterials();
  };

  const handleStartEditMaterial = (mat: Material) => {
    setEditingMaterialId(mat.id);
    setEditingMaterialName(mat.name);
    setEditingMaterialUnit(mat.unit);
  };

  const handleCancelEditMaterial = () => {
    setEditingMaterialId(null);
    setEditingMaterialName("");
    setEditingMaterialUnit("");
  };

  const handleSaveEditMaterial = async (materialId: string) => {
    const name = editingMaterialName.trim();
    if (!name) return;

    const { error } = await supabase
      .from("materials")
      .update({ name, unit: editingMaterialUnit })
      .eq("id", materialId);

    if (error) {
      alert(error.message);
      return;
    }

    setEditingMaterialId(null);
    await loadMaterials();
  };

  // Auto-save la fiecare modificare de cantitate (debounce 1s)
  const autoSaveQuantity = useCallback(
    async (materialId: string, value: string, currentProjectMaterials: ProjectMaterial[]) => {
      if (!selectedProject?.id) return;
      setAutoSaving(true);

      const existing = currentProjectMaterials.find((pm) => pm.material_id === materialId);

      if (existing?.id) {
        await supabase
          .from("project_materials")
          .update({ quantity: value, saved: false })
          .eq("id", existing.id);
      } else {
        const { data } = await supabase
          .from("project_materials")
          .insert({
            project_id: selectedProject.id,
            material_id: materialId,
            quantity: value,
            saved: false,
          })
          .select()
          .single();

        if (data) {
          setProjectMaterials((prev) => [...prev, data]);
        }
      }

      setAutoSaving(false);
    },
    [selectedProject]
  );

  // FIX: Nu mai apelăm loadProjectMaterials după save — setăm direct state-ul
  const handleSaveMaterials = async () => {
    if (!selectedProject?.id) return;

    for (const material of materials) {
      const qty = quantities[material.id] || "";
      const existing = projectMaterials.find((pm) => pm.material_id === material.id);

      if (existing?.id) {
        await supabase
          .from("project_materials")
          .update({ quantity: qty, saved: true, saved_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("project_materials").insert({
          project_id: selectedProject.id,
          material_id: material.id,
          quantity: qty,
          saved: true,
          saved_at: new Date().toISOString(),
        });
      }
    }

    // FIX: Setăm direct saved=true fără a re-incarca din DB (care ar putea reseta starea)
    setMaterialsSaved(true);
    setProjectMaterials((prev) =>
      prev.map((pm) => ({ ...pm, saved: true }))
    );
  };

  const handleUnlockMaterials = async () => {
    if (!selectedProject?.id) return;

    await supabase
      .from("project_materials")
      .update({ saved: false, saved_at: null })
      .eq("project_id", selectedProject.id);

    setMaterialsSaved(false);
    setProjectMaterials((prev) =>
      prev.map((pm) => ({ ...pm, saved: false }))
    );
  };

  // ── IMAGINI ────────────────────────────────────────────────

  const deleteImage = async (imgToDelete: string, type: "roof" | "simulation") => {
    setForm((prev) => {
      const newForm = {
        ...prev,
        roof_images:
          type === "roof"
            ? prev.roof_images.filter((img) => img !== imgToDelete)
            : prev.roof_images,
        simulation_images:
          type === "simulation"
            ? prev.simulation_images.filter((img) => img !== imgToDelete)
            : prev.simulation_images,
      };

      if (selectedProject?.id) {
        supabase
          .from("projects")
          .update({
            roof_images: newForm.roof_images,
            simulation_images: newForm.simulation_images,
          })
          .eq("id", selectedProject.id);
      }

      return newForm;
    });

    setLightboxImages((prev) => {
      const filtered = prev.filter((img) => img !== imgToDelete);
      if (filtered.length === 0) {
        setOpenLightbox(false);
        return [];
      }
      return filtered;
    });
  };

  const uploadImage = async (file: File, target: "roof" | "simulation") => {
    const fileName = Date.now() + "-" + file.name;

    const { error } = await supabase.storage
      .from("project-images")
      .upload(fileName, file);

    if (error) {
      console.error(error);
      return;
    }

    const { data } = supabase.storage
      .from("project-images")
      .getPublicUrl(fileName);

    const url = data.publicUrl;

    if (target === "roof") {
      setForm((prev) => ({
        ...prev,
        roof_images: [...prev.roof_images, url],
      }));
    }

    if (target === "simulation") {
      setForm((prev) => ({
        ...prev,
        simulation_images: [...prev.simulation_images, url],
      }));
    }
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleMaps = (location: string) => {
    if (!location) return;
    const query = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <AuthGuard>
      <div className="p-2 md:p-6">

        <style>{`
          .fc {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            font-size: 14px;
          }
          .fc table { border-collapse: collapse; }
          .fc td, .fc th { border-width: 1px !important; }
          .fc .fc-scrollgrid {
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          .fc .fc-daygrid-day-number {
            font-size: 14px !important;
            font-weight: 600 !important;
            color: #111827 !important;
            padding: 4px 6px !important;
          }
          .fc .fc-col-header-cell-cushion {
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #111827 !important;
            padding: 6px 4px !important;
          }
          .fc .fc-toolbar-title {
            font-size: 16px !important;
            font-weight: 700 !important;
            color: #111827 !important;
          }
          .fc .fc-button {
            font-size: 13px !important;
            font-weight: 600 !important;
            padding: 5px 10px !important;
          }
          .fc .fc-event-title {
            font-size: 12px !important;
            font-weight: 600 !important;
          }
          .fc .fc-day-today { background-color: #eff6ff !important; }
          .fc .fc-day-today .fc-daygrid-day-number { color: #1d4ed8 !important; }
          @media (max-width: 640px) {
            .fc .fc-toolbar-title { font-size: 15px !important; }
            .fc .fc-toolbar { gap: 6px !important; }
            .fc .fc-daygrid-day-number { font-size: 13px !important; }
            .fc .fc-col-header-cell-cushion { font-size: 11px !important; }
            .fc .fc-event-title { font-size: 11px !important; }
          }
        `}</style>

        <div className="overflow-x-auto">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="auto"
            locale={roLocale}
            events={events}
            dateClick={(info) => {
              if (!isAdmin) return;
              setSelectedProject(null);
              setSelectedDate(info.dateStr);
              setProjectMaterials([]);
              setQuantities({});
              setMaterialsSaved(false);
              setOpen(true);
            }}
            eventClick={(info) => {
              const p = info.event.extendedProps as Project;
              setSelectedProject({ ...p, id: info.event.id });
              setSelectedDate(p.date || null);
              setForm({
                client: p.client || "",
                phone: p.phone || "",
                email: p.email || "",
                title: p.title || "",
                location: p.location || "",
                kw: p.kw || "",
                battery: p.battery || "",
                panels: p.panels || "",
                inverter: p.inverter || "",
                notes: p.notes || "",
                status: p.status || "Programat",
                roof_images: p.roof_images || [],
                simulation_images: p.simulation_images || [],
              });
              loadProjectMaterials(info.event.id);
              setOpen(true);
            }}
          />
        </div>

        {open && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setOpen(false)}
            />

            <div className="relative bg-white rounded-lg p-4 w-[95vw] md:w-[900px] max-h-[90vh] overflow-y-auto z-[10000]">

              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-xl text-gray-900">
                  {selectedProject ? "Detalii proiect" : "Proiect nou"}
                </h2>
                <span className="text-sm font-semibold text-gray-600">{selectedDate}</span>
              </div>

              {selectedProject && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {form.phone && (
                    <button
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition text-sm"
                      onClick={() => handleCall(form.phone)}
                    >
                      📞 Sună — {form.phone}
                    </button>
                  )}
                  {form.location && (
                    <button
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm"
                      onClick={() => handleMaps(form.location)}
                    >
                      📍 GPS — {form.location}
                    </button>
                  )}
                </div>
              )}

              {/* Date Client */}
              <button
                className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded text-base"
                onClick={() => setShowClient(!showClient)}
              >
                📋 Date Client {showClient ? "▲" : "▼"}
              </button>

              {showClient && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 mt-1">
                  {isAdmin ? (
                    <>
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Locație" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</p><p className="font-semibold text-gray-900 text-base mt-1">{form.client || "—"}</p></div>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefon</p><p className="font-semibold text-gray-900 text-base mt-1">{form.phone || "—"}</p></div>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p><p className="font-semibold text-gray-900 text-base mt-1">{form.email || "—"}</p></div>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Locație</p><p className="font-semibold text-gray-900 text-base mt-1">{form.location || "—"}</p></div>
                    </>
                  )}
                </div>
              )}

              {/* Date Tehnice */}
              <button
                className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base"
                onClick={() => setShowTechnical(!showTechnical)}
              >
                ⚡ Date Tehnice {showTechnical ? "▲" : "▼"}
              </button>

              {showTechnical && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 mt-1">
                  {isAdmin ? (
                    <>
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Titlu proiect" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="kW" value={form.kw} onChange={(e) => setForm({ ...form, kw: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Panouri" value={form.panels} onChange={(e) => setForm({ ...form, panels: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Invertor" value={form.inverter} onChange={(e) => setForm({ ...form, inverter: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Baterie" value={form.battery} onChange={(e) => setForm({ ...form, battery: e.target.value })} />
                      <select className="border border-gray-300 p-3 rounded text-base text-gray-900" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option>Programat</option>
                        <option>În lucru</option>
                        <option>Finalizat</option>
                      </select>
                      <textarea className="border border-gray-300 p-3 rounded col-span-1 sm:col-span-2 text-base text-gray-900 placeholder-gray-500" placeholder="Observații" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Titlu proiect</p><p className="font-semibold text-gray-900 text-base mt-1">{form.title || "—"}</p></div>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">kW</p><p className="font-semibold text-gray-900 text-base mt-1">{form.kw || "—"}</p></div>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Panouri</p><p className="font-semibold text-gray-900 text-base mt-1">{form.panels || "—"}</p></div>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invertor</p><p className="font-semibold text-gray-900 text-base mt-1">{form.inverter || "—"}</p></div>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Baterie</p><p className="font-semibold text-gray-900 text-base mt-1">{form.battery || "—"}</p></div>
                      <div className="p-2 bg-gray-50 rounded"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p><p className="font-semibold text-gray-900 text-base mt-1">{form.status || "—"}</p></div>
                      <div className="p-2 bg-gray-50 rounded col-span-1 sm:col-span-2"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Observații</p><p className="font-semibold text-gray-900 text-base mt-1 whitespace-pre-wrap">{form.notes || "—"}</p></div>
                    </>
                  )}
                </div>
              )}

              {/* Poze Acoperis */}
              <button
                className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base"
                onClick={() => setShowRoof(!showRoof)}
              >
                🏠 Poze Acoperiș {showRoof ? "▲" : "▼"}
              </button>

              {showRoof && (
                <div className="p-2 mt-1">
                  {isAdmin && (
                    <input type="file" accept="image/*" className="mb-3 text-sm text-gray-700"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await uploadImage(file, "roof");
                      }}
                    />
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {form.roof_images.map((img, i) => (
                      <img key={img} src={img} alt="" onClick={() => { setLightboxImages(form.roof_images || []); setActiveIndex(i); setOpenLightbox(true); }} className="rounded border h-28 w-full object-cover cursor-pointer" />
                    ))}
                  </div>
                </div>
              )}

              {/* Simulare */}
              <button
                className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base"
                onClick={() => setShowSimulation(!showSimulation)}
              >
                ☀️ Simulare Panouri {showSimulation ? "▲" : "▼"}
              </button>

              {showSimulation && (
                <div className="p-2 mt-1">
                  {isAdmin && (
                    <input type="file" accept="image/*" className="mb-3 text-sm text-gray-700"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await uploadImage(file, "simulation");
                      }}
                    />
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {form.simulation_images.map((img, i) => (
                      <img key={img} src={img} alt="" onClick={() => { setLightboxImages(form.simulation_images || []); setActiveIndex(i); setOpenLightbox(true); }} className="rounded border h-28 w-full object-cover cursor-pointer" />
                    ))}
                  </div>
                </div>
              )}

              {/* ── MATERIALE FOLOSITE ── */}
              {selectedProject && (
                <>
                  <button
                    className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base"
                    onClick={() => setShowMaterials(!showMaterials)}
                  >
                    🔧 Materiale folosite {showMaterials ? "▲" : "▼"}
                  </button>

                  {showMaterials && (
                    <div className="p-2 mt-1">

                      {/* Admin: adaugă material nou în listă */}
                      {isAdmin && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          <input
                            className="border border-gray-300 p-2 rounded text-sm text-gray-900 placeholder-gray-500 flex-1 min-w-[150px]"
                            placeholder="Nume material (ex: Clemă capăt)"
                            value={newMaterialName}
                            onChange={(e) => setNewMaterialName(e.target.value)}
                          />
                          <input
                            className="border border-gray-300 p-2 rounded text-sm text-gray-900 w-24"
                            placeholder="U.M. (buc)"
                            value={newMaterialUnit}
                            onChange={(e) => setNewMaterialUnit(e.target.value)}
                          />
                          <button
                            className="bg-green-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-green-700 transition"
                            onClick={handleAddMaterial}
                          >
                            + Adaugă
                          </button>
                        </div>
                      )}

                      {/* Lista materiale */}
                      {materials.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          {isAdmin
                            ? "Nu există materiale definite. Adaugă primul material mai sus."
                            : "Nu există materiale definite de admin."}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {materials.map((mat) => (
                            <div
                              key={mat.id}
                              className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                            >
                              {/* Mod editare */}
                              {isAdmin && editingMaterialId === mat.id ? (
                                <>
                                  <input
                                    className="border border-blue-400 p-1 rounded text-sm text-gray-900 flex-1 min-w-0"
                                    value={editingMaterialName}
                                    onChange={(e) => setEditingMaterialName(e.target.value)}
                                    autoFocus
                                  />
                                  <input
                                    className="border border-blue-400 p-1 rounded text-sm text-gray-900 w-16"
                                    value={editingMaterialUnit}
                                    onChange={(e) => setEditingMaterialUnit(e.target.value)}
                                  />
                                  <button
                                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-700 transition whitespace-nowrap"
                                    onClick={() => handleSaveEditMaterial(mat.id)}
                                  >
                                    ✓ Salvează
                                  </button>
                                  <button
                                    className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-semibold hover:bg-gray-400 transition"
                                    onClick={handleCancelEditMaterial}
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="flex-1 text-sm font-medium text-gray-800 min-w-0">
                                    {mat.name}
                                    <span className="text-gray-400 ml-1 text-xs">({mat.unit})</span>
                                  </span>

                                  <input
                                    type="number"
                                    min="0"
                                    className={`border border-gray-300 p-2 rounded text-sm text-gray-900 w-24 text-center shrink-0
                                      ${materialsSaved && !isAdmin ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"}`}
                                    placeholder="0"
                                    value={quantities[mat.id] || ""}
                                    disabled={materialsSaved && !isAdmin}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuantities((prev) => ({ ...prev, [mat.id]: val }));

                                      // Debounce auto-save
                                      if (debounceRef.current) clearTimeout(debounceRef.current);
                                      debounceRef.current = setTimeout(() => {
                                        autoSaveQuantity(mat.id, val, projectMaterials);
                                      }, 1000);
                                    }}
                                  />

                                  <span className="text-xs text-gray-400 w-8 shrink-0">{mat.unit}</span>

                                  {/* Admin: editează / șterge material din lista globală */}
                                  {isAdmin && (
                                    <>
                                      <button
                                        className="text-blue-500 hover:text-blue-700 text-sm font-bold px-1 shrink-0"
                                        onClick={() => handleStartEditMaterial(mat)}
                                        title="Editează material"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        className="text-red-500 hover:text-red-700 text-sm font-bold px-1 shrink-0"
                                        onClick={() => handleDeleteMaterial(mat.id)}
                                        title="Șterge material"
                                      >
                                        ✕
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Indicator auto-save */}
                      {autoSaving && (
                        <p className="text-xs text-gray-400 italic mt-2">⏳ Se salvează automat...</p>
                      )}

                      {/* Butoane Salvează / Deblochează */}
                      {materials.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 items-center">
                          {/* FIX: Butonul de salvare apare și pentru non-admin când nu e salvat */}
                          {!materialsSaved && (
                            <button
                              className="bg-blue-600 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-blue-700 transition"
                              onClick={handleSaveMaterials}
                            >
                              💾 Salvează materiale
                            </button>
                          )}

                          {materialsSaved && (
                            <span className="text-sm text-green-700 font-semibold flex items-center gap-1">
                              ✅ Materiale salvate
                            </span>
                          )}

                          {materialsSaved && isAdmin && (
                            <button
                              className="bg-orange-500 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-orange-600 transition"
                              onClick={handleUnlockMaterials}
                            >
                              🔓 Deblochează pentru modificare
                            </button>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </>
              )}

              {/* Butoane jos */}
              <div className="flex flex-wrap gap-2 mt-6">
                <button
                  className="bg-gray-300 text-gray-800 font-semibold px-4 py-3 rounded text-base"
                  onClick={resetForm}
                >
                  Închide
                </button>

                {isAdmin && !selectedProject && (
                  <button
                    className="bg-blue-600 text-white font-semibold px-4 py-3 rounded text-base"
                    onClick={handleSave}
                  >
                    Salvează
                  </button>
                )}

                {isAdmin && selectedProject && (
                  <>
                    <button
                      className="bg-blue-600 text-white font-semibold px-4 py-3 rounded text-base"
                      onClick={handleUpdate}
                    >
                      Actualizează
                    </button>
                    <button
                      className="bg-red-600 text-white font-semibold px-4 py-3 rounded text-base"
                      onClick={handleDelete}
                    >
                      Șterge
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        )}

        {openLightbox && (
          <ImageLightbox
            images={lightboxImages}
            initialIndex={activeIndex}
            onClose={() => setOpenLightbox(false)}
            onDelete={
              isAdmin
                ? (img) => {
                    deleteImage(
                      img,
                      form.roof_images.includes(img) ? "roof" : "simulation"
                    );
                  }
                : undefined
            }
          />
        )}

      </div>
    </AuthGuard>
  );
}

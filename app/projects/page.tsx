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

type MontajCategory = {
  id: string;
  name: string;
};

type MontajImage = {
  id: string;
  project_id: string;
  category_id: string;
  url: string;
  saved: boolean;
};

export default function ProjectsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [openLightbox, setOpenLightbox] = useState(false);
  const [lightboxCanDelete, setLightboxCanDelete] = useState(false);
  const [lightboxCategoryId, setLightboxCategoryId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [showClient, setShowClient] = useState(true);
  const [showTechnical, setShowTechnical] = useState(true);
  const [showRoof, setShowRoof] = useState(true);
  const [showSimulation, setShowSimulation] = useState(true);
  const [showMaterials, setShowMaterials] = useState(true);
  const [showMontaj, setShowMontaj] = useState(true);

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

  // Poze Montaj
  const [montajCategories, setMontajCategories] = useState<MontajCategory[]>([]);
  const [montajImages, setMontajImages] = useState<MontajImage[]>([]);
  const [montajSaved, setMontajSaved] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  // stare colaps per categorie
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

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

    if (error) { console.error(error); return; }

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

    if (error) { console.error(error); return; }
    setMaterials(data || []);
  }

  async function loadProjectMaterials(projectId: string) {
    const { data, error } = await supabase
      .from("project_materials")
      .select("*")
      .eq("project_id", projectId);

    if (error) { console.error(error); return; }

    const rows = data || [];
    setProjectMaterials(rows);

    const q: Record<string, string> = {};
    rows.forEach((row) => { q[row.material_id] = row.quantity || ""; });
    setQuantities(q);

    const anySaved = rows.some((r) => r.saved === true);
    setMaterialsSaved(anySaved);
  }

  async function loadMontajCategories() {
    const { data, error } = await supabase
      .from("montaj_categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) { console.error(error); return; }
    setMontajCategories(data || []);
  }

  async function loadMontajImages(projectId: string) {
    const { data, error } = await supabase
      .from("montaj_images")
      .select("*")
      .eq("project_id", projectId);

    if (error) { console.error(error); return; }

    const rows = data || [];
    setMontajImages(rows);

    const anySaved = rows.some((r) => r.saved === true);
    setMontajSaved(anySaved);
  }

  useEffect(() => {
    loadProjects();
    loadMaterials();
    loadMontajCategories();
  }, []);

  const resetForm = () => {
    setForm({
      client: "", phone: "", email: "", title: "", location: "",
      kw: "", battery: "", panels: "", inverter: "", notes: "",
      status: "Programat", roof_images: [], simulation_images: [],
    });
    setSelectedProject(null);
    setSelectedDate(null);
    setProjectMaterials([]);
    setQuantities({});
    setMaterialsSaved(false);
    setMontajImages([]);
    setMontajSaved(false);
    setOpen(false);
    setEditingMaterialId(null);
    setCollapsedCategories({});
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("projects")
      .insert({ ...form, date: selectedDate })
      .select();

    if (error) { alert(error.message); return; }
    resetForm();
    await loadProjects();
  };

  const handleUpdate = async () => {
    if (!selectedProject?.id) return;

    const { error } = await supabase
      .from("projects")
      .update({
        client: form.client, phone: form.phone, email: form.email,
        title: form.title, location: form.location, kw: form.kw,
        battery: form.battery, panels: form.panels, inverter: form.inverter,
        notes: form.notes, status: form.status,
        roof_images: form.roof_images, simulation_images: form.simulation_images,
      })
      .eq("id", selectedProject.id);

    if (error) { console.error(error); return; }
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

    if (error) { console.error(error); return; }
    await loadProjects();
    resetForm();
  };

  // ── MATERIALE ──────────────────────────────────────────────

  const handleAddMaterial = async () => {
    const name = newMaterialName.trim();
    if (!name) return;

    const { error } = await supabase.from("materials").insert({ name, unit: newMaterialUnit });
    if (error) { alert(error.message); return; }

    setNewMaterialName("");
    setNewMaterialUnit("buc");
    await loadMaterials();
  };

  const handleDeleteMaterial = async (materialId: string) => {
    const ok = confirm("Ștergi materialul din listă?");
    if (!ok) return;

    const { error } = await supabase.from("materials").delete().eq("id", materialId);
    if (error) { alert(error.message); return; }
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

    if (error) { alert(error.message); return; }
    setEditingMaterialId(null);
    await loadMaterials();
  };

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
          .insert({ project_id: selectedProject.id, material_id: materialId, quantity: value, saved: false })
          .select()
          .single();

        if (data) setProjectMaterials((prev) => [...prev, data]);
      }

      setAutoSaving(false);
    },
    [selectedProject]
  );

  const handleSaveMaterials = async () => {
    if (!selectedProject?.id) return;

    const upsertData = materials.map((material) => ({
      project_id: selectedProject.id!,
      material_id: material.id,
      quantity: quantities[material.id] || "",
      saved: true,
      saved_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("project_materials")
      .upsert(upsertData, { onConflict: "project_id,material_id" });

    if (error) { alert("Eroare la salvare: " + error.message); return; }

    setMaterialsSaved(true);
    setProjectMaterials((prev) => prev.map((pm) => ({ ...pm, saved: true })));
  };

  const handleUnlockMaterials = async () => {
    if (!selectedProject?.id) return;

    await supabase
      .from("project_materials")
      .update({ saved: false, saved_at: null })
      .eq("project_id", selectedProject.id);

    setMaterialsSaved(false);
    setProjectMaterials((prev) => prev.map((pm) => ({ ...pm, saved: false })));
  };

  // ── POZE MONTAJ ──────────────────────────────────────────────

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    const { error } = await supabase.from("montaj_categories").insert({ name });
    if (error) { alert(error.message); return; }

    setNewCategoryName("");
    await loadMontajCategories();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const ok = confirm("Ștergi categoria și toate pozele din ea?");
    if (!ok) return;

    const { error } = await supabase.from("montaj_categories").delete().eq("id", categoryId);
    if (error) { alert(error.message); return; }
    await loadMontajCategories();
    if (selectedProject?.id) await loadMontajImages(selectedProject.id);
  };

  const uploadMontajImage = async (file: File, categoryId: string) => {
    if (!selectedProject?.id) return;
    setUploadingCategory(categoryId);

    const fileName = `montaj/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("project-images").upload(fileName, file);
    if (error) { console.error(error); setUploadingCategory(null); return; }

    const { data } = supabase.storage.from("project-images").getPublicUrl(fileName);
    const url = data.publicUrl;

    const { data: inserted, error: insertError } = await supabase
      .from("montaj_images")
      .insert({ project_id: selectedProject.id, category_id: categoryId, url, saved: false })
      .select()
      .single();

    if (insertError) { console.error(insertError); setUploadingCategory(null); return; }
    if (inserted) setMontajImages((prev) => [...prev, inserted]);

    setUploadingCategory(null);
  };

  const deleteMontajImage = async (imageId: string) => {
    const { error } = await supabase.from("montaj_images").delete().eq("id", imageId);
    if (error) { alert(error.message); return; }
    setMontajImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  const handleSaveMontaj = async () => {
    if (!selectedProject?.id) return;

    const ids = montajImages.map((img) => img.id);
    if (ids.length === 0) { setMontajSaved(true); return; }

    const { error } = await supabase
      .from("montaj_images")
      .update({ saved: true, saved_at: new Date().toISOString() } as any)
      .eq("project_id", selectedProject.id);

    if (error) { alert("Eroare la salvare: " + error.message); return; }

    setMontajSaved(true);
    setMontajImages((prev) => prev.map((img) => ({ ...img, saved: true })));
  };

  const handleUnlockMontaj = async () => {
    if (!selectedProject?.id) return;

    await supabase
      .from("montaj_images")
      .update({ saved: false, saved_at: null } as any)
      .eq("project_id", selectedProject.id);

    setMontajSaved(false);
    setMontajImages((prev) => prev.map((img) => ({ ...img, saved: false })));
  };

  // ── IMAGINI ACOPERIS / SIMULARE ──────────────────────────────

  const deleteImage = async (imgToDelete: string, type: "roof" | "simulation") => {
    setForm((prev) => {
      const newForm = {
        ...prev,
        roof_images: type === "roof" ? prev.roof_images.filter((img) => img !== imgToDelete) : prev.roof_images,
        simulation_images: type === "simulation" ? prev.simulation_images.filter((img) => img !== imgToDelete) : prev.simulation_images,
      };

      if (selectedProject?.id) {
        supabase.from("projects").update({
          roof_images: newForm.roof_images,
          simulation_images: newForm.simulation_images,
        }).eq("id", selectedProject.id);
      }

      return newForm;
    });

    setLightboxImages((prev) => {
      const filtered = prev.filter((img) => img !== imgToDelete);
      if (filtered.length === 0) { setOpenLightbox(false); return []; }
      return filtered;
    });
  };

  const uploadImage = async (file: File, target: "roof" | "simulation") => {
    const fileName = Date.now() + "-" + file.name;
    const { error } = await supabase.storage.from("project-images").upload(fileName, file);
    if (error) { console.error(error); return; }

    const { data } = supabase.storage.from("project-images").getPublicUrl(fileName);
    const url = data.publicUrl;

    if (target === "roof") setForm((prev) => ({ ...prev, roof_images: [...prev.roof_images, url] }));
    if (target === "simulation") setForm((prev) => ({ ...prev, simulation_images: [...prev.simulation_images, url] }));
  };

  const handleCall = (phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleMaps = (location: string) => {
    if (!location) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, "_blank");
  };

  return (
    <AuthGuard>
      <div className="p-2 md:p-6">

        <style>{`
          .fc { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; font-size: 14px; }
          .fc table { border-collapse: collapse; }
          .fc td, .fc th { border-width: 1px !important; }
          .fc .fc-scrollgrid { transform: translateZ(0); backface-visibility: hidden; }
          .fc .fc-daygrid-day-number { font-size: 14px !important; font-weight: 600 !important; color: #111827 !important; padding: 4px 6px !important; }
          .fc .fc-col-header-cell-cushion { font-size: 13px !important; font-weight: 700 !important; color: #111827 !important; padding: 6px 4px !important; }
          .fc .fc-toolbar-title { font-size: 16px !important; font-weight: 700 !important; color: #111827 !important; }
          .fc .fc-button { font-size: 13px !important; font-weight: 600 !important; padding: 5px 10px !important; }
          .fc .fc-event-title { font-size: 12px !important; font-weight: 600 !important; }
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
              setMontajImages([]);
              setMontajSaved(false);
              setOpen(true);
            }}
            eventClick={(info) => {
              const p = info.event.extendedProps as Project;
              setSelectedProject({ ...p, id: info.event.id });
              setSelectedDate(p.date || null);
              setForm({
                client: p.client || "", phone: p.phone || "", email: p.email || "",
                title: p.title || "", location: p.location || "", kw: p.kw || "",
                battery: p.battery || "", panels: p.panels || "", inverter: p.inverter || "",
                notes: p.notes || "", status: p.status || "Programat",
                roof_images: p.roof_images || [], simulation_images: p.simulation_images || [],
              });
              loadProjectMaterials(info.event.id);
              loadMontajImages(info.event.id);
              setOpen(true);
            }}
          />
        </div>

        {open && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />

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
              <button className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded text-base" onClick={() => setShowClient(!showClient)}>
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
              <button className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base" onClick={() => setShowTechnical(!showTechnical)}>
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
              <button className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base" onClick={() => setShowRoof(!showRoof)}>
                🏠 Poze Acoperiș {showRoof ? "▲" : "▼"}
              </button>
              {showRoof && (
                <div className="p-2 mt-1">
                  {isAdmin && (
                    <input type="file" accept="image/*" className="mb-3 text-sm text-gray-700"
                      onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; await uploadImage(file, "roof"); }}
                    />
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {form.roof_images.map((img, i) => (
                      <img key={img} src={img} alt="" onClick={() => { setLightboxImages(form.roof_images || []); setActiveIndex(i); setLightboxCanDelete(isAdmin); setLightboxCategoryId(null); setOpenLightbox(true); }} className="rounded border h-28 w-full object-cover cursor-pointer" />
                    ))}
                  </div>
                </div>
              )}

              {/* Simulare */}
              <button className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base" onClick={() => setShowSimulation(!showSimulation)}>
                ☀️ Simulare Panouri {showSimulation ? "▲" : "▼"}
              </button>
              {showSimulation && (
                <div className="p-2 mt-1">
                  {isAdmin && (
                    <input type="file" accept="image/*" className="mb-3 text-sm text-gray-700"
                      onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; await uploadImage(file, "simulation"); }}
                    />
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {form.simulation_images.map((img, i) => (
                      <img key={img} src={img} alt="" onClick={() => { setLightboxImages(form.simulation_images || []); setActiveIndex(i); setLightboxCanDelete(isAdmin); setLightboxCategoryId(null); setOpenLightbox(true); }} className="rounded border h-28 w-full object-cover cursor-pointer" />
                    ))}
                  </div>
                </div>
              )}

              {/* ── POZE MONTAJ ── */}
              {selectedProject && (
                <>
                  <button
                    className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base"
                    onClick={() => setShowMontaj(!showMontaj)}
                  >
                    📸 Poze Montaj {showMontaj ? "▲" : "▼"}
                  </button>

                  {showMontaj && (
                    <div className="p-2 mt-1">

                      {/* Admin: adaugă categorie nouă */}
                      {isAdmin && (
                        <div className="flex gap-2 mb-4">
                          <input
                            className="border border-gray-300 p-2 rounded text-sm text-gray-900 placeholder-gray-500 flex-1"
                            placeholder="Nume categorie (ex: Poze panouri)"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
                          />
                          <button
                            className="bg-green-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-green-700 transition whitespace-nowrap"
                            onClick={handleAddCategory}
                          >
                            + Categorie
                          </button>
                        </div>
                      )}

                      {montajCategories.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          {isAdmin ? "Nu există categorii. Adaugă prima categorie mai sus." : "Nu există categorii de poze definite."}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {montajCategories.map((cat) => {
                            const catImages = montajImages.filter((img) => img.category_id === cat.id);
                            const isCollapsed = collapsedCategories[cat.id] ?? false;

                            return (
                              <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Header categorie */}
                                <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                                  <button
                                    className="flex items-center gap-2 flex-1 text-left"
                                    onClick={() => setCollapsedCategories((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                                  >
                                    <span className="font-semibold text-sm text-gray-800">{cat.name}</span>
                                    <span className="text-xs text-gray-400">({catImages.length} poze)</span>
                                    <span className="text-gray-400 text-xs ml-auto">{isCollapsed ? "▼" : "▲"}</span>
                                  </button>
                                  {isAdmin && (
                                    <button
                                      className="text-red-400 hover:text-red-600 text-sm font-bold ml-3 shrink-0"
                                      onClick={() => handleDeleteCategory(cat.id)}
                                      title="Șterge categoria"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>

                                {/* Continut categorie */}
                                {!isCollapsed && (
                                  <div className="p-3">
                                    {/* Upload buton — disponibil tuturor dacă nu e salvat */}
                                    {!montajSaved && (
                                      <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition mb-3">
                                        {uploadingCategory === cat.id ? "⏳ Se încarcă..." : "📷 Adaugă poze"}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          multiple
                                          className="hidden"
                                          disabled={uploadingCategory !== null}
                                          onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            for (const file of files) {
                                              await uploadMontajImage(file, cat.id);
                                            }
                                            e.target.value = "";
                                          }}
                                        />
                                      </label>
                                    )}

                                    {catImages.length === 0 ? (
                                      <p className="text-xs text-gray-400 italic">Nu există poze în această categorie.</p>
                                    ) : (
                                      <div className="grid grid-cols-3 gap-2">
                                        {catImages.map((img, i) => (
                                          <div key={img.id} className="relative group">
                                            <img
                                              src={img.url}
                                              alt=""
                                              className="rounded border h-28 w-full object-cover cursor-pointer"
                                              onClick={() => {
                                                const urls = catImages.map((ci) => ci.url);
                                                setLightboxImages(urls);
                                                setActiveIndex(i);
                                                setLightboxCanDelete(!montajSaved);
                                                setLightboxCategoryId(cat.id);
                                                setOpenLightbox(true);
                                              }}
                                            />
                                            {/* Buton ștergere rapidă pe thumbnail (doar dacă nu e salvat) */}
                                            {!montajSaved && (
                                              <button
                                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                                                onClick={(e) => { e.stopPropagation(); deleteMontajImage(img.id); }}
                                                title="Șterge poza"
                                              >
                                                ✕
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Butoane Salvează / Deblochează */}
                      <div className="mt-4 flex flex-wrap gap-2 items-center">
                        {!montajSaved && (
                          <button
                            className="bg-blue-600 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-blue-700 transition"
                            onClick={handleSaveMontaj}
                          >
                            💾 Salvează poze montaj
                          </button>
                        )}
                        {montajSaved && (
                          <span className="text-sm text-green-700 font-semibold flex items-center gap-1">
                            ✅ Poze montaj salvate
                          </span>
                        )}
                        {montajSaved && isAdmin && (
                          <button
                            className="bg-orange-500 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-orange-600 transition"
                            onClick={handleUnlockMontaj}
                          >
                            🔓 Deblochează pentru modificare
                          </button>
                        )}
                      </div>

                    </div>
                  )}
                </>
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

                      {materials.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">
                          {isAdmin ? "Nu există materiale definite. Adaugă primul material mai sus." : "Nu există materiale definite de admin."}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {materials.map((mat) => (
                            <div key={mat.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                              {isAdmin && editingMaterialId === mat.id ? (
                                <>
                                  <input className="border border-blue-400 p-1 rounded text-sm text-gray-900 flex-1 min-w-0" value={editingMaterialName} onChange={(e) => setEditingMaterialName(e.target.value)} autoFocus />
                                  <input className="border border-blue-400 p-1 rounded text-sm text-gray-900 w-16" value={editingMaterialUnit} onChange={(e) => setEditingMaterialUnit(e.target.value)} />
                                  <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-700 transition whitespace-nowrap" onClick={() => handleSaveEditMaterial(mat.id)}>✓ Salvează</button>
                                  <button className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-semibold hover:bg-gray-400 transition" onClick={handleCancelEditMaterial}>✕</button>
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
                                    className={`border border-gray-300 p-2 rounded text-sm text-gray-900 w-24 text-center shrink-0 ${materialsSaved && !isAdmin ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"}`}
                                    placeholder="0"
                                    value={quantities[mat.id] || ""}
                                    disabled={materialsSaved && !isAdmin}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuantities((prev) => ({ ...prev, [mat.id]: val }));
                                      if (debounceRef.current) clearTimeout(debounceRef.current);
                                      debounceRef.current = setTimeout(() => { autoSaveQuantity(mat.id, val, projectMaterials); }, 1000);
                                    }}
                                  />
                                  <span className="text-xs text-gray-400 w-8 shrink-0">{mat.unit}</span>
                                  {isAdmin && (
                                    <>
                                      <button className="text-blue-500 hover:text-blue-700 text-sm font-bold px-1 shrink-0" onClick={() => handleStartEditMaterial(mat)} title="Editează material">✏️</button>
                                      <button className="text-red-500 hover:text-red-700 text-sm font-bold px-1 shrink-0" onClick={() => handleDeleteMaterial(mat.id)} title="Șterge material">✕</button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {autoSaving && <p className="text-xs text-gray-400 italic mt-2">⏳ Se salvează automat...</p>}

                      {materials.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2 items-center">
                          {!materialsSaved && (
                            <button className="bg-blue-600 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-blue-700 transition" onClick={handleSaveMaterials}>
                              💾 Salvează materiale
                            </button>
                          )}
                          {materialsSaved && (
                            <span className="text-sm text-green-700 font-semibold flex items-center gap-1">✅ Materiale salvate</span>
                          )}
                          {materialsSaved && isAdmin && (
                            <button className="bg-orange-500 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-orange-600 transition" onClick={handleUnlockMaterials}>
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
                <button className="bg-gray-300 text-gray-800 font-semibold px-4 py-3 rounded text-base" onClick={resetForm}>
                  Închide
                </button>
                {isAdmin && !selectedProject && (
                  <button className="bg-blue-600 text-white font-semibold px-4 py-3 rounded text-base" onClick={handleSave}>
                    Salvează
                  </button>
                )}
                {isAdmin && selectedProject && (
                  <>
                    <button className="bg-blue-600 text-white font-semibold px-4 py-3 rounded text-base" onClick={handleUpdate}>Actualizează</button>
                    <button className="bg-red-600 text-white font-semibold px-4 py-3 rounded text-base" onClick={handleDelete}>Șterge</button>
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
              lightboxCanDelete
                ? (img) => {
                    if (lightboxCategoryId) {
                      // Poze montaj — stergere din DB
                      const found = montajImages.find((mi) => mi.url === img);
                      if (found) deleteMontajImage(found.id);
                      setLightboxImages((prev) => {
                        const filtered = prev.filter((i) => i !== img);
                        if (filtered.length === 0) setOpenLightbox(false);
                        return filtered;
                      });
                    } else {
                      // Poze acoperis / simulare
                      deleteImage(img, form.roof_images.includes(img) ? "roof" : "simulation");
                    }
                  }
                : undefined
            }
          />
        )}

      </div>
    </AuthGuard>
  );
}

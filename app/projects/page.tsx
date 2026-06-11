"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import roLocale from "@fullcalendar/core/locales/ro";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";
import ImageLightbox from "@/components/ImageLightbox";
import { useSearchParams } from "next/navigation";

const SUPER_ADMIN = "catalinvalentin01@gmail.com";

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
  order_index: number;
};

type MontajImage = {
  id: string;
  project_id: string;
  category_id: string;
  url: string;
  saved: boolean;
};

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageInner />
    </Suspense>
  );
}

function ProjectsPageInner() {
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [projectFinalized, setProjectFinalized] = useState(false);
  const searchParams = useSearchParams();

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

  const [materials, setMaterials] = useState<Material[]>([]);
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [materialsSaved, setMaterialsSaved] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialUnit, setNewMaterialUnit] = useState("buc");
  const [autoSaving, setAutoSaving] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingMaterialName, setEditingMaterialName] = useState("");
  const [editingMaterialUnit, setEditingMaterialUnit] = useState("");

  const [montajCategories, setMontajCategories] = useState<MontajCategory[]>([]);
  const [montajImages, setMontajImages] = useState<MontajImage[]>([]);
  const [montajSaved, setMontajSaved] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const dragCatRef = useRef<string | null>(null);
  const dragOverCatRef = useRef<string | null>(null);

  const [form, setForm] = useState<Project>({
    client: "", phone: "", email: "", title: "", location: "",
    kw: "", battery: "", panels: "", inverter: "", notes: "",
    status: "Programat", roof_images: [], simulation_images: [],
  });

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      if (data.user.email === SUPER_ADMIN) {
        setIsAdmin(true);
        setIsSuperAdmin(true);
        return;
      }
      const { data: access } = await supabase
        .from("user_access")
        .select("is_admin")
        .eq("email", data.user.email)
        .single();
      setIsAdmin(access?.is_admin === true);
    };
    check();
  }, []);

  async function loadProjects() {
    const { data, error } = await supabase.from("projects").select("*").order("date", { ascending: true });
    if (error) { console.error(error); return; }
    setEvents((data || []).map((p) => ({
      id: p.id,
      title: `${p.client} - ${p.title}`,
      start: p.date,
      allDay: true,
      extendedProps: p,
    })));
  }

  async function loadMaterials() {
    const { data, error } = await supabase.from("materials").select("*").order("created_at", { ascending: true });
    if (error) { console.error(error); return; }
    setMaterials(data || []);
  }

  async function loadProjectMaterials(projectId: string) {
    const { data, error } = await supabase.from("project_materials").select("*").eq("project_id", projectId);
    if (error) { console.error(error); return; }
    const rows = data || [];
    setProjectMaterials(rows);
    const q: Record<string, string> = {};
    rows.forEach((row) => { q[row.material_id] = row.quantity || ""; });
    setQuantities(q);
    setMaterialsSaved(rows.some((r) => r.saved === true));
  }

  async function loadMontajCategories() {
    const { data, error } = await supabase.from("montaj_categories").select("*").order("order_index", { ascending: true });
    if (error) { console.error(error); return; }
    setMontajCategories(data || []);
  }

  async function loadMontajImages(projectId: string) {
    const { data, error } = await supabase.from("montaj_images").select("*").eq("project_id", projectId);
    if (error) { console.error(error); return; }
    const rows = data || [];
    setMontajImages(rows);
    setMontajSaved(rows.some((r) => r.saved === true));
  }

  useEffect(() => {
    loadProjects();
    loadMaterials();
    loadMontajCategories();
  }, []);

  // Auto-deschide proiectul dacă vine din Today (?open=ID)
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    const tryOpen = async () => {
      const { data: p, error } = await supabase.from("projects").select("*").eq("id", openId).single();
      if (error || !p) return;
      setSelectedProject({ ...p, id: p.id });
      setSelectedDate(p.date || null);
      setForm({
        client: p.client || "", phone: p.phone || "", email: p.email || "",
        title: p.title || "", location: p.location || "", kw: p.kw || "",
        battery: p.battery || "", panels: p.panels || "", inverter: p.inverter || "",
        notes: p.notes || "", status: p.status || "Programat",
        roof_images: p.roof_images || [], simulation_images: p.simulation_images || [],
      });
      setProjectFinalized(p.status === "Finalizat");
      setShowClient(false); setShowTechnical(false); setShowRoof(false);
      setShowSimulation(false); setShowMaterials(false); setShowMontaj(false);
      loadProjectMaterials(p.id);
      loadMontajImages(p.id);
      setOpen(true);
    };
    tryOpen();
  }, [searchParams]);

  const resetForm = () => {
    setForm({ client: "", phone: "", email: "", title: "", location: "", kw: "", battery: "", panels: "", inverter: "", notes: "", status: "Programat", roof_images: [], simulation_images: [] });
    setSelectedProject(null);
    setSelectedDate(null);
    setProjectMaterials([]);
    setQuantities({});
    setMaterialsSaved(false);
    setMontajImages([]);
    setMontajSaved(false);
    setProjectFinalized(false);
    setOpen(false);
    setEditingMaterialId(null);
    setEditingCategoryId(null);
    setCollapsedCategories({});
  };

  const handleSave = async () => {
    const { error } = await supabase.from("projects").insert({ ...form, date: selectedDate }).select();
    if (error) { alert(error.message); return; }
    resetForm();
    await loadProjects();
  };

  const handleUpdate = async () => {
    if (!selectedProject?.id) return;
    const { error } = await supabase.from("projects").update({
      client: form.client, phone: form.phone, email: form.email, title: form.title,
      location: form.location, kw: form.kw, battery: form.battery, panels: form.panels,
      inverter: form.inverter, notes: form.notes, status: form.status,
      roof_images: form.roof_images, simulation_images: form.simulation_images,
    }).eq("id", selectedProject.id);
    if (error) { console.error(error); return; }
    await loadProjects();
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedProject?.id) return;
    if (!confirm("Sigur dorești ștergerea proiectului?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", selectedProject.id);
    if (error) { console.error(error); return; }
    await loadProjects();
    resetForm();
  };

  const handleFinalizeProject = async () => {
    if (!selectedProject?.id) return;
    const confirmed = confirm(
      `Ești sigur că vrei să finalizezi proiectul "${form.client} - ${form.title}"?\n\nDupă finalizare, toate modificările vor fi blocate.`
    );
    if (!confirmed) return;
    const { error } = await supabase.from("projects").update({ status: "Finalizat" }).eq("id", selectedProject.id);
    if (error) { alert("Eroare: " + error.message); return; }
    await supabase.from("notifications").insert({
      title: "✅ Proiect finalizat",
      message: `Proiectul "${form.client} - ${form.title}" (${selectedDate || "fără dată"}) a fost marcat ca finalizat.`,
      project_id: selectedProject.id,
    });
    setProjectFinalized(true);
    setForm((prev) => ({ ...prev, status: "Finalizat" }));
    await loadProjects();
  };

  const handleUnlockProject = async () => {
    if (!selectedProject?.id) return;
    if (!confirm("Deblochezi proiectul pentru modificare?")) return;
    const { error } = await supabase.from("projects").update({ status: "În lucru" }).eq("id", selectedProject.id);
    if (error) { alert("Eroare: " + error.message); return; }
    setProjectFinalized(false);
    setForm((prev) => ({ ...prev, status: "În lucru" }));
    await loadProjects();
  };

  // ── MATERIALE ──────────────────────────────────────────────

  const handleAddMaterial = async () => {
    const name = newMaterialName.trim();
    if (!name) return;
    const { error } = await supabase.from("materials").insert({ name, unit: newMaterialUnit });
    if (error) { alert(error.message); return; }
    setNewMaterialName(""); setNewMaterialUnit("buc");
    await loadMaterials();
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Ștergi materialul din listă?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", materialId);
    if (error) { alert(error.message); return; }
    await loadMaterials();
  };

  const handleSaveEditMaterial = async (materialId: string) => {
    const name = editingMaterialName.trim();
    if (!name) return;
    const { error } = await supabase.from("materials").update({ name, unit: editingMaterialUnit }).eq("id", materialId);
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
        await supabase.from("project_materials").update({ quantity: value, saved: false }).eq("id", existing.id);
      } else {
        const { data } = await supabase.from("project_materials")
          .insert({ project_id: selectedProject.id, material_id: materialId, quantity: value, saved: false })
          .select().single();
        if (data) setProjectMaterials((prev) => [...prev, data]);
      }
      setAutoSaving(false);
    },
    [selectedProject]
  );

  const handleSaveMaterials = async () => {
    if (!selectedProject?.id) return;
    const upsertData = materials.map((m) => ({
      project_id: selectedProject.id!, material_id: m.id,
      quantity: quantities[m.id] || "", saved: true, saved_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("project_materials").upsert(upsertData, { onConflict: "project_id,material_id" });
    if (error) { alert("Eroare la salvare: " + error.message); return; }
    setMaterialsSaved(true);
    setProjectMaterials((prev) => prev.map((pm) => ({ ...pm, saved: true })));
  };

  const handleUnlockMaterials = async () => {
    if (!selectedProject?.id) return;
    await supabase.from("project_materials").update({ saved: false, saved_at: null }).eq("project_id", selectedProject.id);
    setMaterialsSaved(false);
    setProjectMaterials((prev) => prev.map((pm) => ({ ...pm, saved: false })));
  };

  const handlePrintMaterials = () => {
    const printContent = `
      <html><head><title>Materiale — ${form.client} / ${form.title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        p { font-size: 13px; color: #555; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-size: 13px; border: 1px solid #e5e7eb; }
        td { padding: 10px 12px; font-size: 13px; border: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f9fafb; }
        .qty { font-weight: bold; text-align: center; }
        .empty { color: #aaa; text-align: center; }
      </style></head><body>
        <h1>Lista materiale — ${form.client || "—"}</h1>
        <p>Proiect: ${form.title || "—"} &nbsp;|&nbsp; Locație: ${form.location || "—"} &nbsp;|&nbsp; Data: ${selectedDate || "—"}</p>
        <table><thead><tr><th>#</th><th>Material</th><th>U.M.</th><th>Cantitate</th></tr></thead>
        <tbody>${materials.map((mat, i) => `<tr><td>${i + 1}</td><td>${mat.name}</td><td>${mat.unit}</td><td class="${quantities[mat.id] ? "qty" : "empty"}">${quantities[mat.id] || "—"}</td></tr>`).join("")}</tbody>
        </table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownloadPDF = () => {
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const colWidths = [10, 100, 25, 35];
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = (pageWidth - tableWidth) / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Lista materiale — ${form.client || "—"}`, margin, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Proiect: ${form.title || "—"}   |   Locație: ${form.location || "—"}   |   Data: ${selectedDate || "—"}`, margin, 28);
      doc.setTextColor(0);
      let y = 38;
      const rowH = 9;
      doc.setFillColor(243, 244, 246);
      doc.rect(startX, y, tableWidth, rowH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      let x = startX;
      ["#", "Material", "U.M.", "Cantitate"].forEach((h, i) => { doc.text(h, x + 2, y + 6); x += colWidths[i]; });
      doc.setFont("helvetica", "normal");
      materials.forEach((mat, idx) => {
        y += rowH;
        if (idx % 2 === 1) { doc.setFillColor(249, 250, 251); doc.rect(startX, y, tableWidth, rowH, "F"); }
        const qty = quantities[mat.id] || "—";
        x = startX;
        [`${idx + 1}`, mat.name, mat.unit, qty].forEach((cell, i) => {
          if (i === 3 && quantities[mat.id]) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
          const maxW = colWidths[i] - 4;
          const truncated = doc.getTextWidth(cell) > maxW ? cell.substring(0, Math.floor(cell.length * maxW / doc.getTextWidth(cell)) - 2) + "…" : cell;
          doc.text(truncated, x + 2, y + 6);
          x += colWidths[i];
        });
        doc.setDrawColor(229, 231, 235);
        doc.rect(startX, y, tableWidth, rowH);
      });
      doc.setDrawColor(209, 213, 219);
      doc.rect(startX, 38, tableWidth, rowH);
      const fileName = `materiale-${(form.client || "proiect").replace(/\s+/g, "-").toLowerCase()}-${selectedDate || "fara-data"}.pdf`;
      doc.save(fileName);
    });
  };

  // ── POZE MONTAJ ──────────────────────────────────────────────

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    const maxOrder = montajCategories.reduce((max, c) => Math.max(max, c.order_index || 0), 0);
    const { error } = await supabase.from("montaj_categories").insert({ name, order_index: maxOrder + 1 });
    if (error) { alert(error.message); return; }
    setNewCategoryName("");
    await loadMontajCategories();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Ștergi categoria și toate pozele din ea?")) return;
    const { error } = await supabase.from("montaj_categories").delete().eq("id", categoryId);
    if (error) { alert(error.message); return; }
    await loadMontajCategories();
    if (selectedProject?.id) await loadMontajImages(selectedProject.id);
  };

  const handleSaveEditCategory = async (categoryId: string) => {
    const name = editingCategoryName.trim();
    if (!name) return;
    const { error } = await supabase.from("montaj_categories").update({ name }).eq("id", categoryId);
    if (error) { alert(error.message); return; }
    setEditingCategoryId(null);
    await loadMontajCategories();
  };

  const saveOrderToDB = async (reordered: MontajCategory[]) => {
    const updates = reordered.map((cat, idx) =>
      supabase.from("montaj_categories").update({ order_index: idx + 1 }).eq("id", cat.id)
    );
    await Promise.all(updates);
  };

  const moveCategoryUp = async (index: number) => {
    if (index === 0) return;
    const reordered = [...montajCategories];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setMontajCategories(reordered);
    await saveOrderToDB(reordered);
  };

  const moveCategoryDown = async (index: number) => {
    if (index === montajCategories.length - 1) return;
    const reordered = [...montajCategories];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    setMontajCategories(reordered);
    await saveOrderToDB(reordered);
  };

  const handleDragStart = (categoryId: string) => { dragCatRef.current = categoryId; };
  const handleDragOver = (e: React.DragEvent, categoryId: string) => { e.preventDefault(); dragOverCatRef.current = categoryId; };
  const handleDrop = async () => {
    const dragId = dragCatRef.current;
    const overId = dragOverCatRef.current;
    if (!dragId || !overId || dragId === overId) return;
    const reordered = [...montajCategories];
    const fromIdx = reordered.findIndex((c) => c.id === dragId);
    const toIdx = reordered.findIndex((c) => c.id === overId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setMontajCategories(reordered);
    dragCatRef.current = null;
    dragOverCatRef.current = null;
    await saveOrderToDB(reordered);
  };

  const uploadMontajImage = async (file: File, categoryId: string) => {
    if (!selectedProject?.id) return;
    setUploadingCategory(categoryId);
    const fileName = `montaj/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("project-images").upload(fileName, file);
    if (error) { console.error(error); setUploadingCategory(null); return; }
    const { data } = supabase.storage.from("project-images").getPublicUrl(fileName);
    const { data: inserted, error: insertError } = await supabase
      .from("montaj_images")
      .insert({ project_id: selectedProject.id, category_id: categoryId, url: data.publicUrl, saved: false })
      .select().single();
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
    if (montajImages.length === 0) { setMontajSaved(true); return; }
    const { error } = await supabase.from("montaj_images")
      .update({ saved: true, saved_at: new Date().toISOString() } as any)
      .eq("project_id", selectedProject.id);
    if (error) { alert("Eroare la salvare: " + error.message); return; }
    setMontajSaved(true);
    setMontajImages((prev) => prev.map((img) => ({ ...img, saved: true })));
  };

  const handleUnlockMontaj = async () => {
    if (!selectedProject?.id) return;
    await supabase.from("montaj_images").update({ saved: false, saved_at: null } as any).eq("project_id", selectedProject.id);
    setMontajSaved(false);
    setMontajImages((prev) => prev.map((img) => ({ ...img, saved: false })));
  };

  const deleteImage = async (imgToDelete: string, type: "roof" | "simulation") => {
    setForm((prev) => {
      const newForm = {
        ...prev,
        roof_images: type === "roof" ? prev.roof_images.filter((img) => img !== imgToDelete) : prev.roof_images,
        simulation_images: type === "simulation" ? prev.simulation_images.filter((img) => img !== imgToDelete) : prev.simulation_images,
      };
      if (selectedProject?.id) {
        supabase.from("projects").update({ roof_images: newForm.roof_images, simulation_images: newForm.simulation_images }).eq("id", selectedProject.id);
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
    if (target === "roof") setForm((prev) => ({ ...prev, roof_images: [...prev.roof_images, data.publicUrl] }));
    if (target === "simulation") setForm((prev) => ({ ...prev, simulation_images: [...prev.simulation_images, data.publicUrl] }));
  };

  const handleCall = (phone: string) => { if (phone) window.location.href = `tel:${phone}`; };
  const handleMaps = (location: string) => {
    if (location) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, "_blank");
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
          .drag-over { outline: 2px dashed #3b82f6; outline-offset: -2px; background: #eff6ff; }
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
              setSelectedProject(null); setSelectedDate(info.dateStr);
              setProjectMaterials([]); setQuantities({}); setMaterialsSaved(false);
              setMontajImages([]); setMontajSaved(false); setProjectFinalized(false);
              setShowClient(true); setShowTechnical(true); setShowRoof(true);
              setShowSimulation(true); setShowMaterials(true); setShowMontaj(true);
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
              setProjectFinalized(p.status === "Finalizat");
              setShowClient(false); setShowTechnical(false); setShowRoof(false);
              setShowSimulation(false); setShowMaterials(false); setShowMontaj(false);
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
                <h2 className="font-bold text-xl text-gray-900">{selectedProject ? "Detalii proiect" : "Proiect nou"}</h2>
                <span className="text-sm font-semibold text-gray-600">{selectedDate}</span>
              </div>

              {selectedProject && (
                <div className="flex flex-wrap gap-3 mb-4">
                  {form.phone && (
                    <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition text-sm" onClick={() => handleCall(form.phone)}>
                      📞 Sună — {form.phone}
                    </button>
                  )}
                  {form.location && (
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm" onClick={() => handleMaps(form.location)}>
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
                  {isAdmin && !projectFinalized ? (
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
                  {isAdmin && !projectFinalized ? (
                    <>
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Titlu proiect" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="kW" value={form.kw} onChange={(e) => setForm({ ...form, kw: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Panouri" value={form.panels} onChange={(e) => setForm({ ...form, panels: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Invertor" value={form.inverter} onChange={(e) => setForm({ ...form, inverter: e.target.value })} />
                      <input className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500" placeholder="Baterie" value={form.battery} onChange={(e) => setForm({ ...form, battery: e.target.value })} />
                      <select className="border border-gray-300 p-3 rounded text-base text-gray-900" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option>Programat</option><option>În lucru</option><option>Finalizat</option>
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
                  {isAdmin && !projectFinalized && <input type="file" accept="image/*" className="mb-3 text-sm text-gray-700" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadImage(file, "roof"); }} />}
                  <div className="grid grid-cols-3 gap-2">
                    {form.roof_images.map((img, i) => (
                      <img key={img} src={img} alt="" onClick={() => { setLightboxImages(form.roof_images); setActiveIndex(i); setLightboxCanDelete(isAdmin && !projectFinalized); setLightboxCategoryId(null); setOpenLightbox(true); }} className="rounded border h-28 w-full object-cover cursor-pointer" />
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
                  {isAdmin && !projectFinalized && <input type="file" accept="image/*" className="mb-3 text-sm text-gray-700" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadImage(file, "simulation"); }} />}
                  <div className="grid grid-cols-3 gap-2">
                    {form.simulation_images.map((img, i) => (
                      <img key={img} src={img} alt="" onClick={() => { setLightboxImages(form.simulation_images); setActiveIndex(i); setLightboxCanDelete(isAdmin && !projectFinalized); setLightboxCategoryId(null); setOpenLightbox(true); }} className="rounded border h-28 w-full object-cover cursor-pointer" />
                    ))}
                  </div>
                </div>
              )}

              {/* ── POZE MONTAJ ── */}
              {selectedProject && (
                <>
                  <button className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base" onClick={() => setShowMontaj(!showMontaj)}>
                    📸 Poze Montaj {showMontaj ? "▲" : "▼"}
                  </button>
                  {showMontaj && (
                    <div className="p-2 mt-1">
                      {isAdmin && !projectFinalized && (
                        <div className="flex gap-2 mb-4">
                          <input className="border border-gray-300 p-2 rounded text-sm text-gray-900 placeholder-gray-500 flex-1" placeholder="Nume categorie (ex: Poze panouri)" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }} />
                          <button className="bg-green-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-green-700 transition whitespace-nowrap" onClick={handleAddCategory}>+ Categorie</button>
                        </div>
                      )}
                      {isAdmin && montajCategories.length > 1 && (
                        <p className="text-xs text-gray-400 italic mb-2">💡 Trage categoriile pentru a le reordona, sau folosește săgețile ↑↓</p>
                      )}
                      {montajCategories.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">{isAdmin ? "Nu există categorii. Adaugă prima categorie mai sus." : "Nu există categorii de poze definite."}</p>
                      ) : (
                        <div className="space-y-3">
                          {montajCategories.map((cat, catIndex) => {
                            const catImages = montajImages.filter((img) => img.category_id === cat.id);
                            const isCollapsed = collapsedCategories[cat.id] ?? false;
                            const isEditingThis = editingCategoryId === cat.id;
                            return (
                              <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden transition-all"
                                draggable={isAdmin && !projectFinalized}
                                onDragStart={() => handleDragStart(cat.id)}
                                onDragOver={(e) => { handleDragOver(e, cat.id); (e.currentTarget as HTMLElement).classList.add("drag-over"); }}
                                onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("drag-over")}
                                onDrop={(e) => { (e.currentTarget as HTMLElement).classList.remove("drag-over"); handleDrop(); }}
                              >
                                <div className="flex items-center bg-gray-50 px-3 py-2 gap-2">
                                  {isAdmin && !projectFinalized && <span className="text-gray-300 cursor-grab active:cursor-grabbing text-lg select-none shrink-0">⠿</span>}
                                  {isAdmin && !projectFinalized && isEditingThis ? (
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <input className="border border-blue-400 p-1 rounded text-sm text-gray-900 flex-1 min-w-0" value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveEditCategory(cat.id); if (e.key === "Escape") setEditingCategoryId(null); }} autoFocus />
                                      <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-700 whitespace-nowrap" onClick={() => handleSaveEditCategory(cat.id)}>✓</button>
                                      <button className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-semibold hover:bg-gray-400" onClick={() => setEditingCategoryId(null)}>✕</button>
                                    </div>
                                  ) : (
                                    <button className="flex items-center gap-2 flex-1 text-left min-w-0" onClick={() => setCollapsedCategories((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}>
                                      <span className="font-semibold text-sm text-gray-800 truncate">{cat.name}</span>
                                      <span className="text-xs text-gray-400 shrink-0">({catImages.length} poze)</span>
                                      <span className="text-gray-400 text-xs ml-auto shrink-0">{isCollapsed ? "▼" : "▲"}</span>
                                    </button>
                                  )}
                                  {isAdmin && !projectFinalized && !isEditingThis && (
                                    <div className="flex items-center gap-1 shrink-0 ml-1">
                                      <button className="text-gray-400 hover:text-gray-700 font-bold px-1 disabled:opacity-20" onClick={() => moveCategoryUp(catIndex)} disabled={catIndex === 0}>↑</button>
                                      <button className="text-gray-400 hover:text-gray-700 font-bold px-1 disabled:opacity-20" onClick={() => moveCategoryDown(catIndex)} disabled={catIndex === montajCategories.length - 1}>↓</button>
                                      <button className="text-blue-400 hover:text-blue-600 text-sm font-bold px-1" onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}>✏️</button>
                                      <button className="text-red-400 hover:text-red-600 text-sm font-bold px-1" onClick={() => handleDeleteCategory(cat.id)}>✕</button>
                                    </div>
                                  )}
                                </div>
                                {!isCollapsed && (
                                  <div className="p-3">
                                    {!montajSaved && !projectFinalized && (
                                      <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition mb-3">
                                        {uploadingCategory === cat.id ? "⏳ Se încarcă..." : "📷 Adaugă poze"}
                                        <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingCategory !== null}
                                          onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            for (const file of files) await uploadMontajImage(file, cat.id);
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
                                            <img src={img.url} alt="" className="rounded border h-28 w-full object-cover cursor-pointer"
                                              onClick={() => { setLightboxImages(catImages.map((ci) => ci.url)); setActiveIndex(i); setLightboxCanDelete(!montajSaved && !projectFinalized); setLightboxCategoryId(cat.id); setOpenLightbox(true); }}
                                            />
                                            {!montajSaved && !projectFinalized && (
                                              <button className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 text-xs font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center" onClick={(e) => { e.stopPropagation(); deleteMontajImage(img.id); }}>✕</button>
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
                      <div className="mt-4 flex flex-wrap gap-2 items-center">
                        {!montajSaved && !projectFinalized && (
                          <button className="bg-blue-600 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-blue-700 transition" onClick={handleSaveMontaj}>💾 Salvează poze montaj</button>
                        )}
                        {montajSaved && <span className="text-sm text-green-700 font-semibold">✅ Poze montaj salvate</span>}
                        {montajSaved && isAdmin && !projectFinalized && (
                          <button className="bg-orange-500 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-orange-600 transition" onClick={handleUnlockMontaj}>🔓 Deblochează pentru modificare</button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── MATERIALE FOLOSITE ── */}
              {selectedProject && (
                <>
                  <button className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base" onClick={() => setShowMaterials(!showMaterials)}>
                    🔧 Materiale folosite {showMaterials ? "▲" : "▼"}
                  </button>
                  {showMaterials && (
                    <div className="p-2 mt-1">
                      {isAdmin && !projectFinalized && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          <input className="border border-gray-300 p-2 rounded text-sm text-gray-900 placeholder-gray-500 flex-1 min-w-[150px]" placeholder="Nume material (ex: Clemă capăt)" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} />
                          <input className="border border-gray-300 p-2 rounded text-sm text-gray-900 w-24" placeholder="U.M. (buc)" value={newMaterialUnit} onChange={(e) => setNewMaterialUnit(e.target.value)} />
                          <button className="bg-green-600 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-green-700 transition" onClick={handleAddMaterial}>+ Adaugă</button>
                        </div>
                      )}
                      {materials.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">{isAdmin ? "Nu există materiale definite. Adaugă primul material mai sus." : "Nu există materiale definite de admin."}</p>
                      ) : (
                        <div className="space-y-2">
                          {materials.map((mat) => (
                            <div key={mat.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                              {isAdmin && !projectFinalized && editingMaterialId === mat.id ? (
                                <>
                                  <input className="border border-blue-400 p-1 rounded text-sm text-gray-900 flex-1 min-w-0" value={editingMaterialName} onChange={(e) => setEditingMaterialName(e.target.value)} autoFocus />
                                  <input className="border border-blue-400 p-1 rounded text-sm text-gray-900 w-16" value={editingMaterialUnit} onChange={(e) => setEditingMaterialUnit(e.target.value)} />
                                  <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-blue-700 whitespace-nowrap" onClick={() => handleSaveEditMaterial(mat.id)}>✓ Salvează</button>
                                  <button className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs font-semibold hover:bg-gray-400" onClick={() => setEditingMaterialId(null)}>✕</button>
                                </>
                              ) : (
                                <>
                                  <span className="flex-1 text-sm font-medium text-gray-800 min-w-0">{mat.name}<span className="text-gray-400 ml-1 text-xs">({mat.unit})</span></span>
                                  <input
                                    type="number" min="0"
                                    className={`border border-gray-300 p-2 rounded text-sm text-gray-900 w-24 text-center shrink-0 ${(materialsSaved && !isAdmin) || projectFinalized ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"}`}
                                    placeholder="0" value={quantities[mat.id] || ""}
                                    disabled={(materialsSaved && !isAdmin) || projectFinalized}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuantities((prev) => ({ ...prev, [mat.id]: val }));
                                      if (debounceRef.current) clearTimeout(debounceRef.current);
                                      debounceRef.current = setTimeout(() => autoSaveQuantity(mat.id, val, projectMaterials), 1000);
                                    }}
                                  />
                                  <span className="text-xs text-gray-400 w-8 shrink-0">{mat.unit}</span>
                                  {isAdmin && !projectFinalized && (
                                    <>
                                      <button className="text-blue-500 hover:text-blue-700 text-sm font-bold px-1 shrink-0" onClick={() => { setEditingMaterialId(mat.id); setEditingMaterialName(mat.name); setEditingMaterialUnit(mat.unit); }}>✏️</button>
                                      <button className="text-red-500 hover:text-red-700 text-sm font-bold px-1 shrink-0" onClick={() => handleDeleteMaterial(mat.id)}>✕</button>
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
                          {!materialsSaved && !projectFinalized && (
                            <button className="bg-blue-600 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-blue-700 transition" onClick={handleSaveMaterials}>💾 Salvează materiale</button>
                          )}
                          {materialsSaved && <span className="text-sm text-green-700 font-semibold">✅ Materiale salvate</span>}
                          {materialsSaved && isAdmin && !projectFinalized && (
                            <button className="bg-orange-500 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-orange-600 transition" onClick={handleUnlockMaterials}>🔓 Deblochează pentru modificare</button>
                          )}
                          {isAdmin && (
                            <>
                              <button className="bg-gray-700 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-gray-800 transition" onClick={handlePrintMaterials}>🖨️ Printează</button>
                              <button className="bg-green-700 text-white font-semibold px-4 py-2 rounded text-sm hover:bg-green-800 transition" onClick={handleDownloadPDF}>⬇️ Descarcă PDF</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Butoane jos */}
              <div className="flex flex-wrap gap-2 mt-6">
                <button className="bg-gray-300 text-gray-800 font-semibold px-4 py-3 rounded text-base" onClick={resetForm}>Închide</button>
                {isAdmin && !selectedProject && <button className="bg-blue-600 text-white font-semibold px-4 py-3 rounded text-base" onClick={handleSave}>Salvează</button>}
                {isAdmin && selectedProject && !projectFinalized && (
                  <>
                    <button className="bg-blue-600 text-white font-semibold px-4 py-3 rounded text-base" onClick={handleUpdate}>Actualizează</button>
                    <button className="bg-red-600 text-white font-semibold px-4 py-3 rounded text-base" onClick={handleDelete}>Șterge</button>
                  </>
                )}
                {isAdmin && selectedProject && projectFinalized && (
                  <button className="bg-orange-500 text-white font-semibold px-4 py-3 rounded text-base hover:bg-orange-600 transition" onClick={handleUnlockProject}>
                    🔓 Deblochează proiectul
                  </button>
                )}
              </div>

              {/* Buton Finalizare */}
              {selectedProject && !projectFinalized && (
                <button className="w-full mt-3 bg-green-600 text-white font-bold py-3 rounded-lg text-base hover:bg-green-700 transition" onClick={handleFinalizeProject}>
                  ✅ Finalizare proiect
                </button>
              )}
              {selectedProject && projectFinalized && (
                <div className="w-full mt-3 bg-green-50 border border-green-300 text-green-800 font-semibold py-3 rounded-lg text-base text-center">
                  ✅ Proiect finalizat
                </div>
              )}

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
                      const found = montajImages.find((mi) => mi.url === img);
                      if (found) deleteMontajImage(found.id);
                      setLightboxImages((prev) => {
                        const filtered = prev.filter((i) => i !== img);
                        if (filtered.length === 0) setOpenLightbox(false);
                        return filtered;
                      });
                    } else {
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

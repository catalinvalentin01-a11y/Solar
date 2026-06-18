"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import roLocale from "@fullcalendar/core/locales/ro";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";
import ImageLightbox from "@/components/ImageLightbox";
import { useSearchParams, useRouter } from "next/navigation";

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
  role: string;
  quantity?: number;
  min_quantity?: number;
  code?: string | null;
  photo_url?: string | null;
};

type ProjectMaterial = {
  id?: string;
  project_id: string;
  material_id: string;
  quantity: string;
  saved: boolean;
  checked?: boolean;
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

type MaterialRole = "montator" | "electrician";

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageInner />
    </Suspense>
  );
}

function SolarLoader() {
  const ROWS = 5, COLS = 7, TOTAL = ROWS * COLS;
  const [litCells, setLitCells] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    const order: {idx: number; diag: number}[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        order.push({ idx: r * COLS + c, diag: r + c });
    const groups: Record<number, number[]> = {};
    order.forEach(({ idx, diag }) => {
      if (!groups[diag]) groups[diag] = [];
      groups[diag].push(idx);
    });
    const diagKeys = Object.keys(groups).map(Number).sort((a, b) => a - b);

    let step = 0;
    let running = true;

    function runWave() {
      if (!running) return;
      setLitCells(new Set());
      step = 0;
      const t = setInterval(() => {
        if (!running) { clearInterval(t); return; }
        if (step >= diagKeys.length) {
          clearInterval(t);
          setTimeout(() => { if (running) runWave(); }, 700);
          return;
        }
        setLitCells(prev => {
          const next = new Set(prev);
          groups[diagKeys[step]].forEach(i => next.add(i));
          return next;
        });
        step++;
      }, 75);
    }
    runWave();
    return () => { running = false; };
  }, []);

  return (
    <div style={{background:'#060f1e',borderRadius:'10px',padding:'8px',border:'1px solid #1e3a5f',position:'relative',overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7, 36px)',gridTemplateRows:'repeat(5, 22px)',gap:'3px',position:'relative',zIndex:1}}>
        {Array.from({length: TOTAL}, (_, i) => (
          <div key={i} style={{
            borderRadius:'3px',
            background: litCells.has(i) ? '#1e3a5f' : '#0d1f35',
            border: litCells.has(i) ? '0.5px solid #3b82f6' : '0.5px solid #1e3a5f',
            boxShadow: litCells.has(i) ? '0 0 5px rgba(59,130,246,0.35)' : 'none',
            transition:'background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
            position:'relative',
            overflow:'hidden',
          }}>
            {litCells.has(i) && (
              <div style={{position:'absolute',top:'1px',left:'1px',right:'1px',height:'38%',background:'rgba(147,197,253,0.1)',borderRadius:'2px 2px 0 0'}} />
            )}
          </div>
        ))}
      </div>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(105deg, transparent 25%, rgba(59,130,246,0.06) 50%, transparent 75%)',animation:'solarShimmer 2.2s ease-in-out infinite',pointerEvents:'none',zIndex:2}} />
      <style>{`@keyframes solarShimmer { 0% { transform: translateX(-100%); } 65%,100% { transform: translateX(200%); } }`}</style>
    </div>
  );
}

function ProjectsPageInner() {
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [projectFinalized, setProjectFinalized] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const [materialsSavedMontator, setMaterialsSavedMontator] = useState(false);
  const [materialsSavedElectrician, setMaterialsSavedElectrician] = useState(false);

  const [activeMaterialRole, setActiveMaterialRole] = useState<MaterialRole>("montator");

  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialUnit, setNewMaterialUnit] = useState("buc");
  const [autoSaving, setAutoSaving] = useState(false);
  const [checkedMaterialIds, setCheckedMaterialIds] = useState<Set<string>>(new Set());
  const [loadingProject, setLoadingProject] = useState(false);
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
  const [projectHistory, setProjectHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [materialLightboxUrl, setMaterialLightboxUrl] = useState<string | null>(null);

  const dragCatRef = useRef<string | null>(null);
  const dragOverCatRef = useRef<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState("");

  const [form, setForm] = useState<Project>({
    client: "", phone: "", email: "", title: "", location: "",
    kw: "", battery: "", panels: "", inverter: "", notes: "",
    status: "Programat", roof_images: [], simulation_images: [],
  });

  const materialsMontator = materials.filter((m) => m.role === "montator");
  const materialsElectrician = materials.filter((m) => m.role === "electrician");
  const activeMaterials = activeMaterialRole === "montator" ? materialsMontator : materialsElectrician;
  const materialsSaved = activeMaterialRole === "montator" ? materialsSavedMontator : materialsSavedElectrician;

  const allProjects: Project[] = events.map((e) => ({ ...e.extendedProps, id: e.id }));
  const searchResults = (searchQuery || searchStatus)
    ? allProjects.filter((p) => {
        const q = searchQuery.toLowerCase();
        const matchesQuery = !q || (
          (p.client || "").toLowerCase().includes(q) ||
          (p.title || "").toLowerCase().includes(q) ||
          (p.location || "").toLowerCase().includes(q)
        );
        const matchesStatus = !searchStatus || p.status === searchStatus;
        return matchesQuery && matchesStatus;
      })
    : [];

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setCurrentUserEmail(data.user.email || "");
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
    setCheckedMaterialIds(new Set(rows.filter((r) => r.checked === true).map((r) => r.material_id)));
    setMaterialsSavedMontator(rows.some((r) => r.saved === true));
    setMaterialsSavedElectrician(rows.some((r) => r.saved === true));
  }

  useEffect(() => {
    if (materials.length === 0 || projectMaterials.length === 0) return;
    const montatorIds = new Set(materials.filter((m) => m.role === "montator").map((m) => m.id));
    const electricianIds = new Set(materials.filter((m) => m.role === "electrician").map((m) => m.id));
    const montatorRows = projectMaterials.filter((pm) => montatorIds.has(pm.material_id));
    const electricianRows = projectMaterials.filter((pm) => electricianIds.has(pm.material_id));
    setMaterialsSavedMontator(montatorRows.some((r) => r.saved === true));
    setMaterialsSavedElectrician(electricianRows.some((r) => r.saved === true));
  }, [materials, projectMaterials]);

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

  async function openProjectModal(projectId: string, isSuperAdminUser: boolean) {
    setLoadingProject(true);
    setOpen(true);
    await Promise.all([
      loadProjectMaterials(projectId),
      loadMontajImages(projectId),
      ...(isSuperAdminUser ? [loadHistory(projectId)] : []),
    ]);
    setLoadingProject(false);
  }

  useEffect(() => {
    loadProjects();
    loadMaterials();
    loadMontajCategories();
  }, []);

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
      openProjectModal(p.id, isSuperAdmin);
    };
    tryOpen();
  }, [searchParams]);

  const resetForm = () => {
    setForm({ client: "", phone: "", email: "", title: "", location: "", kw: "", battery: "", panels: "", inverter: "", notes: "", status: "Programat", roof_images: [], simulation_images: [] });
    setSelectedProject(null);
    setSelectedDate(null);
    setProjectMaterials([]);
    setQuantities({});
    setMaterialsSavedMontator(false);
    setMaterialsSavedElectrician(false);
    setActiveMaterialRole("montator");
    setMontajImages([]);
    setMontajSaved(false);
    setProjectFinalized(false);
    setOpen(false);
    setEditingMaterialId(null);
    setEditingCategoryId(null);
    setCollapsedCategories({});
    setProjectHistory([]);
    setShowHistory(false);
    router.replace("/projects");
  };

  const handleSave = async () => {
    const { error } = await supabase.from("projects").insert({ ...form, date: selectedDate }).select();
    if (error) { alert(error.message); return; }

    if (form.client.trim()) {
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", form.phone || "")
        .maybeSingle();

      if (!existing) {
        await supabase.from("clients").insert({
          name: form.client,
          phone: form.phone || null,
          email: form.email || null,
          address: form.location || null,
          data_montaj: selectedDate || null,
          status_montaj: "În așteptare",
          status: "Activ",
        });
      }
    }

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
    await logHistory(selectedProject.id, "✏️ Modificare date proiect");
    await loadHistory(selectedProject.id);
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

  const updateClientStatus = async (phone: string, status_montaj: string) => {
    await fetch("/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, status_montaj }),
    });
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

    await logHistory(selectedProject.id, "✅ Finalizare proiect");

    const { data: projectData } = await supabase
      .from("projects")
      .select("phone")
      .eq("id", selectedProject.id)
      .single();

    if (projectData?.phone) {
      await updateClientStatus(projectData.phone, "Efectuat");
    }

    setProjectFinalized(true);
    setForm((prev) => ({ ...prev, status: "Finalizat" }));
    await loadProjects();
  };

  const handleUnlockProject = async () => {
    if (!selectedProject?.id) return;
    if (!confirm("Deblochezi proiectul pentru modificare?")) return;

    const { error } = await supabase.from("projects").update({ status: "În lucru" }).eq("id", selectedProject.id);
    if (error) { alert("Eroare: " + error.message); return; }

    await logHistory(selectedProject.id, "🔓 Deblocare proiect");
    await loadHistory(selectedProject.id);

    const { data: projectData } = await supabase
      .from("projects")
      .select("phone")
      .eq("id", selectedProject.id)
      .single();

    if (projectData?.phone) {
      await updateClientStatus(projectData.phone, "În așteptare");
    }

    setProjectFinalized(false);
    setForm((prev) => ({ ...prev, status: "În lucru" }));
    await loadProjects();
  };

  const logHistory = async (projectId: string, action: string, changes?: object) => {
    await supabase.from("project_history").insert({
      project_id: projectId,
      modified_by: currentUserEmail,
      action,
      changes: changes || null,
    });
  };

  const loadHistory = async (projectId: string) => {
    const { data } = await supabase
      .from("project_history")
      .select("*")
      .eq("project_id", projectId)
      .order("modified_at", { ascending: false });
    setProjectHistory(data || []);
  };

  const handleAddMaterial = async () => {
    const name = newMaterialName.trim();
    if (!name) return;
    const { error } = await supabase.from("materials").insert({ name, unit: newMaterialUnit, role: activeMaterialRole });
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

  const toggleMaterialChecked = useCallback(
    async (materialId: string, currentProjectMaterials: ProjectMaterial[]) => {
      if (!selectedProject?.id) return;
      // Bifa e doar intr-un sens — se poate seta, nu debifa manual


      setCheckedMaterialIds((prev) => {
        const next = new Set(prev);
        next.add(materialId);
        return next;
      });

      const existing = currentProjectMaterials.find((pm) => pm.material_id === materialId);
      if (existing?.id) {
        await supabase.from("project_materials").update({ checked: true }).eq("id", existing.id);
      } else {
        // Materialul nu are încă rând în project_materials (cantitate neintrodusă) — îl creăm cu quantity ""
        const { data } = await supabase.from("project_materials")
          .insert({ project_id: selectedProject.id, material_id: materialId, quantity: "", saved: false, checked: true })
          .select().single();
        if (data) setProjectMaterials((prev) => [...prev, data]);
      }
    },
    [selectedProject, checkedMaterialIds]
  );

  // ── LOGICA DE STOC ──────────────────────────────────────────────────────────
  //
  // La salvare: calculăm diferența față de ce era salvat anterior și scădem
  // doar diferența din stoc. Exemplu:
  //   - Prima dată salvăm 5 → stoc scade cu 5
  //   - Deblocăm și schimbăm în 7 → stoc scade cu 2 (diferența)
  //   - Deblocăm și schimbăm în 3 → stocul se reface cu 2 (diferența negativă)
  //
  // La deblocare: refacem stocul cu cantitățile care erau salvate (le readăugăm).
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSaveMaterials = async (role: MaterialRole) => {
    if (!selectedProject?.id) return;
    const roleMaterials = materials.filter((m) => m.role === role);

    // Calculăm diferențele față de valorile anterior salvate
    const stockUpdates: { material_id: string; delta: number }[] = [];

    // Verificăm stocul disponibil înainte de salvare
    const insufficientMaterials: string[] = [];
    for (const mat of roleMaterials) {
      const newQty = parseFloat(quantities[mat.id] || "0") || 0;
      const existing = projectMaterials.find((pm) => pm.material_id === mat.id);
      const prevQty = existing?.saved ? parseFloat(existing.quantity || "0") || 0 : 0;
      const delta = newQty - prevQty;
      if (delta > 0) {
        // Verificăm stocul curent din materiale
        const currentMat = materials.find((m) => m.id === mat.id);
        const currentStock = currentMat?.quantity ?? 0;
        if (delta > currentStock) {
          insufficientMaterials.push(`${mat.name}: necesar ${delta} ${mat.unit}, disponibil ${currentStock} ${mat.unit}`);
        }
      }
    }

    if (insufficientMaterials.length > 0) {
      alert(`❌ Stoc insuficient pentru:\n\n${insufficientMaterials.join("\n")}\n\nReduceți cantitățile sau aprovizionați stocul.`);
      return;
    }

    for (const mat of roleMaterials) {
      const newQty = parseFloat(quantities[mat.id] || "0") || 0;
      const existing = projectMaterials.find((pm) => pm.material_id === mat.id);
      // Cantitatea anterioară salvată (dacă există și era marcată ca saved)
      const prevQty = existing?.saved ? parseFloat(existing.quantity || "0") || 0 : 0;
      const delta = newQty - prevQty;
      if (delta !== 0) {
        stockUpdates.push({ material_id: mat.id, delta });
      }
    }

    // Salvăm materialele proiectului
    const upsertData = roleMaterials.map((m) => ({
      project_id: selectedProject.id!,
      material_id: m.id,
      quantity: quantities[m.id] || "",
      saved: true,
      saved_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("project_materials")
      .upsert(upsertData, { onConflict: "project_id,material_id" });

    if (error) { alert("Eroare la salvare: " + error.message); return; }

    // Actualizăm stocul pentru fiecare material cu diferența calculată
    for (const { material_id, delta } of stockUpdates) {
      // Fetch cantitate curentă din stoc
      const { data: stockRow } = await supabase
        .from("materials")
        .select("quantity")
        .eq("id", material_id)
        .single();

      if (stockRow) {
        const currentStock = parseFloat(stockRow.quantity) || 0;
        const newStock = currentStock - delta; // delta validat anterior, stocul nu poate fi negativ
        await supabase
          .from("materials")
          .update({ quantity: newStock })
          .eq("id", material_id);

        // Înregistrăm mișcarea în stock_movements
        await supabase.from("stock_movements").insert({
          material_id,
          project_id: selectedProject.id,
          quantity_change: -delta, // negativ = ieșire din stoc
          type: "consum_proiect",
          note: `Proiect: ${form.client} - ${form.title}`,
        });

        // Verificăm dacă stocul a scăzut sub pragul minim — trimitem notificare
        const matInfo = materials.find((m) => m.id === material_id);
        const minQty = matInfo?.min_quantity ?? 0;
        if (minQty > 0 && newStock <= minQty) {
          await supabase.from("notifications").insert({
            title: "⚠️ Stoc scăzut",
            message: `Materialul "${matInfo?.name}" a ajuns la ${newStock} ${matInfo?.unit} (prag minim: ${minQty} ${matInfo?.unit}). Aprovizionați stocul.`,
            project_id: selectedProject.id,
          });
        }
      }
    }

    if (role === "montator") setMaterialsSavedMontator(true);
    else setMaterialsSavedElectrician(true);

    await logHistory(
      selectedProject.id!,
      `💾 Materiale salvate (${role === "montator" ? "Montator" : "Electrician"})`
    );
    if (isSuperAdmin) await loadHistory(selectedProject.id!);

    setProjectMaterials((prev) =>
      prev.map((pm) => {
        const belongs = roleMaterials.some((m) => m.id === pm.material_id);
        return belongs ? { ...pm, saved: true } : pm;
      })
    );

    // Reîncărcăm materialele pentru a reflecta stocurile actualizate
    await loadMaterials();
  };

  const handleUnlockMaterials = async (role: MaterialRole) => {
    if (!selectedProject?.id) return;
    const roleMaterialIds = materials.filter((m) => m.role === role).map((m) => m.id);

    // Readăugăm în stoc cantitățile care fuseseră scăzute la salvare
    for (const mid of roleMaterialIds) {
      const row = projectMaterials.find((pm) => pm.material_id === mid);
      if (row?.id && row.saved) {
        const restoredQty = parseFloat(row.quantity || "0") || 0;
        if (restoredQty > 0) {
          const { data: stockRow } = await supabase
            .from("materials")
            .select("quantity")
            .eq("id", mid)
            .single();

          if (stockRow) {
            const currentStock = parseFloat(stockRow.quantity) || 0;
            await supabase
              .from("materials")
              .update({ quantity: currentStock + restoredQty })
              .eq("id", mid);

            // Înregistrăm mișcarea ca revenire în stoc
            await supabase.from("stock_movements").insert({
              material_id: mid,
              project_id: selectedProject.id,
              quantity_change: restoredQty, // pozitiv = intrare în stoc
              type: "ajustare",
              note: `Deblocare materiale proiect: ${form.client} - ${form.title}`,
            });
          }
        }

        await supabase
          .from("project_materials")
          .update({ saved: false, saved_at: null })
          .eq("id", row.id);
      }
    }

    if (role === "montator") setMaterialsSavedMontator(false);
    else setMaterialsSavedElectrician(false);

    setProjectMaterials((prev) =>
      prev.map((pm) => {
        const belongs = roleMaterialIds.includes(pm.material_id);
        return belongs ? { ...pm, saved: false } : pm;
      })
    );

    // Reîncărcăm materialele pentru stocuri actualizate
    await loadMaterials();
  };

  // ─────────────────────────────────────────────────────────────────────────────

  const handlePrintMaterials = (role: MaterialRole) => {
    const roleMaterials = materials.filter((m) => m.role === role);
    const roleLabel = role === "montator" ? "Montator" : "Electrician";
    const printContent = `
      <html><head><title>Materiale ${roleLabel} — ${form.client} / ${form.title}</title>
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
        <h1>Lista materiale ${roleLabel} — ${form.client || "—"}</h1>
        <p>Proiect: ${form.title || "—"} &nbsp;|&nbsp; Locație: ${form.location || "—"} &nbsp;|&nbsp; Data: ${selectedDate || "—"}</p>
        <table><thead><tr><th>#</th><th>Material</th><th>U.M.</th><th>Cantitate</th></tr></thead>
        <tbody>${roleMaterials.map((mat, i) => `<tr><td>${i + 1}</td><td>${mat.name}</td><td>${mat.unit}</td><td class="${quantities[mat.id] ? "qty" : "empty"}">${quantities[mat.id] || "—"}</td></tr>`).join("")}</tbody>
        </table></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownloadPDF = (role: MaterialRole) => {
    const roleMaterials = materials.filter((m) => m.role === role);
    const roleLabel = role === "montator" ? "Montator" : "Electrician";
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const colWidths = [10, 100, 25, 35];
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = (pageWidth - tableWidth) / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Lista materiale ${roleLabel} — ${form.client || "—"}`, margin, 20);
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
      roleMaterials.forEach((mat, idx) => {
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
      const fileName = `materiale-${roleLabel.toLowerCase()}-${(form.client || "proiect").replace(/\s+/g, "-").toLowerCase()}-${selectedDate || "fara-data"}.pdf`;
      doc.save(fileName);
    });
  };

  const handlePrintTotal = () => {
    const montatorMats = materials.filter((m) => m.role === "montator");
    const electricianMats = materials.filter((m) => m.role === "electrician");
    const buildTable = (mats: Material[]) =>
      mats.length === 0
        ? `<p style="color:#aaa;font-style:italic;font-size:13px;">Nu există materiale.</p>`
        : `<table><thead><tr><th>#</th><th>Material</th><th>U.M.</th><th>Cantitate</th></tr></thead>
           <tbody>${mats.map((mat, i) => `<tr><td>${i + 1}</td><td>${mat.name}</td><td>${mat.unit}</td><td class="${quantities[mat.id] ? "qty" : "empty"}">${quantities[mat.id] || "—"}</td></tr>`).join("")}</tbody></table>`;
    const printContent = `
      <html><head><title>Materiale Total — ${form.client} / ${form.title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 15px; margin: 24px 0 8px 0; color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 4px; }
        h2.electrician { color: #b45309; border-color: #b45309; }
        p.meta { font-size: 13px; color: #555; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-size: 13px; border: 1px solid #e5e7eb; }
        td { padding: 10px 12px; font-size: 13px; border: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f9fafb; }
        .qty { font-weight: bold; text-align: center; }
        .empty { color: #aaa; text-align: center; }
      </style></head><body>
        <h1>Lista materiale — ${form.client || "—"}</h1>
        <p class="meta">Proiect: ${form.title || "—"} &nbsp;|&nbsp; Locație: ${form.location || "—"} &nbsp;|&nbsp; Data: ${selectedDate || "—"}</p>
        <h2>🔩 Montator</h2>${buildTable(montatorMats)}
        <h2 class="electrician">⚡ Electrician</h2>${buildTable(electricianMats)}
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(printContent);
    win.document.close();
    win.focus();
    win.print();
  };

  const handleDownloadPDFTotal = () => {
    const montatorMats = materials.filter((m) => m.role === "montator");
    const electricianMats = materials.filter((m) => m.role === "electrician");
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const colWidths = [10, 100, 25, 35];
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = (pageWidth - tableWidth) / 2;
      const rowH = 9;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`Lista materiale — ${form.client || "—"}`, margin, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Proiect: ${form.title || "—"}   |   Locație: ${form.location || "—"}   |   Data: ${selectedDate || "—"}`, margin, 28);
      doc.setTextColor(0);
      const drawTable = (mats: Material[], startY: number): number => {
        let y = startY;
        doc.setFillColor(243, 244, 246);
        doc.rect(startX, y, tableWidth, rowH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        let x = startX;
        ["#", "Material", "U.M.", "Cantitate"].forEach((h, i) => { doc.text(h, x + 2, y + 6); x += colWidths[i]; });
        doc.setDrawColor(209, 213, 219);
        doc.rect(startX, y, tableWidth, rowH);
        doc.setFont("helvetica", "normal");
        mats.forEach((mat, idx) => {
          y += rowH;
          if (y + rowH > pageHeight - margin) { doc.addPage(); y = margin; }
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
        return y + rowH;
      };
      let y = 36;
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(29, 78, 216);
      doc.text("Montator", margin, y);
      doc.setDrawColor(29, 78, 216); doc.line(margin, y + 1, pageWidth - margin, y + 1);
      doc.setTextColor(0); y += 6;
      if (montatorMats.length === 0) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(150);
        doc.text("Nu există materiale.", margin, y + 6); doc.setTextColor(0); y += 14;
      } else { y = drawTable(montatorMats, y); }
      y += 8;
      if (y + 30 > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(180, 83, 9);
      doc.text("Electrician", margin, y);
      doc.setDrawColor(180, 83, 9); doc.line(margin, y + 1, pageWidth - margin, y + 1);
      doc.setTextColor(0); y += 6;
      if (electricianMats.length === 0) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(150);
        doc.text("Nu există materiale.", margin, y + 6); doc.setTextColor(0);
      } else { drawTable(electricianMats, y); }
      const fileName = `materiale-total-${(form.client || "proiect").replace(/\s+/g, "-").toLowerCase()}-${selectedDate || "fara-data"}.pdf`;
      doc.save(fileName);
    });
  };

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

  // Comprimă o imagine în browser (canvas) înainte de upload: max 2400px lățime/înălțime, calitate JPEG 90%.
  // Pentru fișiere care nu sunt imagine (ex: PDF) returnează fișierul original neschimbat.
  const compressImage = (file: File, maxDimension = 2400, quality = 0.9): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) { resolve(file); return; }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        if (width <= maxDimension && height <= maxDimension) { resolve(file); return; }
        if (width > height) { height = Math.round((height * maxDimension) / width); width = maxDimension; }
        else { width = Math.round((width * maxDimension) / height); height = maxDimension; }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            const compressedFile = new File([blob], file.name, { type: "image/jpeg" });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  };

  const uploadMontajImage = async (file: File, categoryId: string) => {
    if (!selectedProject?.id) return;
    setUploadingCategory(categoryId);
    const compressedFile = await compressImage(file);
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-");
    const fileName = `montaj/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("project-images").upload(fileName, compressedFile);
    if (error) { console.error(error); setUploadingCategory(null); return; }
    const { data } = supabase.storage.from("project-images").getPublicUrl(fileName);
    const { data: inserted, error: insertError } = await supabase
      .from("montaj_images")
      .insert({ project_id: selectedProject.id, category_id: categoryId, url: data.publicUrl, saved: false })
      .select().single();
    if (insertError) { console.error(insertError); setUploadingCategory(null); return; }
    if (inserted) setMontajImages((prev) => [...prev, inserted]);
    const catName = montajCategories.find((c) => c.id === categoryId)?.name || categoryId;
    await logHistory(selectedProject.id, `📸 Poză adăugată`, { categorie: catName });
    if (isSuperAdmin) await loadHistory(selectedProject.id);
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
    const compressedFile = await compressImage(file);
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-");
    const fileName = Date.now() + "-" + safeName;
    const { error } = await supabase.storage.from("project-images").upload(fileName, compressedFile);
    if (error) { console.error(error); return; }
    const { data } = supabase.storage.from("project-images").getPublicUrl(fileName);
    if (target === "roof") setForm((prev) => ({ ...prev, roof_images: [...prev.roof_images, data.publicUrl] }));
    if (target === "simulation") setForm((prev) => ({ ...prev, simulation_images: [...prev.simulation_images, data.publicUrl] }));
  };

  const handleCall = (phone: string) => { if (phone) window.location.href = `tel:${phone}`; };
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const handleMaps = (location: string) => {
    if (location) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, "_blank");
  };
  const handleWaze = (location: string) => {
    if (location) window.open(`https://waze.com/ul?q=${encodeURIComponent(location)}&navigate=yes`, "_blank");
  };
  const handleAppleMaps = (location: string) => {
    if (location) window.open(`https://maps.apple.com/?q=${encodeURIComponent(location)}`, "_blank");
  };

  const statusBadge = (status: string) => {
    if (status === "Finalizat") return "bg-green-500/20 text-green-400 border border-green-500/30";
    if (status === "În lucru") return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  };

  return (
    <AuthGuard>
      <div className="p-2 md:p-6">
        <style>{`
          .fc { -webkit-font-smoothing: antialiased; font-size: 14px; }
          .fc table { border-collapse: collapse; }
          .fc td, .fc th { border-width: 1px !important; border-color: #1e2a3a !important; }
          .fc .fc-scrollgrid { transform: translateZ(0); backface-visibility: hidden; background: #0d1b2a; border-color: #1e2a3a !important; }
          .fc .fc-scrollgrid-section > td { border-color: #1e2a3a !important; }
          .fc-theme-standard .fc-scrollgrid { border-color: #1e2a3a !important; }
          .fc .fc-daygrid-day { background: #0d1b2a; }
          .fc .fc-daygrid-day:hover { background: #112236; }
          .fc .fc-daygrid-day-number { font-size: 14px !important; font-weight: 600 !important; color: #94a3b8 !important; padding: 4px 6px !important; }
          .fc .fc-col-header-cell { background: #0a1628 !important; }
          .fc .fc-col-header-cell-cushion { font-size: 12px !important; font-weight: 700 !important; color: #3b82f6 !important; padding: 8px 4px !important; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none !important; }
          .fc .fc-toolbar { background: #0a1628; padding: 10px 4px; border-radius: 8px 8px 0 0; margin-bottom: 0 !important; }
          .fc .fc-toolbar-title { font-size: 16px !important; font-weight: 700 !important; color: #e2e8f0 !important; }
          .fc .fc-button { font-size: 12px !important; font-weight: 600 !important; padding: 5px 12px !important; background: #1e3a5f !important; border-color: #2563eb !important; color: #93c5fd !important; border-radius: 6px !important; }
          .fc .fc-button:hover { background: #2563eb !important; color: #fff !important; }
          .fc .fc-button-primary:not(:disabled).fc-button-active { background: #2563eb !important; color: #fff !important; }
          .fc .fc-event { background: linear-gradient(135deg, #1d4ed8, #2563eb) !important; border: none !important; border-radius: 4px !important; padding: 1px 4px !important; }
          .fc .fc-event-title { font-size: 11px !important; font-weight: 600 !important; color: #fff !important; }
          .fc .fc-day-today { background-color: #0f2744 !important; }
          .fc .fc-day-today .fc-daygrid-day-number { color: #60a5fa !important; font-weight: 800 !important; }
          .fc .fc-daygrid-day-number { text-decoration: none !important; }
          .fc a { color: inherit !important; }
          .fc .fc-popover { background: #0d1b2a !important; border-color: #1e3a5f !important; }
          .fc .fc-popover-title { background: #0a1628 !important; color: #e2e8f0 !important; }
          .fc .fc-popover-body { background: #0d1b2a !important; color: #e2e8f0 !important; }
          @media (max-width: 640px) {
            .fc .fc-toolbar-title { font-size: 14px !important; }
            .fc .fc-toolbar { gap: 6px !important; }
            .fc .fc-daygrid-day-number { font-size: 12px !important; }
            .fc .fc-col-header-cell-cushion { font-size: 10px !important; }
            .fc .fc-event-title { font-size: 10px !important; }
          }
          .drag-over { outline: 2px dashed #3b82f6 !important; outline-offset: -2px; background: #112236 !important; }
          .sb-modal::-webkit-scrollbar { width: 6px; }
          .sb-modal::-webkit-scrollbar-track { background: #0a1628; }
          .sb-modal::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 3px; }
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus {
            -webkit-box-shadow: 0 0 0 1000px #0d2137 inset !important;
            -webkit-text-fill-color: #e2e8f0 !important;
          }
        `}</style>

        {/* ── Search bar ── */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              className="w-full bg-[#0d1b2a] border border-[#1e3a5f] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 pl-9 pr-8 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition"
              placeholder="Caută după client, locație, titlu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                onClick={() => setSearchQuery("")}
              >✕</button>
            )}
          </div>
          <select
            className="bg-[#0d1b2a] border border-[#1e3a5f] focus:border-blue-500 text-slate-200 text-sm rounded-xl px-3 py-2.5 outline-none transition shrink-0"
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
          >
            <option value="">Toate</option>
            <option value="Programat">Programat</option>
            <option value="În lucru">În lucru</option>
            <option value="Finalizat">Finalizat</option>
          </select>
        </div>

        {/* ── Search results ── */}
        {(searchQuery || searchStatus) && (
          <div className="mb-4 flex flex-col gap-2">
            {searchResults.length === 0 ? (
              <p className="text-slate-500 text-sm italic px-1">Niciun proiect găsit.</p>
            ) : (
              <>
                <p className="text-xs text-slate-500 px-1">{searchResults.length} proiect{searchResults.length !== 1 ? "e" : ""} găsit{searchResults.length !== 1 ? "e" : ""}</p>
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    className="flex items-center justify-between bg-[#0d1b2a] border border-[#1e3a5f] hover:border-blue-500/50 hover:bg-[#0f2235] rounded-xl px-4 py-3 transition text-left w-full"
                    onClick={() => {
                      setSelectedProject(p);
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
                      setActiveMaterialRole("montator");
                      openProjectModal(p.id!, isSuperAdmin);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-200 text-sm">{p.client}{p.title ? ` — ${p.title}` : ""}</p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {p.location && <p className="text-xs text-slate-500">📍 {p.location}</p>}
                        {p.date && <p className="text-xs text-slate-500">📅 {p.date}</p>}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-3 ${statusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-[#1e2a3a] shadow-2xl">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="auto"
            locale={roLocale}
            events={events}
            dateClick={(info) => {
              if (!isAdmin) return;
              setSelectedProject(null); setSelectedDate(info.dateStr);
              setProjectMaterials([]); setQuantities({});
              setMaterialsSavedMontator(false); setMaterialsSavedElectrician(false);
              setActiveMaterialRole("montator");
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
              setActiveMaterialRole("montator");
              openProjectModal(info.event.id, isSuperAdmin);
            }}
          />
        </div>

        {open && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setOpen(false)} />

            <div className="sb-modal relative bg-[#0d1b2a] rounded-2xl border border-[#1e3a5f] w-[95vw] md:w-[900px] max-h-[90vh] overflow-y-auto z-[10000] shadow-[0_0_60px_rgba(37,99,235,0.15)]">
              {loadingProject ? (
                <SolarLoader />
              ) : (
              <>
              <div className="sticky top-0 z-10 flex justify-between items-center px-5 py-4 bg-[#0a1628] border-b border-[#1e3a5f] rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#facc15] to-[#f59e0b] flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.4)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="5" fill="#0a1628"/>
                      <g stroke="#0a1628" strokeWidth="2" strokeLinecap="round">
                        <line x1="12" y1="2" x2="12" y2="5"/>
                        <line x1="12" y1="19" x2="12" y2="22"/>
                        <line x1="2" y1="12" x2="5" y2="12"/>
                        <line x1="19" y1="12" x2="22" y2="12"/>
                        <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/>
                        <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/>
                        <line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/>
                        <line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/>
                      </g>
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-white leading-tight">
                      {selectedProject ? "Detalii proiect" : "Proiect nou"}
                    </h2>
                    {selectedDate && (
                      <p className="text-xs text-blue-400 font-medium">{selectedDate}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {form.status && selectedProject && (
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusBadge(form.status)}`}>
                      {form.status}
                    </span>
                  )}
                  <button
                    onClick={resetForm}
                    className="text-slate-400 hover:text-white hover:bg-[#1e3a5f] w-8 h-8 rounded-full flex items-center justify-center transition text-lg font-bold shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-4 md:p-5 space-y-3">

                {selectedProject && (form.phone || form.location) && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {form.phone && (
                      <button
                        className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg font-medium hover:bg-green-500/20 transition text-sm"
                        onClick={() => handleCall(form.phone)}
                      >
                        📞 {form.phone}
                      </button>
                    )}
                    {form.location && (
                      <div className="relative">
                        <button
                          className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-2 rounded-lg font-medium hover:bg-blue-500/20 transition text-sm"
                          onClick={() => setNavMenuOpen((v) => !v)}
                        >
                          📍 {form.location}
                          <span className="text-blue-400/50 text-xs">▾</span>
                        </button>
                        {navMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-[999]" onClick={() => setNavMenuOpen(false)} />
                            <div className="absolute left-0 top-full mt-1 z-[1000] bg-[#0d1b2a] border border-[#1e3a5f] rounded-xl shadow-2xl overflow-hidden min-w-[180px]">
                              <button
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-[#1e3a5f] transition text-left"
                                onClick={() => { handleMaps(form.location); setNavMenuOpen(false); }}
                              >
                                🗺️ Google Maps
                              </button>
                              <button
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-[#1e3a5f] transition text-left border-t border-[#1e3a5f]"
                                onClick={() => { handleWaze(form.location); setNavMenuOpen(false); }}
                              >
                                🚗 Waze
                              </button>
                              <button
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-[#1e3a5f] transition text-left border-t border-[#1e3a5f]"
                                onClick={() => { handleAppleMaps(form.location); setNavMenuOpen(false); }}
                              >
                                🍎 Apple Maps
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {(() => {
                  const sectionHeader = (icon: string, label: string, open: boolean, toggle: () => void) => (
                    <button
                      className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl bg-[#0a1628] border border-[#1e3a5f] hover:border-blue-500/50 hover:bg-[#0f2235] transition-all text-sm font-semibold text-slate-300"
                      onClick={toggle}
                    >
                      <span className="flex items-center gap-2">{icon} {label}</span>
                      <span className="text-blue-500 text-xs">{open ? "▲" : "▼"}</span>
                    </button>
                  );

                  const fieldDisplay = (label: string, value: string, colSpan?: boolean) => (
                    <div className={`p-3 bg-[#0a1628] rounded-xl border border-[#1e3a5f] ${colSpan ? "col-span-1 sm:col-span-2" : ""}`}>
                      <p className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">{label}</p>
                      <p className="font-semibold text-slate-200 text-sm leading-relaxed">{value || "—"}</p>
                    </div>
                  );

                  const inputClass = "bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 p-3 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition w-full";
                  const selectClass = "bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-3 rounded-xl text-sm text-slate-200 outline-none transition w-full";

                  return (
                    <>
                      {sectionHeader("📋", "Date Client", showClient, () => setShowClient(!showClient))}
                      {showClient && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
                          {isAdmin && !projectFinalized ? (
                            <>
                              <input className={inputClass} placeholder="Client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
                              <input className={inputClass} placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                              <input className={inputClass} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                              <input className={inputClass} placeholder="Locație" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                            </>
                          ) : (
                            <>
                              {fieldDisplay("Client", form.client)}
                              {fieldDisplay("Telefon", form.phone)}
                              {fieldDisplay("Email", form.email)}
                              {fieldDisplay("Locație", form.location)}
                            </>
                          )}
                        </div>
                      )}

                      {sectionHeader("⚡", "Date Tehnice", showTechnical, () => setShowTechnical(!showTechnical))}
                      {showTechnical && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
                          {isAdmin && !projectFinalized ? (
                            <>
                              <input className={inputClass} placeholder="Titlu proiect" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                              <input className={inputClass} placeholder="kW" value={form.kw} onChange={(e) => setForm({ ...form, kw: e.target.value })} />
                              <input className={inputClass} placeholder="Panouri" value={form.panels} onChange={(e) => setForm({ ...form, panels: e.target.value })} />
                              <input className={inputClass} placeholder="Invertor" value={form.inverter} onChange={(e) => setForm({ ...form, inverter: e.target.value })} />
                              <input className={inputClass} placeholder="Baterie" value={form.battery} onChange={(e) => setForm({ ...form, battery: e.target.value })} />
                              <select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                <option>Programat</option>
                                <option>În lucru</option>
                                <option>Finalizat</option>
                              </select>
                              <textarea
                                className={`${inputClass} col-span-1 sm:col-span-2 resize-none`}
                                placeholder="Observații"
                                rows={4}
                                value={form.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                              />
                            </>
                          ) : (
                            <>
                              {fieldDisplay("Titlu proiect", form.title)}
                              {fieldDisplay("kW", form.kw)}
                              {fieldDisplay("Panouri", form.panels)}
                              {fieldDisplay("Invertor", form.inverter)}
                              {fieldDisplay("Baterie", form.battery)}
                              {fieldDisplay("Status", form.status)}
                              <div className="col-span-1 sm:col-span-2 p-3 bg-[#0a1628] rounded-xl border border-[#1e3a5f]">
                                <p className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest mb-1">Observații</p>
                                <p className="font-semibold text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{form.notes || "—"}</p>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {sectionHeader("🏠", "Poze Acoperiș", showRoof, () => setShowRoof(!showRoof))}
                      {showRoof && (
                        <div className="px-1">
                          {isAdmin && !projectFinalized && (
                            <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition mb-3">
                              📁 Adaugă poze acoperiș
                              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadImage(file, "roof"); }} />
                            </label>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            {form.roof_images.map((img, i) => (
                              <img key={img} src={img} alt="" loading="lazy" onClick={() => { setLightboxImages(form.roof_images); setActiveIndex(i); setLightboxCanDelete(isAdmin && !projectFinalized); setLightboxCategoryId(null); setOpenLightbox(true); }}
                                className="rounded-xl border border-[#1e3a5f] h-28 w-full object-cover cursor-pointer hover:border-blue-500/50 transition" />
                            ))}
                          </div>
                        </div>
                      )}

                      {sectionHeader("☀️", "Simulare Panouri", showSimulation, () => setShowSimulation(!showSimulation))}
                      {showSimulation && (
                        <div className="px-1">
                          {isAdmin && !projectFinalized && (
                            <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition mb-3">
                              📁 Adaugă simulare
                              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadImage(file, "simulation"); e.target.value = ""; }} />
                            </label>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            {form.simulation_images.map((img) => {
                              const isPdf = img.toLowerCase().endsWith(".pdf");
                              if (isPdf) {
                                const fileName = img.split("/").pop() || "fisier.pdf";
                                return (
                                  <div key={img} className="relative group">
                                    <a
                                      href={img}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-xl border border-[#1e3a5f] h-28 w-full flex flex-col items-center justify-center gap-1 bg-[#0a1628] hover:border-blue-500/50 transition p-2 text-center"
                                    >
                                      <span className="text-2xl">📄</span>
                                      <span className="text-[10px] text-slate-400 break-all line-clamp-2">{fileName}</span>
                                    </a>
                                    {isAdmin && !projectFinalized && (
                                      <button
                                        className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 text-xs font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center backdrop-blur-sm"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteImage(img, "simulation"); }}
                                      >✕</button>
                                    )}
                                  </div>
                                );
                              }
                              const imageOnlyList = form.simulation_images.filter((i) => !i.toLowerCase().endsWith(".pdf"));
                              const imgIndex = imageOnlyList.indexOf(img);
                              return (
                                <img key={img} src={img} alt="" loading="lazy" onClick={() => { setLightboxImages(imageOnlyList); setActiveIndex(imgIndex); setLightboxCanDelete(isAdmin && !projectFinalized); setLightboxCategoryId(null); setOpenLightbox(true); }}
                                  className="rounded-xl border border-[#1e3a5f] h-28 w-full object-cover cursor-pointer hover:border-blue-500/50 transition" />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {selectedProject && (
                  <>
                    <button
                      className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl bg-[#0a1628] border border-[#1e3a5f] hover:border-blue-500/50 hover:bg-[#0f2235] transition-all text-sm font-semibold text-slate-300"
                      onClick={() => setShowMontaj(!showMontaj)}
                    >
                      <span className="flex items-center gap-2">📸 Poze Montaj</span>
                      <span className="text-blue-500 text-xs">{showMontaj ? "▲" : "▼"}</span>
                    </button>
                    {showMontaj && (
                      <div className="px-1 space-y-3">
                        {isAdmin && !projectFinalized && (
                          <div className="flex gap-2">
                            <input
                              className="bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition flex-1"
                              placeholder="Nume categorie (ex: Poze panouri)"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }}
                            />
                            <button
                              className="bg-green-500/20 border border-green-500/40 text-green-400 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-green-500/30 transition whitespace-nowrap"
                              onClick={handleAddCategory}
                            >
                              + Categorie
                            </button>
                          </div>
                        )}
                        {isAdmin && montajCategories.length > 1 && (
                          <p className="text-xs text-slate-500 italic">💡 Trage categoriile pentru a le reordona, sau folosește săgețile ↑↓</p>
                        )}
                        {montajCategories.length === 0 ? (
                          <p className="text-sm text-slate-500 italic">
                            {isAdmin ? "Nu există categorii. Adaugă prima categorie mai sus." : "Nu există categorii de poze definite."}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {montajCategories.map((cat, catIndex) => {
                              const catImages = montajImages.filter((img) => img.category_id === cat.id);
                              const isCollapsed = collapsedCategories[cat.id] ?? false;
                              const isEditingThis = editingCategoryId === cat.id;
                              return (
                                <div
                                  key={cat.id}
                                  className="border border-[#1e3a5f] rounded-xl overflow-hidden transition-all"
                                  draggable={isAdmin && !projectFinalized}
                                  onDragStart={() => handleDragStart(cat.id)}
                                  onDragOver={(e) => { handleDragOver(e, cat.id); (e.currentTarget as HTMLElement).classList.add("drag-over"); }}
                                  onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("drag-over")}
                                  onDrop={(e) => { (e.currentTarget as HTMLElement).classList.remove("drag-over"); handleDrop(); }}
                                >
                                  <div className="flex items-center bg-[#0a1628] px-3 py-2.5 gap-2">
                                    {isAdmin && !projectFinalized && (
                                      <span className="text-slate-600 cursor-grab active:cursor-grabbing text-lg select-none shrink-0">⠿</span>
                                    )}
                                    {isAdmin && !projectFinalized && isEditingThis ? (
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <input
                                          className="bg-[#0d2137] border border-blue-500 p-1.5 rounded-lg text-sm text-slate-200 flex-1 min-w-0 outline-none"
                                          value={editingCategoryName}
                                          onChange={(e) => setEditingCategoryName(e.target.value)}
                                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveEditCategory(cat.id); if (e.key === "Escape") setEditingCategoryId(null); }}
                                          autoFocus
                                        />
                                        <button className="bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-semibold hover:bg-blue-500 whitespace-nowrap" onClick={() => handleSaveEditCategory(cat.id)}>✓</button>
                                        <button className="bg-[#1e3a5f] text-slate-300 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-[#2a4a6f]" onClick={() => setEditingCategoryId(null)}>✕</button>
                                      </div>
                                    ) : (
                                      <button
                                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                                        onClick={() => setCollapsedCategories((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                                      >
                                        <span className="font-semibold text-sm text-slate-200 break-words min-w-0">{cat.name}</span>
                                        <span className="text-xs text-slate-500 shrink-0">({catImages.length} poze)</span>
                                        <span className="text-blue-500 text-xs ml-auto shrink-0">{isCollapsed ? "▼" : "▲"}</span>
                                      </button>
                                    )}
                                    {isAdmin && !projectFinalized && !isEditingThis && (
                                      <div className="flex items-center gap-1 shrink-0 ml-1">
                                        <button className="text-slate-500 hover:text-slate-300 font-bold px-1 disabled:opacity-20" onClick={() => moveCategoryUp(catIndex)} disabled={catIndex === 0}>↑</button>
                                        <button className="text-slate-500 hover:text-slate-300 font-bold px-1 disabled:opacity-20" onClick={() => moveCategoryDown(catIndex)} disabled={catIndex === montajCategories.length - 1}>↓</button>
                                        <button className="text-blue-400 hover:text-blue-300 text-sm font-bold px-1" onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}>✏️</button>
                                        <button className="text-red-400 hover:text-red-300 text-sm font-bold px-1" onClick={() => handleDeleteCategory(cat.id)}>✕</button>
                                      </div>
                                    )}
                                  </div>
                                  {!isCollapsed && (
                                    <div className="p-3 bg-[#0d1b2a]">
                                      {!montajSaved && !projectFinalized && (
                                        <label className="inline-flex items-center gap-2 cursor-pointer bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition mb-3">
                                          {uploadingCategory === cat.id ? "⏳ Se încarcă..." : "📷 Adaugă poze"}
                                          <input
                                            type="file" accept="image/*" multiple className="hidden"
                                            disabled={uploadingCategory !== null}
                                            onChange={async (e) => {
                                              const files = Array.from(e.target.files || []);
                                              for (const file of files) await uploadMontajImage(file, cat.id);
                                              e.target.value = "";
                                            }}
                                          />
                                        </label>
                                      )}
                                      {catImages.length === 0 ? (
                                        <p className="text-xs text-slate-500 italic">Nu există poze în această categorie.</p>
                                      ) : (
                                        <div className="grid grid-cols-3 gap-2">
                                          {catImages.map((img, i) => (
                                            <div key={img.id} className="relative group">
                                              <img
                                                src={img.url} alt="" loading="lazy"
                                                className="rounded-xl border border-[#1e3a5f] h-28 w-full object-cover cursor-pointer hover:border-blue-500/50 transition"
                                                onClick={() => { setLightboxImages(catImages.map((ci) => ci.url)); setActiveIndex(i); setLightboxCanDelete(!montajSaved && !projectFinalized); setLightboxCategoryId(cat.id); setOpenLightbox(true); }}
                                              />
                                              {!montajSaved && !projectFinalized && (
                                                <button
                                                  className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 text-xs font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center backdrop-blur-sm"
                                                  onClick={(e) => { e.stopPropagation(); deleteMontajImage(img.id); }}
                                                >✕</button>
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
                        <div className="flex flex-wrap gap-2 items-center pt-1">
                          {!montajSaved && !projectFinalized && (
                            <button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition" onClick={handleSaveMontaj}>
                              💾 Salvează poze montaj
                            </button>
                          )}
                          {montajSaved && <span className="text-sm text-green-400 font-semibold">✅ Poze montaj salvate</span>}
                          {montajSaved && isAdmin && !projectFinalized && (
                            <button className="bg-orange-500/20 border border-orange-500/40 text-orange-400 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-orange-500/30 transition" onClick={handleUnlockMontaj}>
                              🔓 Deblochează pentru modificare
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedProject && (
                  <>
                    <button
                      className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl bg-[#0a1628] border border-[#1e3a5f] hover:border-blue-500/50 hover:bg-[#0f2235] transition-all text-sm font-semibold text-slate-300"
                      onClick={() => setShowMaterials(!showMaterials)}
                    >
                      <span className="flex items-center gap-2">🔧 Materiale folosite</span>
                      <span className="text-blue-500 text-xs">{showMaterials ? "▲" : "▼"}</span>
                    </button>
                    {showMaterials && (
                      <div className="px-1 space-y-3">
                        <div className="flex border-b border-[#1e3a5f]">
                          <button
                            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeMaterialRole === "montator" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
                            onClick={() => { setActiveMaterialRole("montator"); setEditingMaterialId(null); }}
                          >
                            🔩 Montator
                          </button>
                          <button
                            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeMaterialRole === "electrician" ? "border-yellow-500 text-yellow-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}
                            onClick={() => { setActiveMaterialRole("electrician"); setEditingMaterialId(null); }}
                          >
                            ⚡ Electrician
                          </button>
                        </div>

                        {isAdmin && !projectFinalized && (
                          <div className="flex flex-wrap gap-2">
                            <input
                              className="bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 outline-none transition flex-1 min-w-[150px]"
                              placeholder={`Nume material ${activeMaterialRole === "montator" ? "montator" : "electrician"}`}
                              value={newMaterialName}
                              onChange={(e) => setNewMaterialName(e.target.value)}
                            />
                            <input
                              className="bg-[#0d2137] border border-[#1e3a5f] focus:border-blue-500 p-2.5 rounded-xl text-sm text-slate-200 outline-none transition w-20"
                              placeholder="U.M."
                              value={newMaterialUnit}
                              onChange={(e) => setNewMaterialUnit(e.target.value)}
                            />
                            <button
                              className="bg-green-500/20 border border-green-500/40 text-green-400 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-green-500/30 transition"
                              onClick={handleAddMaterial}
                            >
                              + Adaugă
                            </button>
                          </div>
                        )}

                        {activeMaterials.length === 0 ? (
                          <p className="text-sm text-slate-500 italic">
                            {isAdmin
                              ? `Nu există materiale pentru ${activeMaterialRole === "montator" ? "Montator" : "Electrician"}.`
                              : `Nu există materiale definite.`}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {activeMaterials.map((mat) => {
                              const isChecked = checkedMaterialIds.has(mat.id);
                              const hasQty = (parseFloat(quantities[mat.id] || "0") || 0) > 0;
                              const isCompleted = isChecked && hasQty;
                              return (
                              <div
                                key={mat.id}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-colors ${
                                  isCompleted
                                    ? "bg-green-500/10 border-green-500/40"
                                    : "bg-[#0a1628] border-[#1e3a5f]"
                                }`}
                              >
                                {isAdmin && !projectFinalized && editingMaterialId === mat.id ? (
                                  <>
                                    <input className="bg-[#0d2137] border border-blue-500 p-1.5 rounded-lg text-sm text-slate-200 flex-1 min-w-0 outline-none" value={editingMaterialName} onChange={(e) => setEditingMaterialName(e.target.value)} autoFocus />
                                    <input className="bg-[#0d2137] border border-blue-500 p-1.5 rounded-lg text-sm text-slate-200 w-16 outline-none" value={editingMaterialUnit} onChange={(e) => setEditingMaterialUnit(e.target.value)} />
                                    <button className="bg-blue-600 text-white px-2 py-1 rounded-lg text-xs font-semibold hover:bg-blue-500 whitespace-nowrap" onClick={() => handleSaveEditMaterial(mat.id)}>✓</button>
                                    <button className="bg-[#1e3a5f] text-slate-300 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-[#2a4a6f]" onClick={() => setEditingMaterialId(null)}>✕</button>
                                  </>
                                ) : (
                                  <>
                                   <span className="flex-1 text-sm font-medium text-slate-200 min-w-0 flex items-center gap-2">
                                    {/* Thumbnail poză material */}
                                    {mat.photo_url ? (
                                      <button
                                        onClick={() => setMaterialLightboxUrl(mat.photo_url!)}
                                        className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-[#1e3a5f] hover:border-blue-500/50 transition"
                                        title="Mărește poza"
                                      >
                                        <img src={mat.photo_url} alt={mat.name} className="w-full h-full object-cover" />
                                      </button>
                                    ) : (
                                      <div className="shrink-0 w-10 h-10 rounded-lg border border-[#1e3a5f] bg-[#0a1628] flex items-center justify-center text-slate-600 text-xs">📦</div>
                                    )}
                                    <span className="min-w-0">
                                      <span className={`block ${isCompleted ? "text-green-400" : ""}`}>{mat.name}</span>
                                      {mat.code && <span className="text-blue-400/70 font-mono text-xs">#{mat.code}</span>}
                                      <span className="text-slate-500 text-xs block">({mat.unit})</span>
                                      {mat.quantity !== undefined && (
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                          mat.quantity <= (mat.min_quantity ?? 0)
                                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                            : "bg-slate-700/50 text-slate-400"
                                        }`}>
                                          Stoc: {mat.quantity} {mat.unit}
                                        </span>
                                      )}
                                    </span>
                                  </span>
                                    <input
                                      type="number" min="0"
                                      className={`border p-2 rounded-xl text-sm text-center w-20 shrink-0 outline-none transition ${(materialsSaved && !isAdmin) || projectFinalized ? "bg-[#0a1628] border-[#1e3a5f] text-slate-500 cursor-not-allowed" : "bg-[#0d2137] border-[#1e3a5f] text-slate-200 focus:border-blue-500"}`}
                                      placeholder="0"
                                      value={quantities[mat.id] || ""}
                                      disabled={(materialsSaved && !isAdmin) || projectFinalized}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setQuantities((prev) => ({ ...prev, [mat.id]: val }));
                                        // Resetează bifa când valoarea se modifică
                                        if (checkedMaterialIds.has(mat.id)) {
                                          setCheckedMaterialIds((prev) => {
                                            const next = new Set(prev);
                                            next.delete(mat.id);
                                            return next;
                                          });
                                          // Salvează debifat în baza de date
                                          const existing = projectMaterials.find((pm) => pm.material_id === mat.id);
                                          if (existing?.id) {
                                            supabase.from("project_materials").update({ checked: false }).eq("id", existing.id);
                                          }
                                        }
                                        if (debounceRef.current) clearTimeout(debounceRef.current);
                                        debounceRef.current = setTimeout(() => autoSaveQuantity(mat.id, val, projectMaterials), 1000);
                                      }}
                                    />
                                    <span className="text-xs text-slate-500 w-8 shrink-0">{mat.unit}</span>
                                    <button
                                      type="button"
                                      title={isChecked ? "Bifat ✓" : "Marchează ca verificat"}
                                      disabled={projectFinalized || isChecked}
                                      onClick={() => toggleMaterialChecked(mat.id, projectMaterials)}
                                      className={`shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center text-sm font-bold transition ${
                                        isChecked
                                          ? "bg-green-500/20 border-green-500/50 text-green-400"
                                          : "bg-[#0a1628] border-[#1e3a5f] text-slate-600 hover:border-green-500/40 hover:text-green-500/60"
                                      } ${projectFinalized ? "cursor-not-allowed opacity-60" : ""}`}
                                    >
                                      ✓
                                    </button>
                                    {isAdmin && !projectFinalized && (
                                      <>
                                        <button className="text-blue-400 hover:text-blue-300 text-sm px-1 shrink-0" onClick={() => { setEditingMaterialId(mat.id); setEditingMaterialName(mat.name); setEditingMaterialUnit(mat.unit); }}>✏️</button>
                                        <button className="text-red-400 hover:text-red-300 text-sm px-1 shrink-0" onClick={() => handleDeleteMaterial(mat.id)}>✕</button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        )}

                        {autoSaving && <p className="text-xs text-slate-500 italic">⏳ Se salvează automat...</p>}

                        {activeMaterials.length > 0 && (
                          <div className="flex flex-wrap gap-2 items-center pt-1">
                            {!materialsSaved && !projectFinalized && (
                              <button
                                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
                                onClick={() => handleSaveMaterials(activeMaterialRole)}
                              >
                                💾 Salvează {activeMaterialRole === "montator" ? "Montator" : "Electrician"}
                              </button>
                            )}
                            {materialsSaved && (
                              <span className="text-sm text-green-400 font-semibold">
                                ✅ {activeMaterialRole === "montator" ? "Montator" : "Electrician"} salvat
                              </span>
                            )}
                            {materialsSaved && isAdmin && !projectFinalized && (
                              <button
                                className="bg-orange-500/20 border border-orange-500/40 text-orange-400 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-orange-500/30 transition"
                                onClick={() => handleUnlockMaterials(activeMaterialRole)}
                              >
                                🔓 Deblochează
                              </button>
                            )}
                            {isAdmin && (
                              <>
                                <button className="bg-[#1e3a5f] hover:bg-[#2a4a6f] text-slate-300 font-semibold px-4 py-2 rounded-xl text-sm transition" onClick={() => handlePrintMaterials(activeMaterialRole)}>🖨️ Printează</button>
                                <button className="bg-green-600/20 border border-green-600/40 text-green-400 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-green-600/30 transition" onClick={() => handleDownloadPDF(activeMaterialRole)}>⬇️ PDF</button>
                                <div className="w-px h-6 bg-[#1e3a5f] mx-1 hidden sm:block" />
                                <button className="bg-[#1e3a5f] hover:bg-[#2a4a6f] text-slate-300 font-semibold px-4 py-2 rounded-xl text-sm transition" onClick={handlePrintTotal}>🖨️ Print Total</button>
                                <button className="bg-green-600/20 border border-green-600/40 text-green-400 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-green-600/30 transition" onClick={handleDownloadPDFTotal}>⬇️ PDF Total</button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* ── ISTORIC MODIFICĂRI (doar superadmin) ── */}
                {isSuperAdmin && selectedProject && (
                  <>
                    <button
                      className="w-full text-left flex items-center justify-between px-4 py-3 rounded-xl bg-[#0a1628] border border-[#1e3a5f] hover:border-blue-500/50 hover:bg-[#0f2235] transition-all text-sm font-semibold text-slate-300"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <span className="flex items-center gap-2">🕓 Istoric modificări</span>
                      <span className="text-blue-500 text-xs">{showHistory ? "▲" : "▼"}</span>
                    </button>
                    {showHistory && (
                      <div className="px-1 space-y-2">
                        {projectHistory.length === 0 ? (
                          <p className="text-sm text-slate-500 italic">Nicio modificare înregistrată.</p>
                        ) : (
                          projectHistory.map((h) => (
                            <div key={h.id} className="flex flex-col gap-0.5 p-3 bg-[#0a1628] rounded-xl border border-[#1e3a5f]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm text-slate-200 font-medium">{h.action}</span>
                                <span className="text-xs text-slate-500 shrink-0">
                                  {new Date(h.modified_at).toLocaleDateString("ro-RO")} {new Date(h.modified_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <span className="text-xs text-blue-400">{h.modified_by}</span>
                              {h.changes && (
                                <span className="text-xs text-slate-500 mt-0.5">
                                  {Object.entries(h.changes).map(([k, v]) => `${k}: ${v}`).join(", ")}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="flex flex-wrap gap-2 pt-4 border-t border-[#1e3a5f]">
                  <button
                    className="bg-[#1e3a5f] hover:bg-[#2a4a6f] text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition"
                    onClick={resetForm}
                  >
                    Închide
                  </button>
                  {isAdmin && !selectedProject && (
                    <button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition" onClick={handleSave}>
                      Salvează
                    </button>
                  )}
                  {isAdmin && selectedProject && !projectFinalized && (
                    <>
                      <button className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition" onClick={handleUpdate}>
                        Actualizează
                      </button>
                      <button className="bg-red-500/20 border border-red-500/40 text-red-400 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-red-500/30 transition" onClick={handleDelete}>
                        Șterge
                      </button>
                    </>
                  )}
                  {isAdmin && selectedProject && projectFinalized && (
                    <button
                      className="bg-orange-500/20 border border-orange-500/40 text-orange-400 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-orange-500/30 transition"
                      onClick={handleUnlockProject}
                    >
                      🔓 Deblochează proiectul
                    </button>
                  )}
                </div>

                {selectedProject && !projectFinalized && (() => {
                  const canFinalize = materialsSavedMontator && materialsSavedElectrician && montajSaved;
                  const missingItems = [
                    !materialsSavedMontator && "materiale montator",
                    !materialsSavedElectrician && "materiale electrician",
                    !montajSaved && "poze montaj",
                  ].filter(Boolean).join(", ");

                  return (
                    <div className="flex flex-col gap-2">
                      <button
                        className={`w-full font-bold py-3 rounded-xl text-sm transition shadow-lg ${
                          canFinalize
                            ? "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-green-900/30"
                            : "bg-slate-700/50 border border-slate-600/50 text-slate-500 cursor-not-allowed shadow-none"
                        }`}
                        onClick={canFinalize ? handleFinalizeProject : undefined}
                        disabled={!canFinalize}
                      >
                        ✅ Finalizare proiect
                      </button>
                      {!canFinalize && (
                        <p className="text-xs text-yellow-500/80 text-center">
                          ⚠️ Salvează înainte de finalizare: {missingItems}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {selectedProject && projectFinalized && (
                  <div className="w-full bg-green-500/10 border border-green-500/30 text-green-400 font-semibold py-3 rounded-xl text-sm text-center">
                    ✅ Proiect finalizat
                  </div>
                )}

              </div>
              </>
              )}
            </div>
          </div>
        )}

        {/* Lightbox poză material */}
        {materialLightboxUrl && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center" onClick={() => setMaterialLightboxUrl(null)}>
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
            <div className="relative z-[100000] max-w-[90vw] max-h-[90vh]">
              <img src={materialLightboxUrl} alt="Material" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
              <button
                className="absolute top-3 right-3 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg hover:bg-black/80 transition"
                onClick={() => setMaterialLightboxUrl(null)}
              >✕</button>
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

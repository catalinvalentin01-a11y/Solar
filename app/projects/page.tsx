"use client";

import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
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

  // ================= ADMIN CHECK =================

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      setIsAdmin(email === ADMIN_EMAIL);
    };
    check();
  }, []);

  // ================= LOAD =================

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

  useEffect(() => {
    loadProjects();
  }, []);

  // ================= RESET =================

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
    setOpen(false);
  };

  // ================= CREATE =================

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

  // ================= UPDATE =================

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

  // ================= DELETE =================

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

  // ================= DELETE IMAGE =================

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

  // ================= UPLOAD =================

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

  // ================= HELPERS =================

  const handleCall = (phone: string) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  const handleMaps = (location: string) => {
    if (!location) return;
    const query = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  // ================= RENDER =================

  return (
    <AuthGuard>
      <div className="p-2 md:p-6">

        {/* CALENDAR */}
        <div className="overflow-x-auto">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            height="auto"
            events={events}
            dateClick={(info) => {
              // Doar adminul poate crea proiecte noi
              if (!isAdmin) return;
              setSelectedProject(null);
              setSelectedDate(info.dateStr);
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
              setOpen(true);
            }}
          />
        </div>

        {/* MODAL */}
        {open && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className="fixed inset-0 bg-black/60"
              onClick={() => setOpen(false)}
            />

            <div className="relative bg-white rounded-lg p-4 w-[95vw] md:w-[900px] max-h-[90vh] overflow-y-auto z-[10000]">

              {/* HEADER */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-xl">
                  {selectedProject ? "Detalii proiect" : "Proiect nou"}
                </h2>
                <span className="text-sm text-gray-500">{selectedDate}</span>
              </div>

              {/* BUTOANE RAPIDE: SUNĂ + GPS — vizibile pentru toți, când există proiect */}
              {selectedProject && (
                <div className="flex gap-3 mb-4">
                  {form.phone && (
                    <a
                      href={`tel:${form.phone}`}
                      className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition"
                    >
                      📞 Sună — {form.phone}
                    </a>
                  )}
                  {form.location && (
                    <button
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                      onClick={() => handleMaps(form.location)}
                    >
                      📍 GPS — {form.location}
                    </button>
                  )}
                </div>
              )}

              {/* ===== DATE CLIENT ===== */}
              <button
                className="w-full text-left font-bold bg-gray-100 p-3 rounded"
                onClick={() => setShowClient(!showClient)}
              >
                📋 Date Client
              </button>

              {showClient && (
                <div className="grid grid-cols-2 gap-2 p-2">
                  {isAdmin ? (
                    <>
                      <input
                        className="border p-2 rounded"
                        placeholder="Client"
                        value={form.client}
                        onChange={(e) => setForm({ ...form, client: e.target.value })}
                      />
                      <input
                        className="border p-2 rounded"
                        placeholder="Telefon"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                      <input
                        className="border p-2 rounded"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                      <input
                        className="border p-2 rounded"
                        placeholder="Locație"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                      />
                    </>
                  ) : (
                    <>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">Client</p>
                        <p className="font-medium">{form.client || "—"}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">Telefon</p>
                        <p className="font-medium">{form.phone || "—"}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">Email</p>
                        <p className="font-medium">{form.email || "—"}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">Locație</p>
                        <p className="font-medium">{form.location || "—"}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ===== DATE TEHNICE ===== */}
              <button
                className="w-full text-left font-bold bg-gray-100 p-3 rounded mt-3"
                onClick={() => setShowTechnical(!showTechnical)}
              >
                ⚡ Date Tehnice
              </button>

              {showTechnical && (
                <div className="grid grid-cols-2 gap-2 p-2">
                  {isAdmin ? (
                    <>
                      <input
                        className="border p-2 rounded"
                        placeholder="Titlu proiect"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                      <input
                        className="border p-2 rounded"
                        placeholder="kW"
                        value={form.kw}
                        onChange={(e) => setForm({ ...form, kw: e.target.value })}
                      />
                      <input
                        className="border p-2 rounded"
                        placeholder="Panouri"
                        value={form.panels}
                        onChange={(e) => setForm({ ...form, panels: e.target.value })}
                      />
                      <input
                        className="border p-2 rounded"
                        placeholder="Invertor"
                        value={form.inverter}
                        onChange={(e) => setForm({ ...form, inverter: e.target.value })}
                      />
                      <input
                        className="border p-2 rounded"
                        placeholder="Baterie"
                        value={form.battery}
                        onChange={(e) => setForm({ ...form, battery: e.target.value })}
                      />
                      <select
                        className="border p-2 rounded"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option>Programat</option>
                        <option>În lucru</option>
                        <option>Finalizat</option>
                      </select>
                      <textarea
                        className="border p-2 rounded col-span-2"
                        placeholder="Observații"
                        rows={4}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </>
                  ) : (
                    <>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">Titlu proiect</p>
                        <p className="font-medium">{form.title || "—"}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">kW</p>
                        <p className="font-medium">{form.kw || "—"}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">Panouri</p>
                        <p className="font-medium">{form.panels || "—"}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">Invertor</p>
                        <p className="font-medium">{form.inverter || "—"}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">Baterie</p>
                        <p className="font-medium">{form.battery || "—"}</p>
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="font-medium">{form.status || "—"}</p>
                      </div>
                      <div className="p-2 col-span-2">
                        <p className="text-xs text-gray-400">Observații</p>
                        <p className="font-medium whitespace-pre-wrap">{form.notes || "—"}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ===== POZE ACOPERIS ===== */}
              <button
                className="w-full text-left font-bold bg-gray-100 p-3 rounded mt-3"
                onClick={() => setShowRoof(!showRoof)}
              >
                🏠 Poze Acoperiș
              </button>

              {showRoof && (
                <div className="p-2">
                  {isAdmin && (
                    <input
                      type="file"
                      accept="image/*"
                      className="mb-3"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await uploadImage(file, "roof");
                      }}
                    />
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {form.roof_images.map((img, i) => (
                      <img
                        key={img}
                        src={img}
                        alt=""
                        onClick={() => {
                          setLightboxImages(form.roof_images || []);
                          setActiveIndex(i);
                          setOpenLightbox(true);
                        }}
                        className="rounded border h-32 w-full object-cover cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ===== SIMULARE ===== */}
              <button
                className="w-full text-left font-bold bg-gray-100 p-3 rounded mt-3"
                onClick={() => setShowSimulation(!showSimulation)}
              >
                ☀️ Simulare Panouri
              </button>

              {showSimulation && (
                <div className="p-2">
                  {isAdmin && (
                    <input
                      type="file"
                      accept="image/*"
                      className="mb-3"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await uploadImage(file, "simulation");
                      }}
                    />
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {form.simulation_images.map((img, i) => (
                      <img
                        key={img}
                        src={img}
                        alt=""
                        onClick={() => {
                          setLightboxImages(form.simulation_images || []);
                          setActiveIndex(i);
                          setOpenLightbox(true);
                        }}
                        className="rounded border h-32 w-full object-cover cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ===== BUTOANE ADMIN ===== */}
              <div className="flex gap-2 mt-6">
                <button
                  className="bg-gray-300 px-4 py-2 rounded"
                  onClick={resetForm}
                >
                  Închide
                </button>

                {isAdmin && !selectedProject && (
                  <button
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={handleSave}
                  >
                    Salvează
                  </button>
                )}

                {isAdmin && selectedProject && (
                  <>
                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                      onClick={handleUpdate}
                    >
                      Actualizează
                    </button>
                    <button
                      className="bg-red-600 text-white px-4 py-2 rounded"
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

        {/* LIGHTBOX */}
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

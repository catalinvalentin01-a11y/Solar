"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    loadProjects();
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
    setOpen(false);
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
          /* Fix mobil FullCalendar */
          .fc {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            font-size: 14px;
          }
          .fc table {
            border-collapse: collapse;
          }
          .fc td, .fc th {
            border-width: 1px !important;
          }
          .fc .fc-scrollgrid {
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          /* Ziua din calendar - text mai vizibil */
          .fc .fc-daygrid-day-number {
            font-size: 14px !important;
            font-weight: 600 !important;
            color: #111827 !important;
            padding: 4px 6px !important;
          }
          /* Numele zilelor (Lun, Mar..) */
          .fc .fc-col-header-cell-cushion {
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #111827 !important;
            padding: 6px 4px !important;
          }
          /* Toolbar - luna si butoanele de navigare */
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
          /* Evenimentele din calendar */
          .fc .fc-event-title {
            font-size: 12px !important;
            font-weight: 600 !important;
          }
          /* Ziua de azi - mai vizibila */
          .fc .fc-day-today {
            background-color: #eff6ff !important;
          }
          .fc .fc-day-today .fc-daygrid-day-number {
            color: #1d4ed8 !important;
          }
          @media (max-width: 640px) {
            .fc .fc-toolbar-title {
              font-size: 15px !important;
            }
            .fc .fc-toolbar {
              gap: 6px !important;
            }
            .fc .fc-daygrid-day-number {
              font-size: 13px !important;
            }
            .fc .fc-col-header-cell-cushion {
              font-size: 11px !important;
            }
            .fc .fc-event-title {
              font-size: 11px !important;
            }
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

              {/* Sectiune Date Client */}
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
                      <input
                        className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500"
                        placeholder="Client"
                        value={form.client}
                        onChange={(e) => setForm({ ...form, client: e.target.value })}
                      />
                      <input
                        className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500"
                        placeholder="Telefon"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                      <input
                        className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500"
                        placeholder="Email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                      <input
                        className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500"
                        placeholder="Locație"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                      />
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.client || "—"}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Telefon</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.phone || "—"}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.email || "—"}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Locație</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.location || "—"}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sectiune Date Tehnice */}
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
                      <input
                        className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500"
                        placeholder="Titlu proiect"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                      <input
                        className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500"
                        placeholder="kW"
                        value={form.kw}
                        onChange={(e) => setForm({ ...form, kw: e.target.value })}
                      />
                      <input
                        className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500"
                        placeholder="Panouri"
                        value={form.panels}
                        onChange={(e) => setForm({ ...form, panels: e.target.value })}
                      />
                      <input
                        className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500"
                        placeholder="Invertor"
                        value={form.inverter}
                        onChange={(e) => setForm({ ...form, inverter: e.target.value })}
                      />
                      <input
                        className="border border-gray-300 p-3 rounded text-base text-gray-900 placeholder-gray-500"
                        placeholder="Baterie"
                        value={form.battery}
                        onChange={(e) => setForm({ ...form, battery: e.target.value })}
                      />
                      <select
                        className="border border-gray-300 p-3 rounded text-base text-gray-900"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option>Programat</option>
                        <option>În lucru</option>
                        <option>Finalizat</option>
                      </select>
                      <textarea
                        className="border border-gray-300 p-3 rounded col-span-1 sm:col-span-2 text-base text-gray-900 placeholder-gray-500"
                        placeholder="Observații"
                        rows={4}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Titlu proiect</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.title || "—"}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">kW</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.kw || "—"}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Panouri</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.panels || "—"}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invertor</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.inverter || "—"}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Baterie</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.battery || "—"}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p>
                        <p className="font-semibold text-gray-900 text-base mt-1">{form.status || "—"}</p>
                      </div>
                      <div className="p-2 bg-gray-50 rounded col-span-1 sm:col-span-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Observații</p>
                        <p className="font-semibold text-gray-900 text-base mt-1 whitespace-pre-wrap">{form.notes || "—"}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sectiune Poze Acoperis */}
              <button
                className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base"
                onClick={() => setShowRoof(!showRoof)}
              >
                🏠 Poze Acoperiș {showRoof ? "▲" : "▼"}
              </button>

              {showRoof && (
                <div className="p-2 mt-1">
                  {isAdmin && (
                    <input
                      type="file"
                      accept="image/*"
                      className="mb-3 text-sm text-gray-700"
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
                        className="rounded border h-28 w-full object-cover cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sectiune Simulare */}
              <button
                className="w-full text-left font-bold text-gray-900 bg-gray-100 p-3 rounded mt-3 text-base"
                onClick={() => setShowSimulation(!showSimulation)}
              >
                ☀️ Simulare Panouri {showSimulation ? "▲" : "▼"}
              </button>

              {showSimulation && (
                <div className="p-2 mt-1">
                  {isAdmin && (
                    <input
                      type="file"
                      accept="image/*"
                      className="mb-3 text-sm text-gray-700"
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
                        className="rounded border h-28 w-full object-cover cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              )}

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
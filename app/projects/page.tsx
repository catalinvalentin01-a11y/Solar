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
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
const [activeIndex, setActiveIndex] = useState(0);
const [openLightbox, setOpenLightbox] = useState(false);



  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [selectedProject, setSelectedProject] =
    useState<Project | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  const [showClient, setShowClient] = useState(true);
  const [showTechnical, setShowTechnical] = useState(true);
  const [showRoof, setShowRoof] = useState(true);
  const [showSimulation, setShowSimulation] =
    useState(true);
  const deleteImage = async (imgToDelete: string, type: "roof" | "simulation") => {
  setForm((prev) => {
    const updated =
      type === "roof"
        ? prev.roof_images.filter((img) => img !== imgToDelete)
        : prev.simulation_images.filter((img) => img !== imgToDelete);

    const newForm = {
      ...prev,
      roof_images: type === "roof" ? updated : prev.roof_images,
      simulation_images: type === "simulation" ? updated : prev.simulation_images,
    };

    // 🔥 update DB
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

  // 🔥 IMPORTANT: FORȚEAZĂ LIGHTBOX UPDATE
  setLightboxImages((prev) => {
    const filtered = prev.filter((img) => img !== imgToDelete);

    // dacă nu mai sunt imagini → închide lightbox
    if (filtered.length === 0) {
      setOpenLightbox(false);
      return [];
    }

    return filtered;
  });
};

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

  // ================= ADMIN =================

  useEffect(() => {
  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();

    const email = data.user?.email;

    console.log("USER:", data.user);
    console.log("EMAIL:", email);

    setIsAdmin(email === ADMIN_EMAIL);
  };

  checkUser();
}, []);

  // ================= LOAD =================

  async function loadProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select("*");

    if (error) {
      console.error(error);
      return;
    }

    const calendarEvents =
      data?.map((project) => ({
        id: project.id,
        title: `${project.client} - ${project.title}`,
        date: project.date,
        extendedProps: project,
      })) || [];

    setEvents(calendarEvents);
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
  console.log("FORM", form);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      ...form,
      date: selectedDate,
    })
    .select();

  console.log("DATA", data);
  console.log("ERROR", error);

  if (error) {
    alert(error.message);
    return;
  }

  resetForm();
  loadProjects();
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

    const ok = confirm(
      "Sigur dorești ștergerea proiectului?"
    );

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

  // ================= UPLOAD =================

  const uploadImage = async (
    file: File,
    target: "roof" | "simulation"
  ) => {
    const fileName =
      Date.now() + "-" + file.name;

    const { error } = await supabase.storage
      .from("project-images")
      .upload(fileName, file);

    if (error) {
      console.error(error);
      return;
    }
    
    const deleteImage = (
  imgToDelete: string,
  type: "roof" | "simulation"
) => {
  setForm((prev) => {
    const updated =
      type === "roof"
        ? prev.roof_images.filter((img) => img !== imgToDelete)
        : prev.simulation_images.filter((img) => img !== imgToDelete);

    return {
      ...prev,
      [type === "roof" ? "roof_images" : "simulation_images"]:
        updated,
    };
  });
};

    const { data } = supabase.storage
      .from("project-images")
      .getPublicUrl(fileName);

    const url = data.publicUrl;

    if (target === "roof") {
      setForm((prev) => ({
        ...prev,
        roof_images: [
          ...prev.roof_images,
          url,
        ],
      }));
    }

    if (target === "simulation") {
      setForm((prev) => ({
        ...prev,
        simulation_images: [
          ...prev.simulation_images,
          url,
        ],
      }));
    }
  };
    return (
        <AuthGuard>
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Calendar Montaje
      </h1>
   <p className="text-red-500">
  Admin: {String(isAdmin)}
</p>

      <FullCalendar
      
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={(info) => {
          if (!isAdmin) return;

          setSelectedProject(null);
          setSelectedDate(info.dateStr);
          setOpen(true);
        }}
        eventClick={(info) => {
          const p = info.event.extendedProps as Project;

          setSelectedProject({
            ...p,
            id: info.event.id,
          });

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
            simulation_images:
              p.simulation_images || [],
          });

          setOpen(true);
        }}
      />

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          <div className="relative bg-white rounded-lg p-6 w-[900px] max-h-[90vh] overflow-y-auto z-[10000]">

            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-xl">
                {selectedProject
                  ? "Detalii proiect"
                  : "Proiect nou"}
              </h2>

              <span className="text-sm text-gray-500">
                {selectedDate}
              </span>
            </div>

            {/* DATE CLIENT */}

            <button
              className="w-full text-left font-bold bg-gray-100 p-3 rounded"
              onClick={() =>
                setShowClient(!showClient)
              }
            >
              📋 Date Client
            </button>

            {showClient && (
              <div className="grid grid-cols-2 gap-2 p-2">

                <input
                  disabled={!isAdmin}
                  className="border p-2"
                  placeholder="Client"
                  value={form.client}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      client: e.target.value,
                    })
                  }
                />

                <input
                  disabled={!isAdmin}
                  className="border p-2"
                  placeholder="Telefon"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value,
                    })
                  }
                />

                <input
                  disabled={!isAdmin}
                  className="border p-2"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />

                <input
                  disabled={!isAdmin}
                  className="border p-2"
                  placeholder="Locație"
                  value={form.location}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      location: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {/* DATE TEHNICE */}

            <button
              className="w-full text-left font-bold bg-gray-100 p-3 rounded mt-3"
              onClick={() =>
                setShowTechnical(!showTechnical)
              }
            >
              ⚡ Date Tehnice
            </button>

            {showTechnical && (
              <div className="grid grid-cols-2 gap-2 p-2">

                <input
                  disabled={!isAdmin}
                  className="border p-2"
                  placeholder="Titlu proiect"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                />

                <input
                  disabled={!isAdmin}
                  className="border p-2"
                  placeholder="kW"
                  value={form.kw}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      kw: e.target.value,
                    })
                  }
                />

                <input
                  disabled={!isAdmin}
                  className="border p-2"
                  placeholder="Panouri"
                  value={form.panels}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      panels: e.target.value,
                    })
                  }
                />

                <input
                  disabled={!isAdmin}
                  className="border p-2"
                  placeholder="Invertor"
                  value={form.inverter}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      inverter: e.target.value,
                    })
                  }
                />

                <input
                  disabled={!isAdmin}
                  className="border p-2"
                  placeholder="Baterie"
                  value={form.battery}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      battery: e.target.value,
                    })
                  }
                />

                <select
                  disabled={!isAdmin}
                  className="border p-2"
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value,
                    })
                  }
                >
                  <option>Programat</option>
                  <option>În lucru</option>
                  <option>Finalizat</option>
                </select>

                <textarea
                  disabled={!isAdmin}
                  className="border p-2 col-span-2"
                  placeholder="Observații"
                  rows={4}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      notes: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {/* POZE ACOPERIS */}

            <button
              className="w-full text-left font-bold bg-gray-100 p-3 rounded mt-3"
              onClick={() =>
                setShowRoof(!showRoof)
              }
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
                      const file =
                        e.target.files?.[0];

                      if (!file) return;

                      await uploadImage(
                        file,
                        "roof"
                      );
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

            {/* SIMULARE */}

            <button
              className="w-full text-left font-bold bg-gray-100 p-3 rounded mt-3"
              onClick={() =>
                setShowSimulation(
                  !showSimulation
                )
              }
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
                      const file =
                        e.target.files?.[0];

                      if (!file) return;

                      await uploadImage(
                        file,
                        "simulation"
                      );
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

            {/* BUTTONS */}

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
  {openLightbox && (
  <ImageLightbox
    images={lightboxImages}
    initialIndex={activeIndex}
    onClose={() => setOpenLightbox(false)}
    onDelete={(img) => {
      deleteImage(
        img,
        // alegem din ce galerie vine
        form.roof_images.includes(img) ? "roof" : "simulation"
      );
    }}
  />
)}
    </div>
</AuthGuard>
    
    )}

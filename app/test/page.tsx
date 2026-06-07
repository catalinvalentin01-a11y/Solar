"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function TestPage() {
  useEffect(() => {
    async function testInsert() {
      const { data, error } = await supabase.from("projects").insert({
        client: "Test Client",
        title: "Test Project",
        kw: "10",
        battery: "5kWh",
        panels: "12",
        inverter: "Huawei",
        date: "2026-06-07",
      });

      console.log("INSERT DATA:", data);
      console.log("INSERT ERROR:", error);
    }

    testInsert();
  }, []);

  return <div>Check console (F12)</div>;
}
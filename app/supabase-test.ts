import { supabase } from "../lib/supabase";

async function testSupabase() {
  const { data, error } = await supabase.from("projects").select("*");

  console.log("DATA:", data);
  console.log("ERROR:", error);
}

testSupabase();
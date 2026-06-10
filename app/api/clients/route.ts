import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();

  const { data, error } = await supabase.from("clients").insert({
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    address: body.address || null,
    cod_montaj: body.codMontaj || null,
    data_montaj: body.dataMontaj || null,
    status_montaj: body.statusMontaj || "În așteptare",
    observatii: body.observatii || null,
    status: body.status || "Lead",
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function PUT(req: Request) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("clients")
    .update({
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      cod_montaj: body.codMontaj || null,
      data_montaj: body.dataMontaj || null,
      status_montaj: body.statusMontaj || "În așteptare",
      observatii: body.observatii || null,
      status: body.status || "Lead",
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();

  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
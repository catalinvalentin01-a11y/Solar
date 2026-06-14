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

  // ✅ FIX: dacă vine phone în loc de id, căutăm clientul după telefon
  let clientId = body.id;

  if (!clientId && body.phone) {
    const { data: found } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", body.phone)
      .maybeSingle();
    clientId = found?.id;
  }

  if (!clientId) {
    return Response.json({ error: "Client negăsit" }, { status: 404 });
  }

  const updateData: Record<string, any> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.address !== undefined) updateData.address = body.address;
  if (body.codMontaj !== undefined) updateData.cod_montaj = body.codMontaj;
  if (body.dataMontaj !== undefined) updateData.data_montaj = body.dataMontaj;
  if (body.status_montaj !== undefined) updateData.status_montaj = body.status_montaj;
  if (body.observatii !== undefined) updateData.observatii = body.observatii;
  if (body.status !== undefined) updateData.status = body.status;

  const { data, error } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", clientId)
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

import { prisma } from "@/lib/prisma";

export async function GET() {
  const clients = await prisma.client.findMany();
  return Response.json(clients);
}

export async function POST(req: Request) {
  const body = await req.json();

  const client = await prisma.client.create({
    data: {
      name: body.name,
      email: body.email,
      status: body.status || "Activ",
    },
  });

  return Response.json(client);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();

  await prisma.client.delete({
    where: { id },
  });

  return Response.json({ success: true });
}
export async function PUT(req: Request) {
  const body = await req.json();

  const { id, name, email, status } = body;

  const updatedClient = await prisma.client.update({
    where: { id },
    data: {
      name,
      email,
      status,
    },
  });

  return Response.json(updatedClient);
}
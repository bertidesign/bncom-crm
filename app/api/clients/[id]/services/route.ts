import { resolveWebProvider } from "@/lib/web-providers";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { serviceSchema } from "@/lib/client-validation";
import { canEditClientDepartment } from "@/lib/client-access";
import { apiError } from "@/lib/http";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const parsed = serviceSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Servizio non valido." }, { status: 400 }); if (!canEditClientDepartment(actor, parsed.data.department)) return NextResponse.json({ error: "Puoi gestire i servizi dei tuoi reparti." }, { status: 403 }); const { id } = await context.params;
    const { result } = await updateDatabase(db => { if (!db.clients.some(client => client.id === id)) return { missing: true as const }; const provider = resolveWebProvider(db, parsed.data); if ("error" in provider) return provider; const stamp = new Date().toISOString(); const service = { id: crypto.randomUUID(), clientId: id, ...parsed.data, ...provider, createdAt: stamp, updatedAt: stamp }; db.clientServices.push(service); return service; });
    return "missing" in result ? NextResponse.json({ error: "Cliente non trovato." }, { status: 404 }) : "error" in result ? NextResponse.json({ error: result.error }, { status: 400 }) : NextResponse.json({ service: result }, { status: 201 });
  } catch (error) { return apiError(error); }
}

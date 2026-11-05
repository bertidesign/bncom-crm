import { resolveWebProvider } from "@/lib/web-providers";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { serviceSchema } from "@/lib/client-validation";
import { canEditClientDepartment } from "@/lib/client-access";
import { apiError } from "@/lib/http";
async function change(request: NextRequest, context: { params: Promise<{ id: string }> }, remove: boolean) {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const { id } = await context.params; const parsed = remove ? null : serviceSchema.safeParse(await request.json().catch(() => null)); if (!remove && !parsed?.success) return NextResponse.json({ error: parsed && !parsed.success ? parsed.error.issues[0]?.message : "Servizio non valido." }, { status: 400 });
    const { result } = await updateDatabase(db => { const service = db.clientServices.find(item => item.id === id); if (!service) return { status: 404 as const }; if (!canEditClientDepartment(actor, service.department) || (parsed?.success && !canEditClientDepartment(actor, parsed.data.department))) return { status: 403 as const }; if (parsed?.success && service.department !== parsed.data.department) return { status: 400 as const }; if (remove) db.clientServices = db.clientServices.filter(item => item.id !== id); else if (parsed?.success) { const provider = resolveWebProvider(db, parsed.data, service); if ("error" in provider) return { status: 400 as const, error: provider.error }; Object.assign(service, parsed.data, provider, { updatedAt: new Date().toISOString() }); } return { status: 200 as const, service }; });
    return result.status === 200 ? NextResponse.json(remove ? { ok: true } : { service: result.service }) : NextResponse.json({ error: "error" in result ? result.error : result.status === 403 ? "Puoi gestire i servizi dei tuoi reparti." : result.status === 400 ? "Il reparto del servizio non può essere modificato." : "Servizio non trovato." }, { status: result.status });
  } catch (error) { return apiError(error); }
}
export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) => change(request, context, false);
export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) => change(request, context, true);

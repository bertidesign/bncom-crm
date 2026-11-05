import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { postSchema } from "@/lib/client-validation";
import { canEditClientDepartment } from "@/lib/client-access";
import { apiError } from "@/lib/http";
async function change(request: NextRequest, context: { params: Promise<{ id: string }> }, remove: boolean) {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); if (!canEditClientDepartment(actor, "Social")) return NextResponse.json({ error: "La pianificazione è riservata al reparto Social e agli amministratori." }, { status: 403 }); const { id } = await context.params; const parsed = remove ? null : postSchema.safeParse(await request.json().catch(() => null)); if (!remove && !parsed?.success) return NextResponse.json({ error: parsed && !parsed.success ? parsed.error.issues[0]?.message : "Contenuto non valido." }, { status: 400 }); const { result } = await updateDatabase(db => { const post = db.clientPosts.find(item => item.id === id); if (!post) return null; if (remove) db.clientPosts = db.clientPosts.filter(item => item.id !== id); else if (parsed?.success) Object.assign(post, parsed.data, { updatedAt: new Date().toISOString() }); return post; }); return result ? NextResponse.json(remove ? { ok: true } : { post: result }) : NextResponse.json({ error: "Contenuto non trovato." }, { status: 404 }); } catch (error) { return apiError(error); }
}
export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) => change(request, context, false);
export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) => change(request, context, true);

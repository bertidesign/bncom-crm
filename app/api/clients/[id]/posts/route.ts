import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { postSchema } from "@/lib/client-validation";
import { canEditClientDepartment } from "@/lib/client-access";
import { apiError } from "@/lib/http";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); if (!canEditClientDepartment(actor, "Social")) return NextResponse.json({ error: "La pianificazione è riservata al reparto Social e agli amministratori." }, { status: 403 }); const parsed = postSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Contenuto non valido." }, { status: 400 }); const { id } = await context.params; const { result } = await updateDatabase(db => { if (!db.clients.some(client => client.id === id)) return null; const stamp = new Date().toISOString(); const post = { id: crypto.randomUUID(), clientId: id, ...parsed.data, createdAt: stamp, updatedAt: stamp }; db.clientPosts.push(post); return post; }); return result ? NextResponse.json({ post: result }, { status: 201 }) : NextResponse.json({ error: "Cliente non trovato." }, { status: 404 }); } catch (error) { return apiError(error); }
}

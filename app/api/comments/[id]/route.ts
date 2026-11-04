import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
const schema = z.object({ body: z.string().trim().min(1).max(5000) });
async function change(request: NextRequest, context: { params: Promise<{ id: string }> }, remove: boolean) {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const parsed = remove ? null : schema.safeParse(await request.json().catch(() => null)); if (!remove && !parsed?.success) return NextResponse.json({ error: "Commento non valido." }, { status: 400 }); const { id } = await context.params;
    const { result } = await updateDatabase(db => { const comment = db.comments.find(item => item.id === id); if (!comment) return 404; if (actor.role !== "Admin" && comment.authorId !== actor.id) return 403; if (remove) db.comments = db.comments.filter(item => item.id !== id); else if (parsed?.success) { comment.body = parsed.data.body; comment.updatedAt = new Date().toISOString(); } return 200; });
    return NextResponse.json(result === 200 ? { ok: true } : { error: result === 403 ? "Puoi modificare solo i tuoi commenti." : "Commento non trovato." }, { status: result });
  } catch (error) { return apiError(error); }
}
export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) => change(request, context, false);
export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) => change(request, context, true);

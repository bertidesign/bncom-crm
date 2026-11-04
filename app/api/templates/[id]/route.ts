import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, apiError } from "@/lib/http";
import { updateDatabase } from "@/lib/store";
import { templateSchema } from "@/lib/project-templates";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const auth = await requireAdmin(); if (auth.response) return auth.response; const parsed = templateSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Modello non valido." }, { status: 400 }); const { id } = await context.params; const { result } = await updateDatabase(db => { const template = db.templates.find(item => item.id === id); if (!template) return null; Object.assign(template, parsed.data, { updatedAt: new Date().toISOString() }); return template; }); return result ? NextResponse.json({ template: result }) : NextResponse.json({ error: "Modello non trovato." }, { status: 404 }); } catch (error) { return apiError(error); }
}
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const auth = await requireAdmin(); if (auth.response) return auth.response; const { id } = await context.params; const { result } = await updateDatabase(db => { const exists = db.templates.some(item => item.id === id); db.templates = db.templates.filter(item => item.id !== id); return exists; }); return result ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Modello non trovato." }, { status: 404 }); } catch (error) { return apiError(error); }
}

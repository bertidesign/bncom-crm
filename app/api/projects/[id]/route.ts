import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateDatabase } from "@/lib/store";
import { requireSession, apiError } from "@/lib/http";
const schema = z.object({ status: z.enum(["In corso", "In attesa", "Completato"]) });
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { const denied = await requireSession(); if (denied) return denied; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Stato progetto non valido." }, { status: 400 }); try { const { id } = await context.params; const { result } = await updateDatabase(db => { const project = db.projects.find(item => item.id === id); if (project) project.status = parsed.data.status; return project; }); return result ? NextResponse.json({ project: result }) : NextResponse.json({ error: "Progetto non trovato." }, { status: 404 }); } catch (error) { return apiError(error); } }

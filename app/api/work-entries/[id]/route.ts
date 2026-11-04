import { NextResponse } from "next/server";
import { updateDatabase } from "@/lib/store";
import { requireSession, apiError } from "@/lib/http";
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) { const denied = await requireSession(); if (denied) return denied; try { const { id } = await context.params; const { result } = await updateDatabase(db => { const before = db.entries.length; db.entries = db.entries.filter(item => item.id !== id); return before !== db.entries.length; }); return result ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Lavorazione non trovata." }, { status: 404 }); } catch (error) { return apiError(error); } }

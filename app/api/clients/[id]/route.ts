import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateDatabase } from "@/lib/store";
import { requireSession, apiError } from "@/lib/http";
const schema = z.object({ status: z.enum(["Attivo", "In valutazione", "In pausa", "Concluso"]) });
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) { const denied = await requireSession(); if (denied) return denied; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Stato cliente non valido." }, { status: 400 }); try { const { id } = await context.params; const { result } = await updateDatabase(db => { const client = db.clients.find(item => item.id === id); if (client) client.status = parsed.data.status; return client; }); return result ? NextResponse.json({ client: result }) : NextResponse.json({ error: "Cliente non trovato." }, { status: 404 }); } catch (error) { return apiError(error); } }

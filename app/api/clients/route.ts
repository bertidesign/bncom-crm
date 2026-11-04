import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateDatabase } from "@/lib/store";
import { requireSession, apiError } from "@/lib/http";
const schema = z.object({ name: z.string().trim().min(2).max(80), company: z.string().trim().min(2).max(100), email: z.string().trim().email().max(120), status: z.enum(["Attivo", "In valutazione", "In pausa", "Concluso"]) });
export async function GET() { const denied = await requireSession(); if (denied) return denied; try { const { getDatabase } = await import("@/lib/store"); const db = await getDatabase(); return NextResponse.json({ clients: db.clients }); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) { const denied = await requireSession(); if (denied) return denied; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Controlla i campi inseriti." }, { status: 400 }); try { const { result } = await updateDatabase(db => { const client = { id: crypto.randomUUID(), ...parsed.data, color: ["#d5e5de", "#ead9c8", "#dce0ef", "#eddfb7", "#e7d4d2"][db.clients.length % 5], createdAt: new Date().toISOString() }; db.clients.unshift(client); return client; }); return NextResponse.json({ client: result }, { status: 201 }); } catch (error) { return apiError(error); } }

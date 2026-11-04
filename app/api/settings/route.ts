import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase, updateDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
import { preferencesFor } from "@/lib/settings";
const schema = z.object({ palette: z.enum(["salvia", "oceano", "iris", "terracotta", "grafite"]), density: z.enum(["comfortable", "compact"]), startPage: z.enum(["La mia giornata", "Panoramica", "Clienti", "Progetti", "Lavorazioni"]), notifications: z.object({ project: z.boolean(), milestone: z.boolean(), task: z.boolean(), mentions: z.boolean().default(true), workflow: z.boolean().default(true) }) });
export async function GET() {
  try { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const db = await getDatabase(); return NextResponse.json({ preferences: preferencesFor(user.preferences), studio: user.role === "Admin" ? db.studio : undefined }); } catch (error) { return apiError(error); }
}
export async function PATCH(request: NextRequest) {
  try { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Preferenze non valide." }, { status: 400 }); await updateDatabase(db => { const account = db.users.find(item => item.id === user.id); if (!account) throw new Error("Account non trovato"); account.preferences = parsed.data; }); return NextResponse.json({ preferences: parsed.data }); } catch (error) { return apiError(error); }
}

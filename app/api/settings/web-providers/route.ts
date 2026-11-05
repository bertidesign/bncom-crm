import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSession, apiError } from "@/lib/http";
import { getDatabase, updateDatabase } from "@/lib/store";
import { providerSchema } from "@/lib/web-provider-validation";
import { providerNameKey } from "@/lib/web-providers";
export async function GET() {
  try { const denied = await requireSession(); if (denied) return denied; const db = await getDatabase(); return NextResponse.json({ providers: db.webProviders.map(provider => ({ ...provider, serviceCount: db.clientServices.filter(s => s.department === "Web" && s.providerId === provider.id).length })).sort((a, b) => a.name.localeCompare(b.name, "it")) }); } catch (e) { return apiError(e); }
}
export async function POST(request: NextRequest) {
  try { const auth = await requireAdmin(); if (auth.response) return auth.response; const parsed = providerSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Controlla i dati del fornitore." }, { status: 400 }); const { result } = await updateDatabase(db => { if (db.webProviders.some(p => providerNameKey(p.name) === providerNameKey(parsed.data.name))) return null; const now = new Date().toISOString(); const provider = { ...parsed.data, id: crypto.randomUUID(), createdAt: now, updatedAt: now }; db.webProviders.push(provider); return provider; }); return result ? NextResponse.json({ provider: result }, { status: 201 }) : NextResponse.json({ error: "Esiste già un fornitore con questo nome, anche tra gli archiviati." }, { status: 409 }); } catch (e) { return apiError(e); }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, apiError } from "@/lib/http";
import { getDatabase, updateDatabase } from "@/lib/store";
import { serviceSchema } from "@/lib/client-validation";
import { providerSchema } from "@/lib/web-provider-validation";
import { serviceNotes } from "@/lib/client-domain";

const schema = serviceSchema.and(z.object({ clientId: z.string().min(1), newProvider: providerSchema.partial().optional() }));

export async function POST(request: NextRequest) {
  const denied = await requireSession(); if (denied) return denied;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Controlla i dati del servizio." }, { status: 400 });
  try {
    const { result } = await updateDatabase(db => {
      if (!db.clients.some(client => client.id === parsed.data.clientId)) return { error: "Cliente non valido." };
      let providerId = parsed.data.providerId; let provider = parsed.data.provider;
      if (parsed.data.newProvider) { if (!parsed.data.newProvider.name) return { error: "Inserisci il nome del fornitore." }; if (db.webProviders.some(item => item.department === parsed.data.department && item.name.trim().toLocaleLowerCase() === parsed.data.newProvider!.name!.trim().toLocaleLowerCase())) return { error: "Esiste già un fornitore con questo nome nel reparto." }; const now = new Date().toISOString(); const created = { id: crypto.randomUUID(), department: parsed.data.department, name: parsed.data.newProvider.name, website: parsed.data.newProvider.website || "", notes: parsed.data.newProvider.notes || "", active: true, createdAt: now, updatedAt: now }; db.webProviders.push(created); providerId = created.id; provider = created.name; }
      if (providerId && !db.webProviders.some(item => item.id === providerId && item.active)) return { error: "Fornitore non disponibile." };
      const now = new Date().toISOString(); const service = { id: crypto.randomUUID(), clientId: parsed.data.clientId, department: parsed.data.department, category: parsed.data.category, name: parsed.data.name, status: parsed.data.status, providerId, provider: provider || "", packageName: "", url: parsed.data.url, startDate: parsed.data.startDate, nextDate: parsed.data.nextDate, dateKind: parsed.data.dateKind, cadence: parsed.data.cadence, notes: parsed.data.notes, createdAt: now, updatedAt: now };
      service.notes = serviceNotes(service); db.clientServices.unshift(service); return { service };
    });
    return "error" in result ? NextResponse.json({ error: result.error }, { status: 400 }) : NextResponse.json(result, { status: 201 });
  } catch (error) { return apiError(error); }
}

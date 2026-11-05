import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase, updateDatabase } from "@/lib/store";
import { canEditClientDepartment } from "@/lib/client-access";
import { postSchema } from "@/lib/client-validation";
import { apiError } from "@/lib/http";
import { MAX_EXCEL_BYTES, parseEditorialWorkbook } from "@/lib/editorial-parser";
export const runtime = "nodejs";
export const maxDuration = 30;
async function authorize() {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 });
  if (!canEditClientDepartment(actor, "Social")) return NextResponse.json({ error: "L’importazione è riservata al reparto Social e agli amministratori." }, { status: 403 });
  return null;
}
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await authorize(); if (denied) return denied;
  try { const { id } = await context.params; const db = await getDatabase(); if (!db.clients.some(c => c.id === id)) return NextResponse.json({ error: "Cliente non trovato." }, { status: 404 }); return NextResponse.json({ plans: db.editorialPlans.filter(p => p.clientId === id) }); } catch (e) { return apiError(e); }
}
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await authorize(); if (denied) return denied;
  try {
    const { id } = await context.params; if (!(await getDatabase()).clients.some(c => c.id === id)) return NextResponse.json({ error: "Cliente non trovato." }, { status: 404 });
    if (Number(request.headers.get("content-length")) > MAX_EXCEL_BYTES + 100000) return NextResponse.json({ error: "Usa un Excel fino a 4 MB." }, { status: 413 });
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File) || file.size > MAX_EXCEL_BYTES) return NextResponse.json({ error: "Scegli un file .xlsx fino a 4 MB." }, { status: 400 });
    try { return NextResponse.json(await parseEditorialWorkbook(new Uint8Array(await file.arrayBuffer()), file.name)); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "File Excel non leggibile." }, { status: 400 }); }
  } catch (e) { return apiError(e); }
}
const commitSchema = z.object({ newPlanId: z.string().uuid().optional(), planId: z.string().uuid().optional(), planName: z.string().trim().min(2).max(120), fileName: z.string().min(1).max(200), rows: z.array(z.object({ sourceKey: z.string().min(1).max(600), sourceRef: z.string().min(1).max(100), sheet: z.string().min(1).max(100), existingId: z.string().optional(), expectedUpdatedAt: z.string().optional(), data: postSchema })).min(1).max(300) }).superRefine((v, ctx) => { if (!v.planId && !v.newPlanId) ctx.addIssue({ code: "custom", message: "Scegli un piano di destinazione." }); if (new Set(v.rows.map(r => r.sourceKey)).size !== v.rows.length) ctx.addIssue({ code: "custom", message: "Ci sono riferimenti duplicati nel file." }); });
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await authorize(); if (denied) return denied;
  if (Number(request.headers.get("content-length")) > 3000000) return NextResponse.json({ error: "Importazione troppo grande: seleziona meno contenuti." }, { status: 413 });
  const parsed = commitSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Controlla i contenuti selezionati." }, { status: 400 });
  try {
    const { id } = await context.params; const input = parsed.data;
    const { result } = await updateDatabase(db => {
      if (!db.clients.some(c => c.id === id)) return { status: 404, error: "Cliente non trovato." };
      if (!input.planId && db.editorialPlans.some(p => p.id === input.newPlanId || (p.clientId === id && p.name.toLowerCase() === input.planName.toLowerCase()))) return { status: 409, error: "Questo piano esiste già. Sceglilo come destinazione per aggiornare i contenuti senza duplicarli." };
      const plan = input.planId ? db.editorialPlans.find(p => p.id === input.planId && p.clientId === id) : null;
      if (input.planId && !plan) return { status: 404, error: "Piano non trovato per questo cliente." };
      // Validate every match before changing anything: imports are atomic, including on database retries.
      for (const row of input.rows) {
        const existing = plan && db.clientPosts.find(p => p.clientId === id && p.importSource?.planId === plan.id && p.importSource.key === row.sourceKey);
        if (existing ? existing.id !== row.existingId || existing.updatedAt !== row.expectedUpdatedAt : Boolean(row.existingId)) return { status: 409, error: "Il calendario è cambiato dopo l’anteprima. Ricarica il file per confrontare gli ultimi dati." };
      }
      const now = new Date().toISOString(); const planId = plan?.id || input.newPlanId!;
      if (!plan) db.editorialPlans.push({ id: planId, clientId: id, name: input.planName, createdAt: now, updatedAt: now }); else plan.updatedAt = now;
      let created = 0, updated = 0;
      for (const row of input.rows) {
        const existing = db.clientPosts.find(p => p.clientId === id && p.importSource?.planId === planId && p.importSource.key === row.sourceKey);
        const importSource = { planId, key: row.sourceKey, sheet: row.sheet, reference: row.sourceRef, fileName: input.fileName, importedAt: now };
        if (existing) { Object.assign(existing, row.data, { importSource, updatedAt: new Date(Math.max(Date.now(), Date.parse(existing.updatedAt) + 1)).toISOString() }); updated++; }
        else { db.clientPosts.push({ ...row.data, id: crypto.randomUUID(), clientId: id, importSource, createdAt: now, updatedAt: now }); created++; }
      }
      return { status: 200, created, updated, planId };
    });
    return NextResponse.json(result.status === 200 ? result : { error: result.error }, { status: result.status });
  } catch (e) { return apiError(e); }
}

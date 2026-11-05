import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { departments, type Department } from "@/lib/types";
import { dossierKeys, emptyDossier } from "@/lib/client-domain";
import { webInfoSchema, socialInfoSchema, graphicsInfoSchema } from "@/lib/client-validation";
import { canEditClientDepartment } from "@/lib/client-access";
import { apiError } from "@/lib/http";
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; department: string }> }) {
  try {
    const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const { id, department: rawDepartment } = await context.params;
    if (!(departments as readonly string[]).includes(rawDepartment)) return NextResponse.json({ error: "Reparto non valido." }, { status: 400 });
    const department = rawDepartment as Department; if (!canEditClientDepartment(actor, department)) return NextResponse.json({ error: "Puoi modificare le informazioni dei tuoi reparti." }, { status: 403 });
    const body = await request.json().catch(() => null); if (typeof body?.expectedUpdatedAt !== "string") return NextResponse.json({ error: "Ricarica le informazioni del reparto prima di salvarle." }, { status: 400 });
    const schema = department === "Web" ? webInfoSchema : department === "Social" ? socialInfoSchema : graphicsInfoSchema; const parsed = schema.safeParse(body.data); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Controlla le informazioni del reparto." }, { status: 400 });
    const { result } = await updateDatabase(db => {
      if (!db.clients.some(client => client.id === id)) return { status: 404 as const };
      let dossier = db.clientDossiers.find(item => item.clientId === id); const key = dossierKeys[department];
      if ((dossier?.[key].updatedAt || "") !== body.expectedUpdatedAt) return { status: 409 as const };
      if (!dossier) { dossier = emptyDossier(id); db.clientDossiers.push(dossier); }
      const section = { ...parsed.data, updatedAt: new Date(Math.max(Date.now(), Date.parse(dossier[key].updatedAt || "1970-01-01") + 1)).toISOString(), updatedBy: actor.id };
      Object.assign(dossier, { [key]: section }); return { status: 200 as const, section };
    });
    if (result.status !== 200) return NextResponse.json({ error: result.status === 409 ? "Le informazioni sono state aggiornate da un collega. Ricaricale prima di salvare." : "Cliente non trovato." }, { status: result.status });
    return NextResponse.json({ section: result.section });
  } catch (error) { return apiError(error); }
}

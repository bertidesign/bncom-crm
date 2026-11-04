import { removeCollaboration } from "@/lib/collaboration";
import { removeFileBlobs } from "@/lib/project-files";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase, updateDatabase } from "@/lib/store";
import { requireSession, apiError } from "@/lib/http";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  company: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
  status: z.enum(["Attivo", "In valutazione", "In pausa", "Concluso"]).optional(),
}).refine(value => Object.keys(value).length > 0, "Inserisci almeno un campo da aggiornare.");

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession(); if (denied) return denied;
  try {
    const { id } = await context.params; const db = await getDatabase();
    const client = db.clients.find(item => item.id === id);
    if (!client) return NextResponse.json({ error: "Cliente non trovato." }, { status: 404 });
    const projects = db.projects.filter(project => project.clientId === id);
    const projectIds = new Set(projects.map(project => project.id));
    const entries = db.entries.filter(entry => projectIds.has(entry.projectId)).sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json({ client, projects, entries });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession(); if (denied) return denied;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Controlla i campi da aggiornare." }, { status: 400 });
  try {
    const { id } = await context.params;
    const { result } = await updateDatabase(db => {
      const client = db.clients.find(item => item.id === id);
      if (client) Object.assign(client, parsed.data);
      return client;
    });
    return result ? NextResponse.json({ client: result }) : NextResponse.json({ error: "Cliente non trovato." }, { status: 404 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession(); if (denied) return denied;
  try {
    const { id } = await context.params;
    const cascade = request.nextUrl.searchParams.get("cascade") === "true";
    const { result } = await updateDatabase(db => {
      const client = db.clients.find(item => item.id === id);
      if (!client) return { missing: true, projects: 0, entries: 0 };
      const projectIds = new Set(db.projects.filter(project => project.clientId === id).map(project => project.id));
      const entries = db.entries.filter(entry => projectIds.has(entry.projectId)).length;
      if (projectIds.size && !cascade) return { missing: false, blocked: true, projects: projectIds.size, entries };
      const paths = removeCollaboration(db, projectIds);
      db.tasks = db.tasks.filter(task => !projectIds.has(task.projectId));
      db.milestones = db.milestones.filter(item => !projectIds.has(item.projectId));
      db.notifications = db.notifications.filter(item => !projectIds.has(item.projectId));
      db.entries = db.entries.filter(entry => !projectIds.has(entry.projectId));
      db.projects = db.projects.filter(project => project.clientId !== id);
      db.clients = db.clients.filter(item => item.id !== id);
      return { missing: false, blocked: false, projects: projectIds.size, entries, paths };
    });
    if (result.missing) return NextResponse.json({ error: "Cliente non trovato." }, { status: 404 });
    if (result.blocked) return NextResponse.json({ error: "Il cliente ha progetti collegati. Conferma l'eliminazione completa per rimuovere anche progetti e lavorazioni." }, { status: 409 });
    await removeFileBlobs(result.paths || []);
    return NextResponse.json({ ok: true, deletedProjects: result.projects, deletedEntries: result.entries });
  } catch (error) { return apiError(error); }
}

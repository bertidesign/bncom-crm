import { pendingHandoff } from "@/lib/task-workflow";
import { removeCollaboration } from "@/lib/collaboration";
import { removeFileBlobs } from "@/lib/project-files";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase, updateDatabase } from "@/lib/store";
import { requireSession, apiError } from "@/lib/http";
import { notifyStateChange } from "@/lib/notifications";
import { departments, type Department } from "@/lib/types";
const schema = z.object({ name: z.string().trim().min(2).max(100).optional(), clientId: z.string().min(1).optional(), status: z.enum(["In corso", "In attesa", "Completato"]).optional(), description: z.string().trim().max(2000).optional(), dueDate: z.string().optional(), departmentIds: z.array(z.enum(departments)).min(1).optional(), assigneeIds: z.array(z.string()).optional() }).refine(value => Object.keys(value).length > 0);
function validAssignments(assigneeIds: string[], departmentIds: Department[], users: Awaited<ReturnType<typeof getDatabase>>["users"]) { return assigneeIds.every(id => users.some(user => user.id === id && user.active && user.departmentIds.some(department => departmentIds.includes(department)))); }
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession(); if (denied) return denied;
  try { const { id } = await context.params; const db = await getDatabase(); const project = db.projects.find(item => item.id === id); if (!project) return NextResponse.json({ error: "Progetto non trovato." }, { status: 404 }); return NextResponse.json({ project, client: db.clients.find(client => client.id === project.clientId), milestones: db.milestones.filter(item => item.projectId === id), tasks: db.tasks.filter(item => item.projectId === id), users: db.users.filter(user => user.active).map(({ passwordHash: _secret, ...user }) => user), entries: db.entries.filter(item => item.projectId === id) }); }
  catch (error) { return apiError(error); }
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actorResponse = await requireSession(); if (actorResponse) return actorResponse;
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Controlla i dati da aggiornare." }, { status: 400 });
  try {
    const { id } = await context.params;
    const { getCurrentUser } = await import("@/lib/auth"); const currentUser = await getCurrentUser();
    const { result } = await updateDatabase(db => {
      const project = db.projects.find(item => item.id === id); if (!project) return null;
      const nextDepartments = parsed.data.departmentIds || project.departmentIds;
      if (db.tasks.some(task => task.projectId === id && task.departmentId && !nextDepartments.includes(task.departmentId))) return { error: "Sposta prima i task dei reparti che vuoi rimuovere." };
      if (db.tasks.some(task => task.projectId === id && pendingHandoff(task)?.previousDepartmentId && !nextDepartments.includes(pendingHandoff(task)!.previousDepartmentId!))) return { error: "Un passaggio in attesa coinvolge il reparto che vuoi rimuovere. Gestisci prima la consegna." };
      const nextAssignees = parsed.data.assigneeIds || project.assigneeIds;
      if (parsed.data.clientId && !db.clients.some(client => client.id === parsed.data.clientId)) return { error: "Seleziona un cliente valido." };
      if (!validAssignments(nextAssignees, nextDepartments, db.users)) return { error: "Gli assegnatari devono appartenere a uno dei reparti selezionati." };
      const previousStatus = project.status; Object.assign(project, parsed.data);
      if (parsed.data.status && parsed.data.status !== previousStatus && currentUser) notifyStateChange(db, project, currentUser.id, "project", project.id, `il progetto “${project.name}”`, previousStatus, project.status);
      return { project };
    });
    if (!result) return NextResponse.json({ error: "Progetto non trovato." }, { status: 404 });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ project: result.project });
  } catch (error) { return apiError(error); }
}
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession(); if (denied) return denied;
  try { const { id } = await context.params; const { result } = await updateDatabase(db => {
    if (!db.projects.some(project => project.id === id)) return null;
    const paths = removeCollaboration(db, new Set([id]));
    db.projects = db.projects.filter(project => project.id !== id); db.entries = db.entries.filter(entry => entry.projectId !== id); db.tasks = db.tasks.filter(task => task.projectId !== id); db.milestones = db.milestones.filter(milestone => milestone.projectId !== id); db.notifications = db.notifications.filter(item => item.projectId !== id);
    return { paths };
  }); if (!result) return NextResponse.json({ error: "Progetto non trovato." }, { status: 404 }); await removeFileBlobs(result.paths); return NextResponse.json({ ok: true }); } catch (error) { return apiError(error); }
}

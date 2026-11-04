import { removeCollaboration } from "@/lib/collaboration";
import { removeFileBlobs } from "@/lib/project-files";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requireSession, apiError } from "@/lib/http";
import { updateDatabase } from "@/lib/store";
import { notifyStateChange } from "@/lib/notifications";
import { taskFields } from "@/lib/task-validation";
import { blockers, dependencyError, dependentTasks, notifyNewlyReady, pendingHandoff, readyTaskIds, validTaskAssignees } from "@/lib/task-workflow";
const schema = taskFields.partial().refine(value => Object.keys(value).length > 0);
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession(); if (denied) return denied;
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Dati task non validi." }, { status: 400 });
  try { const { id } = await context.params; const actor = await getCurrentUser(); const { result } = await updateDatabase(db => {
    const task = db.tasks.find(item => item.id === id); if (!task) return null;
    const project = db.projects.find(item => item.id === task.projectId); if (!project) return null;
    const candidate = { ...task, ...parsed.data };
    if (candidate.milestoneId && !db.milestones.some(item => item.id === candidate.milestoneId && item.projectId === task.projectId)) return { error: "Milestone non valida." };
    if (!validTaskAssignees(db, project.departmentIds, candidate.departmentId, candidate.assigneeIds)) return { error: "Controlla reparto e assegnatari del task." };
    const error = dependencyError(candidate, db.tasks); if (error) return { error };
    if (pendingHandoff(task) && ("departmentId" in parsed.data || "assigneeIds" in parsed.data || ["In corso", "Completato"].includes(candidate.status))) return { error: "Completa o annulla il passaggio di consegna prima di modificare incarichi o avviare il task." };
    if (["In corso", "Completato"].includes(candidate.status) && blockers(candidate, db.tasks).length) return { error: "Completa prima i prerequisiti del task." };
    if (task.status === "Completato" && candidate.status !== "Completato" && dependentTasks(db.tasks, new Set([id])).some(item => ["In corso", "Completato"].includes(item.status))) return { error: "I task successivi sono già avviati. Riportali prima a Da fare per riaprire questo prerequisito." };
    const readyBefore = readyTaskIds(db.tasks), before = task.status;
    Object.assign(task, parsed.data);
    if (actor) { if (task.status !== before) notifyStateChange(db, project, actor.id, "task", task.id, `il task “${task.title}”`, before, task.status, task.assigneeIds); notifyNewlyReady(db, readyBefore, actor.id, project.id); }
    return { task };
  }); if (!result) return NextResponse.json({ error: "Task non trovato." }, { status: 404 }); return "error" in result ? NextResponse.json(result, { status: 409 }) : NextResponse.json(result); } catch (error) { return apiError(error); }
}
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession(); if (denied) return denied;
  try { const { id } = await context.params; const { result } = await updateDatabase(db => {
    if (!db.tasks.some(task => task.id === id)) return null;
    if (dependentTasks(db.tasks, new Set([id])).length) return { error: "Questo task è un prerequisito. Rimuovi prima i collegamenti dai task successivi." };
    const paths = removeCollaboration(db, new Set(), new Set([id])); db.tasks = db.tasks.filter(task => task.id !== id); db.notifications = db.notifications.filter(item => !(item.entityType === "task" && item.entityId === id)); return { paths };
  }); if (!result) return NextResponse.json({ error: "Task non trovato." }, { status: 404 }); if ("error" in result) return NextResponse.json(result, { status: 409 }); await removeFileBlobs(result.paths); return NextResponse.json({ ok: true }); } catch (error) { return apiError(error); }
}

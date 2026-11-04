import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
import { notifyStateChange } from "@/lib/notifications";
import { departments, type TaskHandoff } from "@/lib/types";
import { blockers, canAcceptHandoff, canHandoff, notifyWorkflow, pendingHandoff, workflowRecipients } from "@/lib/task-workflow";
const sendSchema = z.object({ toDepartment: z.enum(departments), toUserIds: z.array(z.string()).max(50).transform(ids => [...new Set(ids)]).default([]), note: z.string().trim().min(5).max(1500) });
const receiptSchema = z.object({ handoffId: z.string().min(1) });
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const parsed = sendSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Scegli reparto, destinatari e una nota di almeno 5 caratteri." }, { status: 400 }); const { id } = await context.params;
    const { result } = await updateDatabase(db => {
      const task = db.tasks.find(item => item.id === id); const project = db.projects.find(item => item.id === task?.projectId); if (!task || !project) return { error: "Task non trovato.", status: 404 };
      if (!canHandoff(task, actor)) return { error: "Il passaggio può essere avviato dal reparto responsabile, dagli assegnatari o dall’admin.", status: 403 };
      if (task.status === "Completato" || pendingHandoff(task)) return { error: "Il task è completato o ha già un passaggio da prendere in carico.", status: 409 };
      const { toDepartment, toUserIds, note } = parsed.data;
      if (!project.departmentIds.includes(toDepartment) || toDepartment === task.departmentId) return { error: "Scegli un altro reparto coinvolto nel progetto.", status: 400 };
      if (!toUserIds.every(id => db.users.some(user => user.id === id && user.active && user.role === "Collaboratore" && user.departmentIds.includes(toDepartment)))) return { error: "Controlla i destinatari del reparto scelto.", status: 400 };
      if (!db.users.some(user => user.active && user.role === "Collaboratore" && user.departmentIds.includes(toDepartment))) return { error: "Il reparto scelto non ha collaboratori attivi.", status: 400 };
      const beforeStatus = task.status;
      const handoff: TaskHandoff = { id: crypto.randomUUID(), fromId: actor.id, fromName: actor.name, toDepartment, toUserIds, note, createdAt: new Date().toISOString(), previousDepartmentId: task.departmentId, previousAssigneeIds: [...task.assigneeIds], previousStatus: task.status };
      task.handoffs = [...(task.handoffs || []), handoff]; task.departmentId = toDepartment; task.assigneeIds = [...toUserIds]; task.status = "Da fare";
      if (task.status !== beforeStatus) notifyStateChange(db, project, actor.id, "task", task.id, `il task “${task.title}”`, beforeStatus, task.status, task.assigneeIds);
      db.comments.push({ id: crypto.randomUUID(), projectId: task.projectId, taskId: task.id, authorId: actor.id, authorName: actor.name, body: `Passaggio di consegna a ${toDepartment}\n${note}`, mentionIds: [], createdAt: handoff.createdAt });
      notifyWorkflow(db, task, actor.id, workflowRecipients(db, task, toDepartment, toUserIds), "Passaggio da prendere in carico", `${actor.name} ti passa “${task.title}” per ${toDepartment}. ${note.slice(0, 180)}`);
      return { task, status: 200 };
    }); return "error" in result ? NextResponse.json({ error: result.error }, { status: result.status }) : NextResponse.json({ task: result.task });
  } catch (error) { return apiError(error); }
}
async function receipt(request: NextRequest, context: { params: Promise<{ id: string }> }, cancel: boolean) {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const parsed = receiptSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Passaggio non valido." }, { status: 400 }); const { id } = await context.params;
    const { result } = await updateDatabase(db => {
      const task = db.tasks.find(item => item.id === id); if (!task) return { error: "Task non trovato.", status: 404 };
      const handoff = pendingHandoff(task); if (!handoff || handoff.id !== parsed.data.handoffId) return { error: "Il passaggio è già stato gestito. Aggiorna la scheda.", status: 409 };
      const beforeStatus = task.status;
      if (cancel) {
        if (actor.role !== "Admin" && actor.id !== handoff.fromId) return { error: "Solo il mittente o l’admin può annullare il passaggio.", status: 403 };
        const recipients = workflowRecipients(db, task, handoff.toDepartment, handoff.toUserIds);
        handoff.cancelledAt = new Date().toISOString(); task.departmentId = handoff.previousDepartmentId;
        task.assigneeIds = handoff.previousAssigneeIds.filter(id => db.users.some(user => user.id === id && user.active && user.role === "Collaboratore" && (!task.departmentId || user.departmentIds.includes(task.departmentId))));
        task.status = blockers(task, db.tasks).length && handoff.previousStatus === "In corso" ? "Da fare" : handoff.previousStatus;
        notifyWorkflow(db, task, actor.id, recipients, "Passaggio annullato", `${actor.name} ha annullato il passaggio di “${task.title}”.`);
      } else {
        if (!canAcceptHandoff(task, actor)) return { error: "Questo passaggio è riservato ai destinatari del reparto.", status: 403 };
        if (blockers(task, db.tasks).length) return { error: "Completa i prerequisiti prima di prendere in carico il task.", status: 409 };
        handoff.acceptedAt = new Date().toISOString(); handoff.acceptedBy = actor.id; handoff.acceptedByName = actor.name;
        if (!task.assigneeIds.length) task.assigneeIds = [actor.id];
        if (task.status !== "Bloccato") task.status = "In corso";
        notifyWorkflow(db, task, actor.id, [handoff.fromId], "Passaggio preso in carico", `${actor.name} ha preso in carico “${task.title}” per ${handoff.toDepartment}.`);
      }
      const project = db.projects.find(item => item.id === task.projectId);
      if (project && task.status !== beforeStatus) notifyStateChange(db, project, actor.id, "task", task.id, `il task “${task.title}”`, beforeStatus, task.status, task.assigneeIds);
      return { task, status: 200 };
    }); return "error" in result ? NextResponse.json({ error: result.error }, { status: result.status }) : NextResponse.json({ task: result.task });
  } catch (error) { return apiError(error); }
}
export const PATCH = (request: NextRequest, context: { params: Promise<{ id: string }> }) => receipt(request, context, false);
export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) => receipt(request, context, true);

import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/http";
import { updateDatabase } from "@/lib/store";
import { taskFields } from "@/lib/task-validation";
import { blockers, dependencyError, validTaskAssignees } from "@/lib/task-workflow";
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireSession(); if (denied) return denied;
  const parsed = taskFields.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Controlla i dati del task." }, { status: 400 });
  try { const { id: projectId } = await context.params; const { result } = await updateDatabase(db => {
    const project = db.projects.find(item => item.id === projectId); if (!project) return { missing: true as const };
    if (parsed.data.milestoneId && !db.milestones.some(item => item.id === parsed.data.milestoneId && item.projectId === projectId)) return { error: "Milestone non valida." };
    if (!validTaskAssignees(db, project.departmentIds, parsed.data.departmentId, parsed.data.assigneeIds)) return { error: "Gli assegnatari devono appartenere al reparto del task o ai reparti del progetto." };
    const task = { id: crypto.randomUUID(), projectId, ...parsed.data, handoffs: [], createdAt: new Date().toISOString() };
    const error = dependencyError(task, db.tasks); if (error) return { error };
    if (["In corso", "Completato"].includes(task.status) && blockers(task, db.tasks).length) return { error: "Completa i prerequisiti prima di avviare questo task." };
    db.tasks.unshift(task); return { task };
  }); if ("missing" in result) return NextResponse.json({ error: "Progetto non trovato." }, { status: 404 }); return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json(result, { status: 201 }); } catch (error) { return apiError(error); }
}

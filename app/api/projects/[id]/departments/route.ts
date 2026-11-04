import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { departments, departmentStatuses } from "@/lib/types";
import { notifyStateChange } from "@/lib/notifications";
import { apiError } from "@/lib/http";
const schema = z.object({ department: z.enum(departments), status: z.enum(departmentStatuses) });
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 });
    const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Stato o reparto non valido." }, { status: 400 });
    const { department, status } = parsed.data;
    if (actor.role !== "Admin" && !actor.departmentIds.includes(department)) return NextResponse.json({ error: "Puoi aggiornare solo i reparti di cui fai parte." }, { status: 403 });
    const { id } = await context.params;
    const { result } = await updateDatabase(db => {
      const project = db.projects.find(project => project.id === id); if (!project) return null;
      if (!project.departmentIds.includes(department)) return { error: "Questo reparto non è coinvolto nel progetto." };
      const previous = project.departmentProgress?.[department]?.status || "Da avviare";
      project.departmentProgress = { ...project.departmentProgress, [department]: { status, updatedAt: new Date().toISOString(), updatedBy: actor.id } };
      if (previous !== status) notifyStateChange(db, project, actor.id, "project", project.id, `${department} nel progetto “${project.name}”`, previous, status);
      return { project };
    });
    if (!result) return NextResponse.json({ error: "Progetto non trovato." }, { status: 404 });
    return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json(result);
  } catch (error) { return apiError(error); }
}

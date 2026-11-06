import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase, updateDatabase } from "@/lib/store";
import { requireSession, apiError } from "@/lib/http";
import { departments, type Department } from "@/lib/types";
import { taskFields } from "@/lib/task-validation";
import { generalClientSchema } from "@/lib/client-validation";

const schema = taskFields.extend({ projectId: z.string().optional(), newProjectName: z.string().trim().min(2).max(100).optional(), clientId: z.string().optional(), projectDepartmentIds: z.array(z.enum(departments)).min(1).max(departments.length).default(["Web"] as [Department, ...Department[]]), newClient: generalClientSchema.partial().optional() });

export async function POST(request: NextRequest) {
  const denied = await requireSession(); if (denied) return denied;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Controlla i dati del task." }, { status: 400 });
  try {
    const { result } = await updateDatabase(db => {
      let project = parsed.data.projectId ? db.projects.find(item => item.id === parsed.data.projectId) : undefined;
      if (!project) {
        if (!parsed.data.newProjectName || (!parsed.data.clientId && !parsed.data.newClient)) return { error: "Indica un progetto oppure nome progetto e cliente per crearne uno nuovo." };
        const client = parsed.data.clientId ? db.clients.find(item => item.id === parsed.data.clientId) : parsed.data.newClient ? { id: crypto.randomUUID(), name: parsed.data.newClient.name || "", company: parsed.data.newClient.company || "", email: parsed.data.newClient.email || "", phone: parsed.data.newClient.phone || "", notes: parsed.data.newClient.notes || "", status: parsed.data.newClient.status || "Attivo", contactName: parsed.data.newClient.contactName || "", address: parsed.data.newClient.address || "", vatNumber: parsed.data.newClient.vatNumber || "", pec: parsed.data.newClient.pec || "", sdiCode: parsed.data.newClient.sdiCode || "", website: parsed.data.newClient.website || "", color: ["#d5e5de", "#ead9c8", "#dce0ef", "#eddfb7", "#e7d4d2"][db.clients.length % 5], createdAt: new Date().toISOString() } : undefined;
        if (!client?.id || !client.name || !client.company || !client.email) return { error: "Inserisci nome, azienda ed email del cliente." };
        if (parsed.data.newClient) db.clients.unshift(client);
        project = { id: crypto.randomUUID(), name: parsed.data.newProjectName, clientId: client.id, status: "In corso" as const, color: "#d7e9e1", description: "", departmentIds: parsed.data.projectDepartmentIds, assigneeIds: [], createdAt: new Date().toISOString() };
        db.projects.unshift(project);
      }
      const departmentId = parsed.data.departmentId || undefined;
      if (departmentId && !project.departmentIds.includes(departmentId)) return { error: "Il reparto del task non appartiene al progetto." };
      const validAssignees = parsed.data.assigneeIds.every(id => db.users.some(user => user.id === id && user.active && user.role === "Collaboratore" && (departmentId ? user.departmentIds.includes(departmentId) : user.departmentIds.some(item => project!.departmentIds.includes(item)))));
      if (!validAssignees) return { error: "L’assegnatario non appartiene ai reparti del progetto." };
      const task = { id: crypto.randomUUID(), projectId: project.id, milestoneId: parsed.data.milestoneId || "", title: parsed.data.title, description: parsed.data.description, dueDate: parsed.data.dueDate, status: parsed.data.status, assigneeIds: parsed.data.assigneeIds, departmentId, dependsOnIds: parsed.data.dependsOnIds, handoffs: [], createdAt: new Date().toISOString() };
      db.tasks.unshift(task); return { task, project };
    });
    return "error" in result ? NextResponse.json({ error: result.error }, { status: 400 }) : NextResponse.json(result, { status: 201 });
  } catch (error) { return apiError(error); }
}

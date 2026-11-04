import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase, updateDatabase } from "@/lib/store";
import { requireSession, apiError } from "@/lib/http";
import { departments, type Department } from "@/lib/types";
const schema = z.object({ name: z.string().trim().min(2).max(100), clientId: z.string().min(1), status: z.enum(["In corso", "In attesa", "Completato"]), description: z.string().trim().max(2000).optional().default(""), dueDate: z.string().optional().default(""), departmentIds: z.array(z.enum(departments)).min(1), assigneeIds: z.array(z.string()).default([]) });
function validAssignments(assigneeIds: string[], departmentIds: Department[], users: Awaited<ReturnType<typeof getDatabase>>["users"]) { return assigneeIds.every(id => users.some(user => user.id === id && user.active && user.departmentIds.some(department => departmentIds.includes(department)))); }
export async function GET() {
  const denied = await requireSession(); if (denied) return denied;
  try { const db = await getDatabase(); return NextResponse.json({ projects: db.projects, clients: db.clients, milestones: db.milestones, tasks: db.tasks, users: db.users.filter(user => user.active).map(({ passwordHash: _secret, ...user }) => user) }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest) {
  const denied = await requireSession(); if (denied) return denied;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Controlla i dati del progetto." }, { status: 400 });
  try {
    const { result } = await updateDatabase(db => {
      if (!db.clients.some(client => client.id === parsed.data.clientId)) return { error: "Seleziona un cliente valido." };
      if (!validAssignments(parsed.data.assigneeIds, parsed.data.departmentIds, db.users)) return { error: "Gli assegnatari devono appartenere a uno dei reparti selezionati." };
      const project = { id: crypto.randomUUID(), ...parsed.data, color: ["#d7e9e1", "#f1e0cc", "#e1e3f1", "#f1e8c9", "#f0dedd"][db.projects.length % 5], createdAt: new Date().toISOString() };
      db.projects.unshift(project); return { project };
    });
    return "error" in result ? NextResponse.json({ error: result.error }, { status: 400 }) : NextResponse.json({ project: result.project }, { status: 201 });
  } catch (error) { return apiError(error); }
}

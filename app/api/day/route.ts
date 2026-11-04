import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
export async function GET() {
  try { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const db = await getDatabase(); const studioView = user.role === "Admin";
    const tasks = db.tasks.filter(task => studioView || task.assigneeIds.includes(user.id));
    const projectIds = new Set(tasks.map(task => task.projectId));
    const projects = db.projects.filter(project => studioView || projectIds.has(project.id) || project.assigneeIds.includes(user.id) || project.departmentIds.some(department => user.departmentIds.includes(department)));
    const milestones = db.milestones.filter(item => studioView || item.assigneeIds.includes(user.id));
    return NextResponse.json({ studioView, tasks, projects, milestones, clients: db.clients.filter(client => projects.some(project => project.clientId === client.id)), entries: db.entries.filter(entry => studioView || entry.userId === user.id) });
  } catch (error) { return apiError(error); }
}

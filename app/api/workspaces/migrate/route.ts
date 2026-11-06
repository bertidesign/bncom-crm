import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { getDatabase, updateDatabase } from "@/lib/store";
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sessione scaduta." }, { status: 401 });
  const body = await request.json().catch(() => null); const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  if (!projectId) return NextResponse.json({ error: "Seleziona un progetto da trasferire." }, { status: 400 });
  try {
    const source = await getDatabase("private"); const sourceProject = source.projects.find(project => project.id === projectId); if (!sourceProject) return NextResponse.json({ error: "Progetto personale non trovato." }, { status: 404 });
    const sourceClient = source.clients.find(client => client.id === sourceProject.clientId); if (!sourceClient) return NextResponse.json({ error: "Il progetto non ha un cliente valido." }, { status: 400 });
    const result = await updateDatabase(company => {
      const existingClient = company.clients.find(client => client.email.toLowerCase() === sourceClient.email.toLowerCase() || client.company.toLowerCase() === sourceClient.company.toLowerCase());
      const clientId = existingClient?.id || sourceClient.id; if (!existingClient) company.clients.unshift({ ...sourceClient, id: clientId });
      const existingProject = company.projects.some(project => project.id === sourceProject.id); const targetProject = existingProject ? { ...sourceProject, id: crypto.randomUUID(), clientId } : { ...sourceProject, clientId };
      company.projects.unshift(targetProject);
      const sourceMilestones = source.milestones.filter(item => item.projectId === projectId); const milestoneIds = new Map(sourceMilestones.map(item => [item.id, crypto.randomUUID()]));
      company.milestones.unshift(...sourceMilestones.map(item => ({ ...item, id: milestoneIds.get(item.id)!, projectId: targetProject.id })));
      const sourceTasks = source.tasks.filter(item => item.projectId === projectId); const taskIds = new Map(sourceTasks.map(item => [item.id, crypto.randomUUID()]));
      company.tasks.unshift(...sourceTasks.map(item => ({ ...item, id: taskIds.get(item.id)!, projectId: targetProject.id, milestoneId: item.milestoneId ? milestoneIds.get(item.milestoneId) : undefined })));
      company.entries.unshift(...source.entries.filter(item => item.projectId === projectId).map(item => ({ ...item, id: crypto.randomUUID(), projectId: targetProject.id, taskId: item.taskId ? taskIds.get(item.taskId) : undefined })));
      company.comments.unshift(...source.comments.filter(item => item.projectId === projectId).map(item => ({ ...item, id: crypto.randomUUID(), projectId: targetProject.id, taskId: item.taskId ? taskIds.get(item.taskId) : undefined })));
      company.files.unshift(...source.files.filter(item => item.projectId === projectId).map(item => ({ ...item, id: crypto.randomUUID(), projectId: targetProject.id, taskId: item.taskId ? taskIds.get(item.taskId) : undefined })));
      return targetProject;
    }, "company");
    await updateDatabase(privateDb => { privateDb.projects = privateDb.projects.filter(project => project.id !== projectId); privateDb.milestones = privateDb.milestones.filter(item => item.projectId !== projectId); privateDb.tasks = privateDb.tasks.filter(item => item.projectId !== projectId); privateDb.entries = privateDb.entries.filter(item => item.projectId !== projectId); privateDb.comments = privateDb.comments.filter(item => item.projectId !== projectId); privateDb.files = privateDb.files.filter(item => item.projectId !== projectId); return true; }, "private");
    return NextResponse.json({ project: result.result }, { status: 201 });
  } catch (error) { return apiError(error); }
}

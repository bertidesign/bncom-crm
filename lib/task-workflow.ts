import type { Database, Department, PublicUser, Task } from "@/lib/types";
import { preferencesFor } from "@/lib/settings";
export function pendingHandoff(task: Task) {
  const latest = task.handoffs?.at(-1);
  return latest && !latest.acceptedAt && !latest.cancelledAt ? latest : undefined;
}
export function blockers(task: Task, tasks: Task[]) {
  return (task.dependsOnIds || []).filter(id => !tasks.some(item => item.id === id && item.status === "Completato"));
}
export function dependencyError(task: Pick<Task, "id" | "projectId" | "dependsOnIds">, tasks: Task[]) {
  const dependencies = task.dependsOnIds || [];
  if (dependencies.includes(task.id)) return "Un task non può dipendere da sé stesso.";
  if (dependencies.some(id => !tasks.some(item => item.id === id && item.projectId === task.projectId))) return "I prerequisiti devono essere task dello stesso progetto.";
  const graph = new Map(tasks.filter(item => item.projectId === task.projectId).map(item => [item.id, item.dependsOnIds || []]));
  graph.set(task.id, dependencies);
  const visiting = new Set<string>(), visited = new Set<string>();
  function cyclic(id: string): boolean { if (visiting.has(id)) return true; if (visited.has(id)) return false; visiting.add(id); for (const next of graph.get(id) || []) if (cyclic(next)) return true; visiting.delete(id); visited.add(id); return false; }
  return [...graph.keys()].some(cyclic) ? "Questi prerequisiti creano un ciclo. Modifica il collegamento tra i task." : null;
}
export function dependentTasks(tasks: Task[], ids: Set<string>) { return tasks.filter(task => !ids.has(task.id) && task.dependsOnIds?.some(id => ids.has(id))); }
export function readyTaskIds(tasks: Task[]) { return new Set(tasks.filter(task => !blockers(task, tasks).length).map(task => task.id)); }
export function workflowRecipients(db: Database, task: Task, department = task.departmentId, assignees = task.assigneeIds) {
  return db.users.filter(user => user.active && user.role === "Collaboratore" && (assignees.length ? assignees.includes(user.id) : department ? user.departmentIds.includes(department) : false)).map(user => user.id);
}
export function notifyWorkflow(db: Database, task: Task, actorId: string, ids: string[], title: string, message: string) {
  for (const id of new Set(ids)) {
    const user = db.users.find(user => user.id === id && user.active && user.role === "Collaboratore");
    if (!user || id === actorId || !preferencesFor(user.preferences).notifications.workflow) continue;
    db.notifications.unshift({ id: crypto.randomUUID(), recipientId: id, actorId, title, message, entityType: "task", entityId: task.id, projectId: task.projectId, createdAt: new Date().toISOString() });
  }
}
export function notifyNewlyReady(db: Database, before: Set<string>, actorId: string, projectId: string) {
  for (const task of db.tasks) if (task.projectId === projectId && !before.has(task.id) && task.status !== "Completato" && task.status !== "Bloccato" && !blockers(task, db.tasks).length && !pendingHandoff(task)) notifyWorkflow(db, task, actorId, workflowRecipients(db, task), "Task pronto a partire", `I prerequisiti di “${task.title}” sono completati. Puoi iniziare il lavoro.`);
}
export function canHandoff(task: Task, user: PublicUser) { return user.role === "Admin" || task.assigneeIds.includes(user.id) || Boolean(task.departmentId && user.departmentIds.includes(task.departmentId)); }
export function canAcceptHandoff(task: Task, user: PublicUser) { const handoff = pendingHandoff(task); return Boolean(handoff && user.role === "Collaboratore" && user.departmentIds.includes(handoff.toDepartment) && (!handoff.toUserIds.length || handoff.toUserIds.includes(user.id))); }
export function validTaskAssignees(db: Database, projectDepartments: Department[], departmentId: Department | undefined, ids: string[]) {
  return (!departmentId || projectDepartments.includes(departmentId)) && ids.every(id => db.users.some(user => user.id === id && user.active && user.role === "Collaboratore" && (departmentId ? user.departmentIds.includes(departmentId) : user.departmentIds.some(department => projectDepartments.includes(department)))));
}

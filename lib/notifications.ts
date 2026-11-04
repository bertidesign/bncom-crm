import type { Database, Notification, Project } from "@/lib/types";

export function notifyStateChange(db: Database, project: Project, actorId: string, entityType: Notification["entityType"], entityId: string, label: string, from: string, to: string, assigneeIds: string[] = []) {
  const departmentMembers = db.users.filter(user => user.active && user.departmentIds.some(department => project.departmentIds.includes(department))).map(user => user.id);
  const recipients = new Set([...project.assigneeIds, ...departmentMembers, ...assigneeIds]);
  recipients.delete(actorId);
  for (const id of recipients) if (!db.users.some(user => user.id === id && user.active && user.role === "Collaboratore")) recipients.delete(id);
  const actorName = db.users.find(user => user.id === actorId)?.name || "Un collega";
  const notificationText = `${actorName} ha aggiornato ${label}: ${from} → ${to}.`;
  const createdAt = new Date().toISOString();
  for (const recipientId of recipients) {
    db.notifications.unshift({ id: crypto.randomUUID(), recipientId, actorId, title: "Aggiornamento di stato", message: notificationText, entityType, entityId, projectId: project.id, createdAt });
  }
}

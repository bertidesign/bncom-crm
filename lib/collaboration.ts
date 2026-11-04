import { preferencesFor } from "@/lib/settings";
import type { Database, ProjectComment, PublicUser } from "@/lib/types";
export function validContext(db: Database, projectId: string, taskId?: string) {
  return db.projects.some(project => project.id === projectId) && (!taskId || db.tasks.some(task => task.id === taskId && task.projectId === projectId));
}
export function notifyMentions(db: Database, comment: ProjectComment, actor: PublicUser, previousIds: string[] = []) {
  const type = comment.taskId ? "task" : "project";
  for (const id of new Set(comment.mentionIds)) {
    const user = db.users.find(user => user.id === id && user.active && user.role === "Collaboratore");
    if (!user || id === actor.id || previousIds.includes(id) || !preferencesFor(user.preferences).notifications.mentions) continue;
    db.notifications.unshift({ id: crypto.randomUUID(), recipientId: id, actorId: actor.id, title: "Ti hanno menzionato", message: `${actor.name}: ${comment.body.slice(0, 180)}`, entityType: type, entityId: comment.taskId || comment.projectId, projectId: comment.projectId, createdAt: new Date().toISOString() });
  }
}
// Remove collaboration metadata atomically with its parent. Return paths so Blob
// deletion happens only after the successful database commit, never in a retry.
export function removeCollaboration(db: Database, projectIds: Set<string>, taskIds = new Set<string>()) {
  const matches = (item: { projectId: string; taskId?: string }) => projectIds.has(item.projectId) || Boolean(item.taskId && taskIds.has(item.taskId));
  const paths = db.files.filter(matches).map(file => file.blobPath);
  db.files = db.files.filter(item => !matches(item));
  db.comments = db.comments.filter(item => !matches(item));
  db.pendingUploads = db.pendingUploads.filter(item => !matches(item));
  for (const entry of db.entries) if (entry.taskId && taskIds.has(entry.taskId)) delete entry.taskId;
  return paths;
}

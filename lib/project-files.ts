import "server-only";
import { del, get, head } from "@vercel/blob";
import { getDatabase, updateDatabase } from "@/lib/store";
import { validContext } from "@/lib/collaboration";
import { MAX_FILE_SIZE } from "@/lib/file-rules";
export function blobCredentials() { if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Storage file non configurato."); return { token: process.env.BLOB_READ_WRITE_TOKEN }; }
export function validFilePath(path: string) { return /^crm\/files\/[a-f0-9-]{36}$/.test(path); }
export async function removeFileBlobs(paths: string[]) {
  const safe = [...new Set(paths)].filter(validFilePath); if (!safe.length) return;
  try { await del(safe, blobCredentials()); } catch { console.error("Rimozione allegati da Blob non completata."); }
}
export async function downloadFile(path: string) { if (!validFilePath(path)) throw new Error("Percorso file non valido"); return get(path, { ...blobCredentials(), access: "private" }); }
export async function completeFile(id: string, callbackPath?: string) {
  const db = await getDatabase();
  const existing = db.files.find(file => file.id === id); if (existing) return existing;
  const ticket = db.pendingUploads.find(item => item.id === id);
  if (!ticket) { if (callbackPath) await removeFileBlobs([callbackPath]); throw new Error("Caricamento scaduto o rimosso."); }
  if (callbackPath && callbackPath !== ticket.blobPath) throw new Error("Percorso caricamento non valido.");
  const metadata = await head(ticket.blobPath, blobCredentials());
  if (metadata.size !== ticket.size || metadata.size > MAX_FILE_SIZE || metadata.contentType.split(";")[0].trim() !== ticket.contentType) {
    await removeFileBlobs([ticket.blobPath]); await updateDatabase(db => { db.pendingUploads = db.pendingUploads.filter(item => item.id !== id); });
    throw new Error("Dimensione o formato del file non corrispondente.");
  }
  const { result } = await updateDatabase(db => {
    const existing = db.files.find(file => file.id === id); if (existing) return { file: existing };
    const pending = db.pendingUploads.find(item => item.id === id);
    if (!pending || !validContext(db, pending.projectId, pending.taskId) || !db.users.some(user => user.id === pending.uploadedBy && user.active)) return { error: "Progetto, task o account non più disponibile." };
    const versions = db.files.filter(file => file.groupId === pending.groupId);
    if (pending.groupId !== pending.id && !versions.length) return { error: "Il file originale è stato rimosso." };
    const { expiresAt: _expires, ...fields } = pending;
    const file = { ...fields, version: Math.max(0, ...versions.map(file => file.version)) + 1, createdAt: new Date().toISOString() };
    db.files.push(file); db.pendingUploads = db.pendingUploads.filter(item => item.id !== id); return { file };
  });
  if ("error" in result) { await removeFileBlobs([ticket.blobPath]); throw new Error(result.error); }
  return result.file;
}

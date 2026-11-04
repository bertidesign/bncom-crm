import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
import { validContext } from "@/lib/collaboration";
import { fileContentType, MAX_FILE_SIZE } from "@/lib/file-rules";
const schema = z.object({ projectId: z.string().min(1), taskId: z.string().optional(), name: z.string().trim().min(1).max(180).refine(value => !/[\x00-\x1f\/\\]/.test(value)), size: z.number().int().positive().max(MAX_FILE_SIZE), versionOf: z.string().optional() });
export async function POST(request: NextRequest) {
  try { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success || !fileContentType(parsed.data.name)) return NextResponse.json({ error: "File non supportato o superiore a 25 MB." }, { status: 400 }); if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Storage file non disponibile." }, { status: 503 });
    const { result } = await updateDatabase(db => { const fields = parsed.data; if (!validContext(db, fields.projectId, fields.taskId)) return { error: "Progetto o task non trovato." }; const original = fields.versionOf ? db.files.find(file => file.id === fields.versionOf && file.projectId === fields.projectId && (file.taskId || "") === (fields.taskId || "")) : null; if (fields.versionOf && !original) return { error: "File originale non trovato." }; if (db.pendingUploads.filter(item => item.uploadedBy === user.id).length >= 10) return { error: "Troppi caricamenti in corso. Riprova più tardi." }; const id = crypto.randomUUID(); const ticket = { id, projectId: fields.projectId, taskId: fields.taskId, groupId: original?.groupId || id, name: fields.name, size: fields.size, contentType: fileContentType(fields.name), blobPath: `crm/files/${id}`, uploadedBy: user.id, uploadedByName: user.name, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }; db.pendingUploads.push(ticket); return { ticket: { id, pathname: ticket.blobPath, contentType: ticket.contentType } }; });
    return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json(result, { status: 201 });
  } catch (error) { return apiError(error); }
}

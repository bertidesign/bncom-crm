import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { removeFileBlobs } from "@/lib/project-files";
import { apiError } from "@/lib/http";
export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const { id } = await context.params; const { result } = await updateDatabase(db => { const file = db.files.find(file => file.id === id); if (!file) return { status: 404 as const }; if (file.uploadedBy !== user.id && user.role !== "Admin") return { status: 403 as const }; db.files = db.files.filter(file => file.id !== id); return { status: 200 as const, path: file.blobPath }; }); if (result.status === 200 && result.path) await removeFileBlobs([result.path]); return NextResponse.json(result.status === 200 ? { ok: true } : { error: result.status === 403 ? "Puoi eliminare solo i tuoi allegati." : "File non trovato." }, { status: result.status }); } catch (error) { return apiError(error); }
}

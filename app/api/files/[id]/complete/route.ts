import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/store";
import { completeFile } from "@/lib/project-files";
import { apiError } from "@/lib/http";
export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const { id } = await context.params; const db = await getDatabase(); const item = db.files.find(file => file.id === id) || db.pendingUploads.find(file => file.id === id); if (!item) return NextResponse.json({ error: "Caricamento non trovato o scaduto." }, { status: 404 }); if (item.uploadedBy !== user.id && user.role !== "Admin") return NextResponse.json({ error: "Operazione non autorizzata." }, { status: 403 }); const { blobPath: _path, ...file } = await completeFile(id); return NextResponse.json({ file }); } catch (error) { return apiError(error); }
}

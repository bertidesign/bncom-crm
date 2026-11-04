import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/store";
import { downloadFile } from "@/lib/project-files";
import { apiError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const { id } = await context.params; const db = await getDatabase(); const file = db.files.find(file => file.id === id && db.projects.some(project => project.id === file.projectId)); if (!file) return NextResponse.json({ error: "File non trovato." }, { status: 404 }); const result = await downloadFile(file.blobPath); if (!result || result.statusCode !== 200) return NextResponse.json({ error: "File non disponibile." }, { status: 404 }); return new NextResponse(result.stream, { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="allegato"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16)}`)}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); } catch (error) { return apiError(error); }
}

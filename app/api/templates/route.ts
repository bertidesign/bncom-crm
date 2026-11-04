import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireSession, apiError } from "@/lib/http";
import { getDatabase, updateDatabase } from "@/lib/store";
import { templateFromProject, templateSchema } from "@/lib/project-templates";
export async function GET() { const denied = await requireSession(); if (denied) return denied; try { return NextResponse.json({ templates: (await getDatabase()).templates }); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) {
  try { const auth = await requireAdmin(); if (auth.response) return auth.response; const body = await request.json().catch(() => null);
    const { result } = await updateDatabase(db => {
      let source = body;
      if (body?.fromProjectId) { const snapshot = z.object({ fromProjectId: z.string(), name: z.string().trim().min(2).max(100), description: z.string().trim().max(2000).default("") }).safeParse(body); if (!snapshot.success) return { error: "Controlla nome e descrizione del modello." }; const project = db.projects.find(item => item.id === snapshot.data.fromProjectId); if (!project) return { error: "Progetto non trovato." }; source = templateFromProject(db, project, snapshot.data.name, snapshot.data.description); }
      const parsed = templateSchema.safeParse(source); if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Modello non valido." };
      const stamp = new Date().toISOString(); const template = { id: crypto.randomUUID(), ...parsed.data, createdAt: stamp, updatedAt: stamp }; db.templates.push(template); return { template };
    }); return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json(result, { status: 201 });
  } catch (error) { return apiError(error); }
}

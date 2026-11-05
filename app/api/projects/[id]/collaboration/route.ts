import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase, updateDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
import { notifyMentions, validContext } from "@/lib/collaboration";
const schema = z.object({ body: z.string().trim().min(1).max(5000), taskId: z.string().optional(), mentionIds: z.array(z.string()).max(30).default([]) });
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const { id } = await context.params; const db = await getDatabase(); const taskId = request.nextUrl.searchParams.get("taskId") || undefined;
    if (!validContext(db, id, taskId)) return NextResponse.json({ error: "Progetto o task non trovato." }, { status: 404 });
    const matches = (item: { projectId: string; taskId?: string }) => item.projectId === id && (taskId ? item.taskId === taskId : !item.taskId);
    return NextResponse.json({ comments: db.comments.filter(matches), files: db.files.filter(matches).map(({ blobPath: _path, ...file }) => file), users: db.users.filter(user => user.active && user.role === "Collaboratore").map(user => ({ id: user.id, name: user.name, avatarUrl: user.avatarUrl, jobTitle: user.jobTitle, departmentIds: user.departmentIds })) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Scrivi un commento fino a 5.000 caratteri." }, { status: 400 }); const { id } = await context.params;
    const { result } = await updateDatabase(db => { if (!validContext(db, id, parsed.data.taskId)) return null; if (parsed.data.mentionIds.some(id => !db.users.some(user => user.id === id && user.active && user.role === "Collaboratore"))) return { error: "Una persona menzionata non è disponibile." }; const comment = { id: crypto.randomUUID(), projectId: id, ...parsed.data, authorId: actor.id, authorName: actor.name, createdAt: new Date().toISOString() }; db.comments.push(comment); notifyMentions(db, comment, actor); return { comment }; });
    if (!result) return NextResponse.json({ error: "Progetto o task non trovato." }, { status: 404 }); return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json(result, { status: 201 });
  } catch (error) { return apiError(error); }
}

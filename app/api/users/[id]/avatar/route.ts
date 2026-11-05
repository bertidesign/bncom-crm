import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase, updateDatabase } from "@/lib/store";
import { decodeLogo, readAvatar, removeAvatar, uploadAvatar } from "@/lib/blob-storage";
import { publicUser } from "@/lib/password";
import { apiError } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const actor = await getCurrentUser(); if (!actor) return new NextResponse(null, { status: 401 }); const { id } = await context.params; const user = (await getDatabase()).users.find(item => item.id === id && (item.active || actor.role === "Admin")); if (!user?.avatarPath) return new NextResponse(null, { status: 404 }); const result = await readAvatar(user.avatarPath); if (!result || result.statusCode !== 200) return new NextResponse(null, { status: 404 }); if (!["image/png", "image/jpeg", "image/webp"].includes(result.blob.contentType)) return new NextResponse(null, { status: 415 }); return new NextResponse(result.stream, { headers: { "Content-Type": result.blob.contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } }); } catch { return new NextResponse(null, { status: 503 }); }
}
async function change(request: NextRequest, context: { params: Promise<{ id: string }> }, remove: boolean) {
  let pendingPath: string | undefined;
  try {
    const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const { id } = await context.params;
    if (actor.id !== id && actor.role !== "Admin") return NextResponse.json({ error: "Puoi modificare solo la tua foto." }, { status: 403 });
    const previous = (await getDatabase()).users.find(item => item.id === id); if (!previous) return NextResponse.json({ error: "Account non trovato." }, { status: 404 });
    if (Number(request.headers.get("content-length")) > 450000) return NextResponse.json({ error: "Immagine troppo grande." }, { status: 413 });
    const body = remove ? null : await request.json().catch(() => null); const image = !remove && typeof body?.image === "string" ? decodeLogo(body.image) : null;
    if (!remove && !image) return NextResponse.json({ error: "Immagine non valida. Usa PNG, JPEG o WebP." }, { status: 400 });
    if (!remove && !process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Storage foto non disponibile." }, { status: 503 });
    const uploaded = image ? await uploadAvatar(image) : null;
    pendingPath = uploaded?.path;
    const { result } = await updateDatabase(db => { const user = db.users.find(item => item.id === id); if (!user) return { status: 404 as const }; if (user.avatarPath !== previous.avatarPath) return { status: 409 as const }; user.avatarPath = uploaded?.path; user.avatarUrl = uploaded ? `/api/users/${encodeURIComponent(id)}/avatar?v=${uploaded.version}` : ""; return { status: 200 as const, user: publicUser(user) }; });
    if (result.status !== 200) { if (uploaded) await removeAvatar(uploaded.path); return NextResponse.json({ error: result.status === 409 ? "La foto è stata aggiornata. Ricarica il profilo." : "Account non trovato." }, { status: result.status }); }
    pendingPath = undefined;
    await removeAvatar(previous.avatarPath); return NextResponse.json({ user: result.user });
  } catch (error) { if (pendingPath) await removeAvatar(pendingPath); return apiError(error); }
}
export const PUT = (request: NextRequest, context: { params: Promise<{ id: string }> }) => change(request, context, false);
export const DELETE = (request: NextRequest, context: { params: Promise<{ id: string }> }) => change(request, context, true);

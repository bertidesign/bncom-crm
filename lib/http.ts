import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
export async function requireSession() {
  return await getCurrentUser() ? null : NextResponse.json({ error: "Sessione scaduta. Accedi di nuovo." }, { status: 401 });
}
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Sessione scaduta. Accedi di nuovo." }, { status: 401 }) };
  if (user.role !== "Admin") return { user: null, response: NextResponse.json({ error: "Questa operazione è riservata agli amministratori." }, { status: 403 }) };
  return { user, response: null };
}
export function apiError(error: unknown) {
  console.error(error);
  const message = error instanceof Error ? error.message : "";
  if (error && typeof error === "object" && "status" in error && "bodyPreview" in error && message.startsWith("Apple Calendar")) {
    const diagnostic = error as { status: number; url: string; contentType: string | null; bodyPreview: string };
    return NextResponse.json({ error: message, diagnostic: { status: diagnostic.status, url: diagnostic.url.replace(/https?:\/\/[^/]+/i, "[HOST_REDACTED]"), contentType: diagnostic.contentType, bodyPreview: diagnostic.bodyPreview } }, { status: 502 });
  }
  if (message.includes("DATABASE_URL non configurata")) return NextResponse.json({ error: message }, { status: 503 });
  if (message.startsWith("Apple Calendar")) return NextResponse.json({ error: message.replace(/Authorization[^\n]*/gi, "Authorization [REDACTED]") }, { status: 502 });
  return NextResponse.json({ error: "Si è verificato un errore. Riprova." }, { status: 500 });
}

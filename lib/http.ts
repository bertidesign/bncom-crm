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
  if (message.includes("DATABASE_URL non configurata")) return NextResponse.json({ error: message }, { status: 503 });
  return NextResponse.json({ error: "Si è verificato un errore. Riprova." }, { status: 500 });
}

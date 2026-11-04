import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
export async function requireSession() { return await isAuthenticated() ? null : NextResponse.json({ error: "Sessione scaduta. Accedi di nuovo." }, { status: 401 }); }
export function apiError(error: unknown) {
  console.error(error);
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL non configurata")) return NextResponse.json({ error: message }, { status: 503 });
  return NextResponse.json({ error: "Si è verificato un errore. Riprova." }, { status: 500 });
}

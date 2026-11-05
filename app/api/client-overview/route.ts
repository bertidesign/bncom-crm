import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
import { dateOffset } from "@/lib/client-domain";
export async function GET() {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const db = await getDatabase(); const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" }); const week = dateOffset(today, 7);
    return NextResponse.json({ clients: db.clients.map(client => ({ id: client.id, name: client.name, color: client.color })), services: db.clientServices.filter(service => service.status === "Attivo" && db.clients.some(client => client.id === service.clientId)), posts: db.clientPosts.filter(post => post.status !== "Pubblicato" && post.date && post.date <= week && db.clients.some(client => client.id === post.clientId)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 30), today });
  } catch (error) { return apiError(error); }
}

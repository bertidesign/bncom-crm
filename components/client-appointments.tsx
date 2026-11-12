"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import type { Project } from "@/lib/types";
import type { CalendarEvent } from "@/lib/settings";
import { shortDate } from "@/lib/client-domain";
export function ClientAppointments({ clientId, projects }: { clientId: string; projects: Project[] }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]); const [busy, setBusy] = useState("");
  useEffect(() => { void fetch(`/api/calendar/events?clientId=${encodeURIComponent(clientId)}`).then(response => response.ok ? response.json() : null).then(body => setEvents(body?.events || [])).catch(() => {}); }, [clientId]);
  async function convert(event: CalendarEvent) { const project = projects[0]; if (!project) return; setBusy(event.uid); const response = await fetch("/api/quick-create/task", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, title: event.title, description: [event.briefing, event.debriefing].filter(Boolean).join("\n\n"), dueDate: event.date, status: "Da fare", assigneeIds: event.assigneeIds || [], dependsOnIds: [] }) }); if (response.ok) setEvents(current => current.filter(item => item.uid !== event.uid)); setBusy(""); }
  return <section className="client-section"><div className="client-section-heading"><div><h2>Appuntamenti</h2><p>Storico e prossimi incontri collegati al cliente.</p></div><CalendarDays size={18}/></div>{events.length ? events.sort((a, b) => `${b.date}${b.time || ""}`.localeCompare(`${a.date}${a.time || ""}`)).map(event => <div className="client-appointment-row" key={event.uid}><div><strong>{event.title}</strong><small>{shortDate(event.date)}{event.time ? ` · ${event.time}` : ""}{event.locationType === "fuori-studio" ? " · Fuori studio" : " · In studio"}</small>{event.briefing && <p><b>Briefing:</b> {event.briefing}</p>}{event.debriefing && <p><b>Debriefing:</b> {event.debriefing}</p>}</div><button className="button-outline" disabled={busy === event.uid || !projects.length} onClick={() => void convert(event)}><Check size={14}/> {busy === event.uid ? "Conversione…" : "Converti in task"}</button></div>) : <p className="client-empty">Nessun appuntamento collegato.</p>}</section>;
}

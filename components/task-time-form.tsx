"use client";
import { useState, type FormEvent } from "react";
import { Check, Clock3 } from "lucide-react";
import type { PublicUser, Task } from "@/lib/types";
export function TaskTimeForm({ task, user, onSaved, onCancel }: { task: Task; user: PublicUser; onSaved: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setError("");
    try { const response = await fetch("/api/work-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: task.projectId, taskId: task.id, person: user.name, description: form.get("description"), hours: Number(form.get("hours")), date: form.get("date") }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); onSaved(); } catch (e) { setError(e instanceof Error ? e.message : "Salvataggio non riuscito."); } finally { setBusy(false); }
  }
  return <form className="task-time-form" onSubmit={submit}><h4><Clock3 size={16}/> Registra il lavoro su questo task</h4>{error && <p role="alert" className="collab-error">{error}</p>}<label className="form-field"><span>Lavoro effettuato</span><textarea name="description" defaultValue={task.title} minLength={5} maxLength={500} required rows={2}/></label><div className="form-two"><label className="form-field"><span>Ore</span><input type="number" name="hours" min={0.25} max={24} step={0.25} placeholder="es. 1,5" required/></label><label className="form-field"><span>Data</span><input type="date" name="date" defaultValue={new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" })} required/></label></div><div className="collab-form-actions"><button type="button" className="button-outline" onClick={onCancel}>Annulla</button><button className="button-primary" disabled={busy}><Check size={14}/>{busy ? "Salvataggio…" : "Registra ore"}</button></div></form>;
}

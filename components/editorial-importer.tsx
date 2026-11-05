"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Upload, X } from "lucide-react";
import type { ClientPost } from "@/lib/client-domain";
import { postStatuses } from "@/lib/client-domain";
import type { EditorialPlan, ImportPreview, ImportRow, ImportedPostData } from "@/lib/editorial-import-types";
import { postSchema } from "@/lib/client-validation";

type Props = { clientId: string; posts: ClientPost[]; defaultChannel: string; onChanged: () => Promise<unknown>; onDirty: (dirty: boolean) => void; onClose: () => void };
export function EditorialImporter({ clientId, posts, defaultChannel, onChanged, onDirty, onClose }: Props) {
  const [plans, setPlans] = useState<EditorialPlan[]>([]);
  const [destination, setDestination] = useState("");
  const [planName, setPlanName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [edits, setEdits] = useState<Record<string, ImportedPostData>>({});
  const [channel, setChannel] = useState(defaultChannel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const newPlanId = useRef("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { let active = true; fetch(`/api/clients/${clientId}/editorial-import`).then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error); if (active) setPlans(body.plans); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [clientId]);
  const allRows = useMemo(() => preview?.sheets.flatMap(s => s.rows) || [], [preview]);
  const previousByKey = useMemo(() => new Map(posts.filter(post => post.importSource?.planId === destination).map(post => [post.importSource!.key, post])), [posts, destination]);
  const existing = (row: ImportRow) => previousByKey.get(row.sourceKey);
  const effective = (row: ImportRow) => {
    if (edits[row.sourceKey]) return edits[row.sourceKey];
    const previous = existing(row);
    return { ...row.data, channel: previous?.channel || channel, date: row.data.date || previous?.date || "", time: previous?.time || "", status: previous?.status || row.data.status, assetUrl: previous?.assetUrl || "", approver: previous?.approver || "" };
  };
  const isSelected = (row: ImportRow) => selected[row.sourceKey] ?? !existing(row);
  const visibleRows = allRows.filter(row => sheets.includes(row.sheet));
  const chosen = visibleRows.filter(isSelected);
  const problems = chosen.flatMap(row => { const parsed = postSchema.safeParse(effective(row)); return parsed.success ? [] : [`${row.sheet} · ${row.sourceRef}: ${parsed.error.issues[0]?.path[0] === "channel" ? "Indica il canale di pubblicazione." : parsed.error.issues[0]?.message}`]; });
  function edit(row: ImportRow, patch: Partial<ImportedPostData>) { setEdits(current => ({ ...current, [row.sourceKey]: { ...effective(row), ...patch } })); }
  async function read(file?: File) {
    if (!file) return; setError(""); setDone("");
    if (!/\.xlsx$/i.test(file.name) || file.size > 4 * 1024 * 1024) { setError("Scegli un Excel .xlsx fino a 4 MB. Salva i vecchi .xls come .xlsx prima di caricarli."); return; }
    setBusy(true);
    try { const form = new FormData(); form.set("file", file); const response = await fetch(`/api/clients/${clientId}/editorial-import`, { method: "POST", body: form }); const body = await response.json(); if (!response.ok) throw new Error(body.error); const result = body as ImportPreview; setPreview(result); setPlanName(file.name.replace(/\.xlsx$/i, "")); setSheets(result.sheets.filter(sheet => sheet.rows.length).slice(0, 1).map(s => s.name)); setSelected({}); setEdits({}); onDirty(true); } catch (e) { setError(e instanceof Error ? e.message : "Lettura non riuscita. Riprova."); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  function chooseDestination(value: string) { if (Object.keys(edits).length && !confirm("Cambiare piano e ricalcolare l’anteprima? Le correzioni effettuate qui verranno scartate.")) return; newPlanId.current = crypto.randomUUID(); setDestination(value); setSelected({}); setEdits({}); setError(""); }
  async function commit() {
    if (!preview || !chosen.length || problems.length || !destination || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/clients/${clientId}/editorial-import`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: destination === "new" ? undefined : destination, newPlanId: destination === "new" ? newPlanId.current : undefined, planName: destination === "new" ? planName : plans.find(p => p.id === destination)?.name, fileName: preview.fileName, rows: chosen.map(row => { const previous = existing(row); return { sourceKey: row.sourceKey, sourceRef: row.sourceRef, sheet: row.sheet, existingId: previous?.id, expectedUpdatedAt: previous?.updatedAt, data: effective(row) }; }) }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error || "Importazione non riuscita.");
      setDone(`Importazione completata: ${body.created} nuovi contenuti, ${body.updated} aggiornati.`); setPreview(null); setDestination(""); setEdits({}); setSelected({}); onDirty(false); await onChanged(); const list = await fetch(`/api/clients/${clientId}/editorial-import`); if (list.ok) setPlans((await list.json()).plans);
    } catch (e) { setError(e instanceof Error ? e.message : "Importazione non riuscita."); } finally { setBusy(false); }
  }
  return <div className="editorial-importer" aria-labelledby="excel-import-heading"><div className="client-section-heading"><div><h3 id="excel-import-heading"><FileSpreadsheet size={18}/> Importa piano da Excel</h3><p>Controlla i contenuti prima di aggiungerli al calendario del cliente.</p></div><button type="button" className="icon-action" disabled={busy} aria-label="Chiudi importazione" onClick={onClose}><X size={18}/></button></div>
    {error && <p className="collab-error" role="alert">{error}</p>}{done && <p className="collab-notice" role="status">{done}</p>}
    <div className="import-upload"><input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={event => void read(event.target.files?.[0])}/><button className="button-outline" disabled={busy || Boolean(preview)} onClick={() => input.current?.click()}><Upload size={15}/>{busy ? "Elaborazione…" : "Scegli Excel"}</button><span>{preview?.fileName || ".xlsx fino a 4 MB · Il file originale rimane invariato."}</span>{preview && <button className="button-outline" disabled={busy} onClick={() => { if (confirm("Scartare questa anteprima e scegliere un altro file?")) { setPreview(null); onDirty(false); } }}>Cambia file</button>}</div>
    {preview && <><div className="settings-form-grid import-options"><label className="form-field client-field"><span>Piano di destinazione</span><select disabled={busy} value={destination} onChange={event => chooseDestination(event.target.value)}><option value="">Scegli un piano…</option><option value="new">Crea un nuovo piano</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>{destination === "new" && <label className="form-field client-field"><span>Nome del nuovo piano</span><input disabled={busy} value={planName} maxLength={120} onChange={e => setPlanName(e.target.value)}/></label>}<label className="form-field client-field"><span>Canale per i nuovi contenuti</span><input disabled={busy} value={channel} maxLength={160} placeholder="es. Instagram / Facebook" onChange={e => setChannel(e.target.value)}/></label></div>
      <p className="client-form-hint">Per un file restituito dal cliente scegli il piano già importato. I contenuti esistenti restano esclusi finché scegli di aggiornarli. Mantieni numeri dei post, nomi dei fogli e ordine delle righe per conservarne il riconoscimento.</p>
      <fieldset className="import-sheets"><legend>Fogli da importare</legend>{preview.sheets.map(sheet => <div key={sheet.name}><label><input disabled={busy || !sheet.rows.length} type="checkbox" checked={sheets.includes(sheet.name)} onChange={e => setSheets(current => e.target.checked ? [...current, sheet.name] : current.filter(s => s !== sheet.name))}/><strong>{sheet.name}</strong><span>{sheet.layout} · {sheet.rows.length} contenuti</span></label>{sheet.warnings.map(w => <p key={w} className="client-form-hint">{w}</p>)}{sheet.skipped > 0 && <small>{sheet.skipped} posizioni vuote ignorate</small>}</div>)}</fieldset>
      <div className="import-preview-heading"><h4>Anteprima · {visibleRows.length} contenuti</h4><span>{chosen.length} selezionati</span></div>
      {!visibleRows.length && <p className="client-empty">Seleziona un foglio riconosciuto con contenuti compilati.</p>}
      <div className="import-preview-list">{visibleRows.map(row => { const previous = existing(row); const data = effective(row); const invalid = !postSchema.safeParse(data).success; const warnings = row.warnings.filter(warning => !data.date || !/^(Data esatta|Periodo settimanale)/.test(warning)); return <article className={`import-preview-row ${isSelected(row) ? "import-selected" : ""}`} key={row.sourceKey}><label className="import-row-selection"><input disabled={busy || !destination} type="checkbox" checked={isSelected(row)} aria-label={`Importa ${row.sourceRef} ${row.data.title}`} onChange={e => setSelected(current => ({ ...current, [row.sourceKey]: e.target.checked }))}/><span>{previous ? "Aggiorna esistente" : "Nuovo contenuto"}<small>{row.sheet} · {row.sourceRef}</small></span></label><div className="import-row-fields"><label className="form-field client-field"><span>Titolo</span><input disabled={busy} value={data.title} maxLength={160} onChange={e => edit(row, { title: e.target.value })}/></label><label className="form-field client-field"><span>Data esatta</span><input disabled={busy} type="date" value={data.date} onInput={e => edit(row, { date: e.currentTarget.value })} onChange={e => edit(row, { date: e.target.value })}/></label><label className="form-field client-field"><span>Canale</span><input disabled={busy} maxLength={160} value={data.channel} onChange={e => edit(row, { channel: e.target.value })}/></label></div>{previous && <p className="import-previous">Nel CRM: {previous.title} · {previous.date || "senza data"} · {previous.status}</p>}{warnings.length > 0 && <p className="client-form-hint">{warnings.join(" ")}</p>}<details><summary>Testo, materiali e altre informazioni</summary><div className="settings-form-grid"><label className="form-field client-field"><span>Formato</span><select disabled={busy} value={data.format} onChange={e => edit(row, { format: e.target.value as ImportedPostData["format"] })}>{["Post", "Carosello", "Reel", "Storia", "Video", "Altro"].map(f => <option key={f}>{f}</option>)}</select></label><label className="form-field client-field"><span>Stato</span><select disabled={busy} value={data.status} onChange={e => edit(row, { status: e.target.value as ImportedPostData["status"] })}>{postStatuses.map(s => <option key={s}>{s}</option>)}</select></label><label className="form-field client-field"><span>Ora (Europe/Rome)</span><input disabled={busy} type="time" value={data.time} onInput={e => edit(row, { time: e.currentTarget.value })} onChange={e => edit(row, { time: e.target.value })}/></label></div><label className="form-field client-field"><span>Testo / argomento integrale</span><textarea disabled={busy} rows={4} maxLength={10000} value={data.copy} onChange={e => edit(row, { copy: e.target.value })}/></label><label className="form-field client-field"><span>Note, immagine consigliata e periodo</span><textarea disabled={busy} rows={3} maxLength={5000} value={data.notes} onChange={e => edit(row, { notes: e.target.value })}/></label>{previous && <div className="import-original"><strong>Testo attuale nel CRM</strong><p>{previous.copy || "Vuoto"}</p><strong>Note attuali nel CRM</strong><p>{previous.notes || "Vuote"}</p></div>}</details>{isSelected(row) && invalid && <p className="collab-error">Controlla canale, data, stato e lunghezza dei testi prima di importare.</p>}</article>; })}</div>
      <div className="import-confirm"><p>{chosen.filter(r => !existing(r)).length} nuovi · {chosen.filter(r => existing(r)).length} aggiornamenti. Le righe escluse e i contenuti assenti dal file restano invariati.</p>{problems.length > 0 && <p className="collab-error" role="alert">{problems.length} contenuti da correggere. {problems[0]}</p>}<button type="button" className="button-primary" disabled={busy || !destination || !chosen.length || Boolean(problems.length) || (destination === "new" && planName.trim().length < 2)} onClick={() => void commit()}>{busy ? "Importazione…" : `Conferma ${chosen.length} ${chosen.length === 1 ? "contenuto" : "contenuti"}`}</button></div>
    </>}
  </div>;
}

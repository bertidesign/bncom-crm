"use client";
import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import type { PublicUser } from "@/lib/types";
import { UserAvatar } from "@/components/user-avatar";
export function AvatarUploader({ user, onSaved }: { user: PublicUser; onSaved: (user: PublicUser) => void }) {
  const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function save(image?: string) { const response = await fetch(`/api/users/${user.id}/avatar`, { method: image ? "PUT" : "DELETE", headers: { "Content-Type": "application/json" }, body: image ? JSON.stringify({ image }) : undefined }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Foto non salvata."); onSaved(body.user); setNotice(image ? "Foto profilo aggiornata." : "Foto profilo rimossa."); }
  async function upload(file?: File) {
    if (!file) return; setError(""); setNotice(""); if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Scegli un PNG, JPEG o WebP fino a 5 MB."); return; }
    setBusy(true); const url = URL.createObjectURL(file);
    try { const image = new Image(); image.src = url; await image.decode(); const scale = Math.min(1, 512 / Math.max(image.width, image.height)); const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale)); canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height); const data = canvas.toDataURL("image/webp", .88); if (data.length > 400000) throw new Error("Scegli una foto più leggera."); await save(data); } catch (e) { setError(e instanceof Error ? e.message : "Immagine non leggibile."); } finally { URL.revokeObjectURL(url); setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function remove() { setBusy(true); setError(""); setNotice(""); try { await save(); } catch (e) { setError(e instanceof Error ? e.message : "Rimozione non riuscita."); } finally { setBusy(false); } }
  return <section className="avatar-editor"><UserAvatar name={user.name} src={user.avatarUrl} className="profile-photo-preview"/><div><strong>Foto profilo</strong><p>PNG, JPEG o WebP, fino a 5 MB. La foto viene salvata subito.</p><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={event => void upload(event.target.files?.[0])}/><div className="avatar-editor-actions"><button type="button" className="button-outline" disabled={busy} onClick={() => input.current?.click()}><Camera size={14}/>{busy ? "Aggiornamento…" : "Carica foto"}</button>{user.avatarUrl && <button type="button" className="button-outline" disabled={busy} onClick={() => void remove()}><Trash2 size={14}/> Rimuovi foto</button>}</div>{error && <p className="collab-error" role="alert">{error}</p>}{notice && <p className="avatar-notice" role="status">{notice}</p>}</div></section>;
}

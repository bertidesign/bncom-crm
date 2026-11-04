import "server-only";
import { del, get, put } from "@vercel/blob";

const LOGO_PREFIX = "crm/branding/";
export function decodeLogo(value: string): { data: Buffer; contentType: string; extension: string } | null {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/.exec(value);
  if (!match || value.length > 400000) return null;
  const data = Buffer.from(match[2], "base64");
  const format = match[1];
  const valid = format === "png" ? data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : format === "jpeg" ? data[0] === 255 && data[1] === 216 && data[2] === 255 : data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP";
  return valid ? { data, contentType: `image/${format}`, extension: format === "jpeg" ? "jpg" : format } : null;
}
function credentials() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Blob storage non configurato.");
  // Pass the token explicitly so all operations target the connected store-crm,
  // even on deployments that also expose Vercel OIDC credentials.
  return { token: process.env.BLOB_READ_WRITE_TOKEN };
}
export function isLogoPath(path: string) {
  return /^crm\/branding\/[a-f0-9-]+\.(png|jpg|webp)$/.test(path);
}
export async function uploadLogo(image: NonNullable<ReturnType<typeof decodeLogo>>) {
  const id = crypto.randomUUID();
  const blob = await put(`${LOGO_PREFIX}${id}.${image.extension}`, image.data, { ...credentials(), access: "private", contentType: image.contentType, addRandomSuffix: false });
  return { logo: `/api/branding/logo?v=${id}`, logoPath: blob.pathname };
}
export async function readLogo(path: string) {
  if (!isLogoPath(path)) return null;
  return get(path, { ...credentials(), access: "private" });
}
export async function removeLogo(path?: string) {
  if (!path || !isLogoPath(path)) return;
  try { await del(path, credentials()); } catch { console.error("Impossibile rimuovere il precedente marchio da Blob."); }
}

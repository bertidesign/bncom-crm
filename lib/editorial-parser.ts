import "server-only";
import ExcelJS from "exceljs";
import { unzipSync, strFromU8 } from "fflate";
import { validDate } from "@/lib/project-templates";
import type { ImportPreview, ImportRow, ImportedPostData, ImportSheet } from "@/lib/editorial-import-types";

export const MAX_EXCEL_BYTES = 4 * 1024 * 1024;
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
function value(cell: ExcelJS.Cell): ExcelJS.CellValue {
  const v = cell.value;
  return v && typeof v === "object" && !(v instanceof Date) && ("formula" in v || "sharedFormula" in v) ? v.result : v;
}
function text(cell: ExcelJS.Cell): string {
  const v = value(cell);
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") { if ("richText" in v) return v.richText.map(item => item.text).join("").trim(); if ("text" in v) return ("hyperlink" in v && v.hyperlink !== v.text ? `${v.text} (${v.hyperlink})` : v.text).trim(); return ""; }
  return String(v).trim();
}
function date(cell: ExcelJS.Cell, date1904: boolean): string {
  const v = value(cell);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v >= 20000 && v < 100000) return new Date(Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30) + Math.floor(v) * 86400000).toISOString().slice(0, 10);
  const t = text(cell); if (/^\d{4}-\d{2}-\d{2}$/.test(t) && validDate(t)) return t;
  const match = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(t);
  const iso = match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
  return iso && validDate(iso) ? iso : "";
}
function range(reference: string) {
  const [start, end = start] = reference.split(":");
  const parse = (v: string) => { const m = /^\$?([A-Z]+)\$?(\d+)$/.exec(v); if (!m) throw new Error("Intervallo Excel non valido."); return { row: Number(m[2]), col: [...m[1]].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) }; };
  return { start: parse(start), end: parse(end) };
}
function preflight(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_EXCEL_BYTES) throw new Error("Usa un file .xlsx fino a 4 MB.");
  let total = 0, files = 0;
  const entries = unzipSync(bytes, { filter: entry => { total += entry.originalSize; files++; if (total > 20 * 1024 * 1024 || files > 500) throw new Error("Il file Excel è troppo complesso. Riducilo o suddividilo."); return /^xl\/worksheets\/sheet\d+\.xml$/.test(entry.name); } });
  let cells = 0;
  for (const data of Object.values(entries)) {
    const xml = strFromU8(data); cells += (xml.match(/<c\s/g) || []).length;
    if (cells > 50000) throw new Error("Il file supera il limite di 50.000 celle.");
    for (const match of xml.matchAll(/<(?:mergeCell|dimension)\b[^>]*\bref="([^"]+)"/g)) {
      const bounds = range(match[1]); if (bounds.end.row > 2000 || bounds.end.col > 100) throw new Error("Riduci l'area del foglio a 2.000 righe e 100 colonne, eliminando le celle formattate non utilizzate.");
    }
  }
}
function blockText(sheet: ExcelJS.Worksheet, col: number, start: number, end: number) {
  const seen = new Set<string>(); const values: string[] = [];
  for (let row = start; row <= end; row++) { const cell = sheet.getCell(row, col); if (seen.has(cell.master.address)) continue; seen.add(cell.master.address); const content = text(cell); if (content) values.push(content); }
  return values.join("\n\n");
}
function baseData(content: string, format: ImportedPostData["format"] = "Post"): ImportedPostData {
  return { title: content.replace(/\s+/g, " ").slice(0, 160), copy: content, channel: "", date: "", time: "", status: "Idea", format, assetUrl: "", approver: "", notes: "" };
}
function buildSheet(sheet: ExcelJS.Worksheet, date1904: boolean): ImportSheet {
  const out: ImportSheet = { name: sheet.name, layout: "Non riconosciuto", rows: [], skipped: 0, warnings: [] };
  if (sheet.rowCount > 2000 || sheet.columnCount > 100) throw new Error("Il foglio supera i limiti di importazione.");
  let header = 0, topicCol = 0, postCol = 0; const matrixCols: { col: number; label: string }[] = [];
  for (let r = 1; r <= Math.min(sheet.rowCount, 20); r++) {
    const cols = Array.from({ length: Math.min(sheet.columnCount, 30) }, (_, i) => ({ col: i + 1, label: normalize(text(sheet.getCell(r, i + 1))) }));
    const topic = cols.find(c => /^(argomento|testo|copy|contenuto|descrizione)$/.test(c.label));
    if (topic) { header = r; topicCol = topic.col; postCol = cols.find(c => /^(post|data|data post|data pubblicazione|numero|n[.°]?)$/.test(c.label))?.col || 1; break; }
    const matrix = cols.filter(c => /^(post\s*\d+|stori[ae])$/.test(c.label) && sheet.getCell(r, c.col).master.address === sheet.getCell(r, c.col).address);
    if (matrix.length >= 2) { header = r; matrixCols.push(...matrix); break; }
  }
  if (!header) { out.warnings.push("Struttura non riconosciuta: servono le colonne Post/Argomento oppure Post 1, Post 2, Storia."); return out; }
  if (sheet.state !== "visible") out.warnings.push("Questo foglio è nascosto nel file Excel: controllane l’inclusione prima di importare.");
  let missingFormula = false; sheet.eachRow(row => row.eachCell(cell => { const v = cell.value; if (v && typeof v === "object" && ("formula" in v || "sharedFormula" in v) && v.result === undefined) missingFormula = true; }));
  if (missingFormula) out.warnings.push("Alcune formule non hanno un risultato salvato. Apri e salva il file con Excel per includerle: il CRM non esegue formule.");
  const merges = (sheet.model.merges || []).map(range);
  const blockEnd = (r: number, col: number) => merges.find(m => m.start.row === r && m.start.col === col)?.end.row || r;
  const extras: { col: number; label: string }[] = [];
  if (topicCol) {
    out.layout = "Elenco di argomenti";
    for (let col = 1; col <= sheet.columnCount; col++) {
      const cell = sheet.getCell(header, col); if (col !== topicCol && col !== postCol && text(cell) && cell.master.address === cell.address) extras.push({ col, label: text(cell) });
    }
    for (let r = header + 1; r <= sheet.rowCount;) {
      const post = sheet.getCell(r, postCol); if (post.isMerged && Number(post.master.row) !== r) { r++; continue; }
      const end = Math.max(blockEnd(r, postCol), blockEnd(r, topicCol));
      const content = blockText(sheet, topicCol, r, end);
      if (!content) { out.skipped++; r = end + 1; continue; }
      const data = baseData(content); data.date = date(post, date1904); const originalPost = text(post);
      const notes = extras.map(extra => { const v = blockText(sheet, extra.col, r, end); return v ? `${extra.label}: ${v}` : ""; }).filter(Boolean);
      if (originalPost && !data.date) notes.unshift(`Riferimento Post: ${originalPost}`);
      data.notes = notes.join("\n\n");
      const warnings = data.date ? [] : ["Data esatta da definire: i riferimenti settimanali restano nelle note."];
      if (content.length > 160) warnings.push("Titolo abbreviato; il testo integrale è conservato nel contenuto.");
      // Post numbers are the identity in block templates; dated lists use the row reference.
      const key = /^\d{1,3}$/.test(originalPost) && !data.date ? `post:${originalPost}` : `row:${r}`;
      out.rows.push({ sourceKey: `${sheet.name}|list|${key}`, sourceRef: `${post.address}:${sheet.getCell(end, sheet.columnCount).address}`, sheet: sheet.name, data, warnings });
      r = end + 1;
    }
  } else {
    out.layout = "Calendario settimanale";
    for (let r = header + 1; r <= sheet.rowCount;) {
      const periodCell = sheet.getCell(r, 1); if (periodCell.isMerged && Number(periodCell.master.row) !== r) { r++; continue; }
      const end = Math.max(blockEnd(r, 1), ...matrixCols.map(c => blockEnd(r, c.col))); const period = blockText(sheet, 1, r, end);
      for (const col of matrixCols) {
        const content = blockText(sheet, col.col, r, end); if (!content) { out.skipped++; continue; }
        const data = baseData(content, col.label.startsWith("stori") ? "Storia" : "Post"); data.date = date(periodCell, date1904); data.notes = `${period ? `Periodo originale: ${period}\n\n` : ""}Posizione nel piano: ${text(sheet.getCell(header, col.col))}`;
        out.rows.push({ sourceKey: `${sheet.name}|matrix|${period || `row:${r}`}|${col.label}`, sourceRef: `${sheet.getCell(r, col.col).address}:${sheet.getCell(end, col.col).address}`, sheet: sheet.name, data, warnings: data.date ? [] : ["Periodo settimanale senza giorno e anno certi: scegli una data oppure importa come idea senza data."] });
      }
      r = end + 1;
    }
  }
  if (sheet.getImages().length) out.warnings.push("Le immagini incorporate non vengono importate. Le indicazioni testuali e i link nei campi materiali restano nelle note.");
  const keys = new Set<string>(); for (const row of out.rows) { if (keys.has(row.sourceKey)) throw new Error(`Identificativi Post duplicati nel foglio “${sheet.name}”. Correggi i numeri o i periodi prima di importare.`); keys.add(row.sourceKey); }
  if (!out.rows.length) out.warnings.push("Nessun argomento compilato: le righe vuote non generano contenuti.");
  return out;
}
export async function parseEditorialWorkbook(bytes: Uint8Array, fileName: string): Promise<ImportPreview> {
  if (!/\.xlsx$/i.test(fileName)) throw new Error("Usa il formato .xlsx. Per .xls o file protetti salva prima una copia .xlsx non protetta.");
  preflight(bytes);
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(Buffer.from(bytes) as never); } catch { throw new Error("Impossibile leggere questo Excel. Salvalo di nuovo come .xlsx non protetto e riprova."); }
  if (workbook.worksheets.length > 20) throw new Error("Importa un file con al massimo 20 fogli.");
  const sheets = workbook.worksheets.map(sheet => buildSheet(sheet, Boolean(workbook.properties.date1904)));
  if (sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0) > 300) throw new Error("Importa al massimo 300 contenuti alla volta: suddividi il piano in più file.");
  return { fileName: fileName.slice(0, 200), sheets };
}

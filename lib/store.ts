import { promises as fs } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { Database, Department, Project, TeamUser } from "@/lib/types";
import { departments } from "@/lib/types";
import { hashPassword } from "@/lib/password";

const dataFile = path.join(process.env.CRM_DATA_DIR || path.join(process.cwd(), "data"), "crm.json");
const demoToday = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
function dayOffset(value: string, offset: number) {
  const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const seed: Database = {
  clients: [
    { id: "c1", name: "Studio Marconi", company: "Studio Marconi", email: "ciao@studiomarconi.it", status: "Attivo", color: "#d5e5de", createdAt: "2026-10-08T09:00:00.000Z" },
    { id: "c2", name: "Tenuta San Pietro", company: "Tenuta San Pietro", email: "info@tenutasanpietro.it", status: "In valutazione", color: "#ead9c8", createdAt: "2026-10-17T09:00:00.000Z" },
    { id: "c3", name: "Casa Lume", company: "Casa Lume", email: "studio@casalume.it", status: "Attivo", color: "#dce0ef", createdAt: "2026-09-23T09:00:00.000Z" },
    { id: "c4", name: "Futura Energia", company: "Futura Energia", email: "marketing@futuraenergia.it", status: "In pausa", color: "#eddfb7", createdAt: "2026-10-28T09:00:00.000Z" },
    { id: "c5", name: "Osteria del Borgo", company: "Osteria del Borgo", email: "ciao@osteriadelborgo.it", status: "Attivo", color: "#e7d4d2", createdAt: "2026-10-31T09:00:00.000Z" }
  ],
  projects: [
    { id: "p1", name: "Restyling sito web", clientId: "c1", status: "In corso", color: "#d7e9e1", departmentIds: ["Web"], assigneeIds: [], createdAt: "2026-10-10T09:00:00.000Z" },
    { id: "p2", name: "Campagna autunno", clientId: "c2", status: "In attesa", color: "#f1e0cc", departmentIds: ["Social", "Grafica"], assigneeIds: [], createdAt: "2026-10-19T09:00:00.000Z" },
    { id: "p3", name: "Identità visiva", clientId: "c3", status: "In corso", color: "#e1e3f1", departmentIds: ["Grafica"], assigneeIds: [], createdAt: "2026-09-28T09:00:00.000Z" },
    { id: "p4", name: "Landing page", clientId: "c4", status: "Completato", color: "#f1e8c9", departmentIds: ["Web"], assigneeIds: [], createdAt: "2026-10-29T09:00:00.000Z" },
    { id: "p5", name: "Piano editoriale", clientId: "c5", status: "In corso", color: "#f0dedd", departmentIds: ["Social"], assigneeIds: [], createdAt: "2026-11-01T09:00:00.000Z" }
  ],
  entries: [
    { id: "w1", projectId: "p1", date: demoToday, description: "Rifinitura della pagina servizi e allineamento dei componenti mobile.", hours: 2.5, person: "Andrea", createdAt: `${demoToday}T09:20:00.000Z` },
    { id: "w2", projectId: "p3", date: demoToday, description: "Presentazione delle proposte logo e raccolta feedback.", hours: 1.5, person: "Marta", createdAt: `${demoToday}T11:10:00.000Z` },
    { id: "w3", projectId: "p5", date: demoToday, description: "Calendario contenuti di novembre, prime bozze copy.", hours: 1, person: "Luca", createdAt: `${demoToday}T13:05:00.000Z` },
    { id: "w4", projectId: "p1", date: dayOffset(demoToday, -1), description: "Wireframe area progetti e revisione struttura di navigazione.", hours: 3, person: "Andrea", createdAt: `${dayOffset(demoToday, -1)}T09:00:00.000Z` },
    { id: "w5", projectId: "p2", date: dayOffset(demoToday, -1), description: "Ricerca riferimenti visivi per campagna stagionale.", hours: 2, person: "Marta", createdAt: `${dayOffset(demoToday, -1)}T13:00:00.000Z` },
    { id: "w6", projectId: "p3", date: dayOffset(demoToday, -2), description: "Sviluppo del sistema tipografico e palette colore.", hours: 2.5, person: "Marta", createdAt: `${dayOffset(demoToday, -2)}T10:00:00.000Z` },
    { id: "w7", projectId: "p5", date: dayOffset(demoToday, -2), description: "Revisione delle fotografie e selezione immagini.", hours: 1, person: "Luca", createdAt: `${dayOffset(demoToday, -2)}T14:00:00.000Z` }
  ],
  milestones: [],
  tasks: [],
  users: [],
  notifications: []
};

function bootstrapAdmin(): TeamUser | null {
  const password = process.env.CRM_PASSWORD || (process.env.NODE_ENV === "development" ? "bncom-demo" : "");
  if (!password) return null;
  return { id: "admin-bncom", name: process.env.CRM_ADMIN_NAME || "Amministratore BNCom", email: (process.env.CRM_ADMIN_EMAIL || "admin@bncom.it").toLowerCase(), role: "Admin", departmentIds: [...departments], active: true, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
}
function inferDepartments(project: Partial<Project>): Department[] {
  if (project.departmentIds?.length) return project.departmentIds.filter((d): d is Department => departments.includes(d));
  const text = `${project.name || ""} ${project.description || ""}`.toLowerCase();
  if (/social|editorial|contenut|campagna/.test(text)) return ["Social"];
  if (/logo|identità|brand|grafica/.test(text)) return ["Grafica"];
  return ["Web"];
}
export function normalizeDatabase(input: Partial<Database> | string): Database {
  const raw = typeof input === "string" ? JSON.parse(input) as Partial<Database> : input;
  const normalized: Database = {
    clients: Array.isArray(raw.clients) ? raw.clients : [],
    projects: Array.isArray(raw.projects) ? raw.projects.map(project => ({ ...project, departmentIds: inferDepartments(project), assigneeIds: Array.isArray(project.assigneeIds) ? project.assigneeIds : [] })) : [],
    entries: Array.isArray(raw.entries) ? raw.entries : [],
    milestones: Array.isArray(raw.milestones) ? raw.milestones : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    users: Array.isArray(raw.users) ? raw.users : [],
    notifications: Array.isArray(raw.notifications) ? raw.notifications : []
  };
  if (!normalized.users.length) { const admin = bootstrapAdmin(); if (admin) normalized.users.push(admin); }
  return normalized;
}

let schemaReady: Promise<void> | undefined;
let writeQueue = Promise.resolve();
function databaseUrl() { return process.env.DATABASE_URL || process.env.POSTGRES_URL; }
function sqlClient() {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL non configurata: collega un database Postgres/Neon al progetto Vercel.");
  return neon(url);
}
async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = sqlClient();
      await sql`CREATE TABLE IF NOT EXISTS bncom_crm_state (id integer PRIMARY KEY CHECK (id = 1), revision bigint NOT NULL DEFAULT 0, data jsonb NOT NULL)`;
      await sql`INSERT INTO bncom_crm_state (id, revision, data) VALUES (1, 0, ${JSON.stringify(seed)}::jsonb) ON CONFLICT (id) DO NOTHING`;
    })().catch(error => { schemaReady = undefined; throw error; });
  }
  await schemaReady;
}
async function ensureLocalStore() {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  try { await fs.access(dataFile); } catch { await fs.writeFile(dataFile, JSON.stringify(seed, null, 2)); }
}
export async function getDatabase(): Promise<Database> {
  if (databaseUrl()) {
    await ensureSchema();
    const rows = await sqlClient()`SELECT data FROM bncom_crm_state WHERE id = 1`;
    return normalizeDatabase(rows[0].data as Database);
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL non configurata: collega un database Postgres/Neon al progetto Vercel.");
  await ensureLocalStore();
  return normalizeDatabase(await fs.readFile(dataFile, "utf8"));
}
export async function updateDatabase<T>(mutator: (db: Database) => T | Promise<T>): Promise<{ db: Database; result: T }> {
  if (databaseUrl()) {
    await ensureSchema();
    const sql = sqlClient();
    for (let attempt = 0; attempt < 5; attempt++) {
      const rows = await sql`SELECT revision, data FROM bncom_crm_state WHERE id = 1`;
      const revision = Number(rows[0].revision);
      const db = normalizeDatabase(rows[0].data as Database);
      const result = await mutator(db);
      const updated = await sql`UPDATE bncom_crm_state SET data = ${JSON.stringify(db)}::jsonb, revision = revision + 1 WHERE id = 1 AND revision = ${revision} RETURNING revision`;
      if (updated.length) return { db, result };
    }
    throw new Error("Database occupato: impossibile salvare dopo più tentativi. Riprova.");
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL non configurata: il CRM non salva su filesystem temporaneo Vercel.");
  let result!: T;
  let db!: Database;
  const operation = writeQueue.then(async () => { db = normalizeDatabase(await getDatabase()); result = await mutator(db); const temp = `${dataFile}.tmp`; await fs.writeFile(temp, JSON.stringify(db, null, 2)); await fs.rename(temp, dataFile); });
  writeQueue = operation.catch(() => {});
  await operation;
  return { db, result };
}
export { seed };

export type ClientStatus = "Attivo" | "In valutazione" | "In pausa" | "Concluso";
export type Client = { id: string; name: string; company: string; email: string; status: ClientStatus; color: string; createdAt: string };
export type ProjectStatus = "In corso" | "In attesa" | "Completato";
export type Project = { id: string; name: string; clientId: string; status: ProjectStatus; color: string; createdAt: string };
export type WorkEntry = { id: string; projectId: string; date: string; description: string; hours: number; person: string; createdAt: string };
export type Database = { clients: Client[]; projects: Project[]; entries: WorkEntry[] };

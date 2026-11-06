import type { Database } from "@/lib/types";
import type { ClientService } from "@/lib/client-domain";
import type { Department } from "@/lib/types";
export type WebProvider = { id: string; name: string; department: Department; website: string; notes: string; active: boolean; createdAt: string; updatedAt: string };
export function providerNameKey(value: string) { return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT"); }
export function resolveWebProvider(db: Database, input: Pick<ClientService, "department" | "provider" | "providerId">, previous?: ClientService): { provider: string; providerId: string } | { error: string } {
  if (input.providerId) {
    const provider = db.webProviders.find(p => p.id === input.providerId);
    if (!provider) return { error: "Il fornitore non esiste più. Aggiorna l’elenco e selezionane un altro." };
    if (!provider.active && previous?.providerId !== provider.id) return { error: "Il fornitore è archiviato. Seleziona un fornitore attivo." };
    return { provider: provider.name, providerId: provider.id };
  }
  if (!input.provider) return { provider: "", providerId: "" };
  // Keep historic free text until a user explicitly associates a catalog entry.
  if (previous && !previous.providerId && input.provider === previous.provider) return { provider: previous.provider, providerId: "" };
  return { error: "Seleziona un fornitore dall’elenco. L’amministratore può aggiungerlo nelle Impostazioni." };
}

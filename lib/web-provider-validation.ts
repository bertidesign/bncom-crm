import { z } from "zod";
import { optionalUrl } from "@/lib/client-validation";
export const providerSchema = z.object({ name: z.string().trim().min(2, "Inserisci un nome di almeno 2 caratteri.").max(200), website: optionalUrl, notes: z.string().trim().max(2000).default(""), active: z.boolean().default(true) });

# BNCom CRM

CRM interno BNCom per clienti, progetti e registro delle lavorazioni.

## Avvio locale

Richiede Node.js 20.9 o superiore.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Apri http://localhost:3000. In sviluppo, senza `.env.local`, la password demo è `bncom-demo`.

Prima di esporre l'app, imposta `CRM_PASSWORD` e `SESSION_SECRET` con valori forti in `.env.local` o nelle variabili d'ambiente di deployment. La sessione è firmata e conservata in cookie HTTP-only con scadenza di sette giorni.

## Dati

Il primo avvio crea `data/crm.json` con dati sintetici per mostrare le viste. Questo archivio su filesystem è adatto solo allo sviluppo locale: il filesystem delle funzioni Vercel non è una persistenza affidabile. Prima di un deploy condiviso, collegare un database gestito (ad esempio Postgres) e spostare lo store in `lib/store.ts`; usare inoltre un'autenticazione per utente se serve tracciare gli operatori.

Le route `/api/clients`, `/api/projects` e `/api/work-entries` espongono CRUD essenziale protetto da sessione. I payload sono validati server-side.

## Stack

Next.js App Router, React, Node.js Route Handlers, TypeScript, Tailwind CSS v4 e Zod. Pensato per deploy Vercel dopo aver configurato database e segreti.

La data della dashboard segue il fuso `Europe/Rome`; il foglio lavori si aggiorna quindi automaticamente al giorno corrente.

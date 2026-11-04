# BNCom CRM

CRM interno BNCom per clienti, progetti e registro delle lavorazioni.

## Avvio locale

Richiede Node.js 20.9 o superiore.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Apri http://localhost:3000. In sviluppo, senza `.env.local`, l’account iniziale è `admin@bncom.it` con password `bncom-demo`. In produzione l’account amministratore iniziale usa `CRM_ADMIN_EMAIL` (default `admin@bncom.it`) e la password `CRM_PASSWORD`.

Prima di esporre l'app, imposta `CRM_PASSWORD` e `SESSION_SECRET` con valori forti in `.env.local` o nelle variabili d'ambiente di deployment. La sessione è firmata e conservata in cookie HTTP-only con scadenza di sette giorni.

## Dati

In locale, senza `DATABASE_URL`, il primo avvio crea `data/crm.json` con dati sintetici. Su Vercel è richiesto un database PostgreSQL persistente collegato tramite `DATABASE_URL` (o `POSTGRES_URL`); il progetto crea automaticamente la tabella `bncom_crm_state` e inizializza il dataset demo al primo avvio. Senza la variabile, le API restituiscono un errore esplicito di configurazione e non tentano di scrivere nel filesystem read-only o temporaneo.

Per Vercel, collega un provider PostgreSQL dal Marketplace (ad esempio Neon) e rendi disponibile `DATABASE_URL` nell’ambiente Production, poi ridistribuisci. I dati di lavoro non vengono salvati nella cartella del deploy. Le scritture PostgreSQL usano un controllo di revisione per gestire aggiornamenti concorrenti.

Progetti, milestone, task, clienti, utenti e lavorazioni hanno API protette e validate server-side. I reparti Grafica, Web e Social possono essere assegnati a uno o più progetti; gli utenti ricevono notifiche nel CRM quando cambiano gli stati dei progetti, delle milestone o dei task loro assegnati o del loro reparto. Le notifiche si aggiornano automaticamente mentre l’app è aperta.

## Stack

Next.js App Router, React, Node.js Route Handlers, TypeScript, Tailwind CSS v4 e Zod. Pensato per deploy Vercel dopo aver configurato database e segreti.

La data della dashboard segue il fuso `Europe/Rome`; il foglio lavori si aggiorna quindi automaticamente al giorno corrente.

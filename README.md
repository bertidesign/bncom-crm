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

### Impostazioni

Ogni account può scegliere la propria palette (Salvia, Oceano, Iris, Terracotta o Grafite), la densità delle liste, la pagina iniziale e le notifiche operative da ricevere. Le preferenze sono salvate su Neon e si applicano ai dispositivi su cui si accede con lo stesso account. Dal profilo si possono modificare nome, email e password; per cambiare email o password serve la password attuale.

La scheda Studio è riservata agli amministratori: nome, descrizione breve, email di contatto, ore giornaliere di riferimento e marchio. Il marchio accetta PNG, JPEG e WebP fino a 5 MB; il browser lo ridimensiona prima del salvataggio nel Blob storage privato `store-crm`. Neon conserva soltanto il riferimento al file. Nome e marchio sono visibili anche nella pagina di accesso. Il contatto dello studio resta disponibile al team autenticato. Gli archivi esistenti ricevono automaticamente i valori iniziali delle impostazioni senza perdere i dati precedenti.

### Storage file

Il marchio usa Vercel Blob privato (`store-crm`), con `BLOB_STORE_ID` e `BLOB_READ_WRITE_TOKEN` configurati nel progetto Vercel. Il token viene usato soltanto dal server. L’endpoint `/api/branding/logo` mostra esclusivamente il marchio corrente anche agli utenti non autenticati, per la pagina di accesso; non permette di leggere percorsi arbitrari dello storage. Sostituzione e rimozione del marchio aggiornano Neon prima della cancellazione del vecchio file. Gli eventuali marchi già salvati inline rimangono leggibili e vengono trasferiti su Blob al successivo salvataggio delle impostazioni Studio. In locale serve un token Blob valido per caricare un nuovo marchio.

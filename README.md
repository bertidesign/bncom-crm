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

### Operatività quotidiana e collaborazione

- **La mia giornata**: task assegnati all'account, filtri per scadenze, blocchi e completati, ore registrate oggi, collegamento diretto alla scheda task. L'admin ha una vista di coordinamento del team. Può essere scelta come pagina iniziale nelle preferenze.
- **Avanzamento per reparto**: Grafica, Web e Social hanno stati indipendenti (Da avviare, In corso, In revisione, In attesa, Completato). Li aggiornano il relativo reparto e gli amministratori; il cambio genera notifiche secondo le preferenze degli interessati. Lo stato generale del progetto resta esplicito.
- **Discussioni**: commenti separati per progetto e task, menzioni dei collaboratori con avvisi nel CRM e link esterni. Autore e admin possono modificare o eliminare i commenti.
- **Allegati privati**: upload diretto su `store-crm` fino a 25 MB, autorizzato con ticket per utente/progetto/task e con scadenza. Il token globale dello store resta sul server. La finalizzazione è idempotente tra callback Blob e conferma del browser; nuove versioni conservano quelle precedenti. Il download richiede una sessione e consegna il file come allegato. Ogni autore può eliminare le proprie versioni; l'admin può gestirle tutte.
- **Ore per task**: le nuove lavorazioni includono l'account che le registra e il task facoltativo. Per i collaboratori la persona viene determinata dal server. I record storici rimangono nel foglio lavori e non vengono attribuiti per somiglianza di nome.

L'accesso a progetti e materiali segue il modello condiviso dello studio: tutti gli account attivi possono consultarli. Le assegnazioni definiscono la giornata personale e i destinatari degli avvisi. Eliminare clienti, progetti, milestone o task rimuove anche discussioni e allegati collegati; eliminare un task mantiene le ore storiche. I vecchi oggetti Blob vengono rimossi dopo il commit del database, con tentativo di pulizia separato. Un errore del provider durante tale pulizia può richiedere una successiva rimozione del file orfano dallo storage.

Il piano del rilascio e la roadmap sono in `docs/development-plan.md`.

### Modelli, prerequisiti e passaggi di consegna

Gli amministratori gestiscono la libreria **Modelli**, disponibile a tutti alla creazione di un progetto. Ogni modello contiene reparti, milestone, task e dipendenze. Le scadenze sono calcolate dalla data di avvio in giorni di calendario; la scadenza generale può essere indicata esplicitamente. I task ricevono gli assegnatari selezionati per il progetto che appartengono al relativo reparto. I modelli non includono account, ore, commenti o file e la loro modifica non cambia i progetti esistenti. La struttura di un progetto può essere salvata come nuovo modello dalla sua scheda.

Un task può indicare prerequisiti nello stesso progetto: i cicli e i collegamenti a progetti diversi vengono rifiutati. Avvio e completamento sono vincolati alla conclusione dei prerequisiti. Per riaprire un task completato occorre prima riportare a Da fare i successori già avviati; per eliminare un prerequisito occorre prima rimuoverne i collegamenti. Le milestone con task referenziati da altre attività sono protette dalla cancellazione. La giornata evidenzia i motivi del blocco e permette di filtrare i task pronti.

Il passaggio di consegna trasferisce la responsabilità di un task aperto tra i reparti coinvolti. Mittente, reparto responsabile e admin possono avviarlo; il destinatario deve essere un collaboratore attivo del reparto scelto. Senza persone specificate il passaggio compare nella coda del reparto e il primo collaboratore che lo accetta diventa assegnatario. La presa in carico attende i prerequisiti e registra chi l'ha eseguita; il task passa In corso, mantenendo un eventuale blocco manuale. Mittente e admin possono annullare una consegna ancora in attesa. Le note restano nella discussione e lo storico registra invio, accettazione e annullamento. La preferenza **Passaggi di consegna e task pronti** gestisce gli avvisi diretti, separatamente dalle notifiche di stato.


### Schede clienti, servizi e calendario editoriale

L’elenco Clienti include una ricerca visibile anche su mobile, per nome, azienda, referente, email, telefono e stato, con conteggio risultati e cancellazione del filtro.

Ogni cliente ha una pagina dedicata con le schede **Riepilogo**, **Web**, **Social**, **Grafica** e **Progetti e ore**. L’anagrafica contiene anche referente, indirizzo, partita IVA, PEC e codice destinatario. Riepilogo mostra servizi attivi, rinnovi/consegne entro 60 giorni, contenuti Social da seguire e ore complessive.

Ogni reparto gestisce i propri servizi con categoria, stato, fornitore, pacchetto, frequenza, avvio, prossima scadenza/consegna e note. Web include hosting, domini, manutenzione e licenze plugin, oltre a sito, CMS, staging, repository e riferimenti tecnici. Social raccoglie canali, strategia, pubblico, tono di voce, frequenza e collegamento al piano editoriale. Grafica raccoglie marchio, sorgenti, font, palette, formati, fornitori e specifiche produttive.

Il calendario Social permette di creare, modificare ed eliminare contenuti, con vista mensile o elenco, data e ora Europe/Rome, stato, copy, link alle creatività e referente per l’approvazione. Lo stato Programmato è una registrazione interna: il CRM non pubblica direttamente sui social. La Panoramica riepiloga i servizi attivi per reparto e i contenuti da seguire.

Tutti gli account attivi possono consultare le schede; le informazioni e i servizi di reparto sono modificabili soltanto dai membri del reparto o dagli amministratori. Il salvataggio delle informazioni di reparto rileva eventuali aggiornamenti concorrenti. Le vecchie anagrafiche restano valide e iniziano senza servizi o piani editoriali dedotti dai progetti.

### Foto e mansione professionale

In **Profilo e accesso** ogni persona può impostare una mansione libera (ad esempio Web Developer) e caricare/rimuovere la propria foto. L’admin può farlo anche da **Team → Modifica persona**. Mansione e ruolo di accesso sono campi separati; l’admin rimane senza reparti. Le foto PNG/JPEG/WebP fino a 5 MB vengono ridimensionate prima dell’upload e salvate privatamente in `store-crm`, con lo stesso token Blob già configurato. L’endpoint `/api/users/[id]/avatar` richiede una sessione per la lettura e permette modifiche soltanto al titolare o all’admin. Nessun nuovo servizio o variabile Vercel è richiesto.


### Importazione Excel del piano editoriale

Da **Clienti → scheda cliente → Social → Calendario editoriale → Importa Excel** si carica un `.xlsx` fino a 4 MB. Il parser riconosce i modelli BNCom con Post/Argomento/Immagine, blocchi di celle unite e calendario settimanale con Post 1/Post 2/Storia. Ricompone i testi su più righe, conserva immagini consigliate e zone nelle note, ignora le posizioni vuote e distingue i contenuti Storia. Le date Excel sono lette nei sistemi 1900 e 1904; i soli riferimenti settimanali restano nelle note e non diventano giorni inventati.

L’anteprima permette di scegliere i fogli, assegnare un canale e correggere titolo, testo, note, data, ora, formato e stato. Il primo foglio compilato è selezionato inizialmente; gli altri richiedono una scelta esplicita. Le idee possono restare senza data; Programmato/Pubblicato richiedono una data valida. Il caricamento per l’anteprima non scrive sul database e non conserva il file originale su Blob.

Al primo caricamento si crea un piano con un nome riconoscibile, ad esempio cliente e mese. Per il file restituito dal cliente si sceglie lo stesso piano: i contenuti già importati sono esclusi inizialmente, con confronto dei valori attuali, e ogni aggiornamento va selezionato. Numeri Post, nome dei fogli e ordine delle righe vanno mantenuti per conservare i riferimenti. Per i blocchi si usa il numero Post, per gli elenchi datati il riferimento di riga, per le griglie settimanali il periodo e la colonna. Se il cliente cambia questi riferimenti occorre verificare l’anteprima: il parser non tenta abbinamenti approssimativi per titolo.

L’importazione selezionata è atomica; modifiche concorrenti rilevate dopo l’anteprima fermano l’intero salvataggio. Ripetere la creazione dello stesso piano non duplica i contenuti. Le righe escluse e quelle assenti dal nuovo file non vengono eliminate. Accesso riservato a Social e admin, con isolamento tra clienti. Il file originale rimane invariato; i contenuti non vengono pubblicati automaticamente sui social.

Limiti: 20 fogli, 300 contenuti per file, 2.000 righe/100 colonne e 50.000 celle complessive, archivio decompresso entro 20 MB. File `.xls`, macro e documenti protetti vanno salvati prima come `.xlsx` non protetto. Le immagini incorporate non vengono importate e le formule non vengono eseguite; si usano i risultati già salvati e si segnalano quelli mancanti. Verifica automatica ripetibile con `npm run test:editorial` su workbook sintetici, senza file aziendali.


### Fornitori Web

Gli amministratori gestiscono **Impostazioni → Fornitori Web**: nome, sito, note, modifica, archiviazione e riattivazione. Il catalogo è condiviso con gli account autenticati; nei servizi Web il fornitore si sceglie dalla tendina. La voce Da definire consente di completare il servizio quando il fornitore non è ancora noto. Il pulsante di aggiornamento della tendina ricarica il catalogo senza scartare il modulo.

Ogni servizio collegato conserva l’identificativo del fornitore: rinominarlo aggiorna anche il nome nei servizi e nei riepiloghi. Un fornitore archiviato resta nei servizi già collegati, ma non può essere assegnato ad altri servizi. La cancellazione è consentita soltanto in assenza di collegamenti; in caso contrario si usa l’archiviazione. Le modifiche al catalogo rilevano gli aggiornamenti concorrenti e i nomi duplicati.

I vecchi nomi digitati a mano rimangono conservati e compaiono come nome precedente quando si modifica il servizio; si può associarli esplicitamente a un fornitore del catalogo. Non vengono creati fornitori automaticamente né sostituiti i riferimenti storici. Social e Grafica mantengono il loro campo libero.

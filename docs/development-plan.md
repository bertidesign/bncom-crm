# Evoluzione operativa BNCom CRM

## Rilascio corrente

1. Avanzamento per reparto: stato autonomo per ciascun reparto coinvolto, con notifiche e controllo dei permessi. Lo stato generale del progetto resta una decisione esplicita.
2. Collaborazione: commenti a progetto e task, menzioni, allegati su Blob privato, versioni e download autenticato. Autore e admin possono modificare o eliminare i propri contenuti; le cancellazioni dei progetti includono i dati collegati.
3. La mia giornata: task personali, scadenze e blocchi, scorciatoie ai progetti e registrazione ore per account e task. L'admin vede il quadro dello studio.
4. Verifiche: migrazione degli archivi precedenti, permessi, upload privati, isolamento delle ore personali, flussi desktop/mobile, compilazione e deploy.

## Decisioni

- Identità visiva e palette esistenti; liste operative e schede progetto con sezioni navigabili.
- File fino a 25 MB: upload diretto a Blob con autorizzazione server, riferimento su Neon e download autenticato. Nessun token dello store nel browser.
- Le versioni precedenti rimangono scaricabili; le menzioni generano avvisi nel CRM secondo le preferenze personali.
- Le lavorazioni precedenti mantengono la descrizione della persona; le nuove includono l'account che le ha registrate. La vista personale conta solo ore attribuite con certezza all'account.

## Evoluzioni successive

Attività ricorrenti, pianificazione del carico, budget e consuntivi, approvazioni del cliente e pubblicazione integrata dei contenuti social. Queste funzioni costituiscono la roadmap dopo il rilascio operativo corrente.

## Verifiche del rilascio

Implementazione completata per i tre blocchi operativi. Build e controlli TypeScript superati. Flussi API verificati su archivio locale con account Admin, Web e Grafica: permessi degli stati, commenti, menzioni, privacy della giornata e delle ore, ticket upload e cancellazioni collegate. Verificate via browser le schermate desktop e mobile, la registrazione rapida delle ore, l’apertura di un task e il mantenimento della scheda durante gli aggiornamenti. I test Blob con provider simulato coprono callback ripetute, versioni concorrenti, dimensioni e percorsi; non costituiscono una prova di upload reale sullo store di produzione.

Verifica reale autorizzata completata il 4 novembre 2026 sul deploy `e4f3a2d`: creato un progetto tecnico temporaneo, caricato un file TXT su Blob privato e scaricato tramite sessione autenticata. Il confronto dei contenuti è riuscito. Eliminato il progetto, verificata anche dal pannello Vercel la rimozione del file dallo storage.

## Secondo rilascio operativo — modelli e flussi di lavoro

- Libreria di modelli condivisi, gestita dagli amministratori: creazione, modifica, duplicazione, eliminazione e salvataggio della struttura di un progetto esistente. Tre strutture iniziali: sito web, identità visiva e campagna social.
- Creazione da modello con scadenze relative alla data di avvio (giorni di calendario), milestone, reparti e prerequisiti. Gli assegnatari vengono determinati dalle persone scelte per il nuovo progetto, in base al reparto del task. I progetti creati sono indipendenti dal modello.
- Prerequisiti tra task dello stesso progetto, controllo dei cicli e blocco di avvio/completamento quando manca un prerequisito. Riaperture e cancellazioni rispettano le attività successive già avviate.
- Passaggi di consegna per task aperti: reparto destinatario, persone facoltative, nota, storico, presa in carico e annullamento con ripristino dell’incarico precedente. Gli amministratori coordinano e possono annullare, mentre la presa in carico è riservata ai collaboratori destinatari.
- Giornata personale con filtro Pronti, motivazione dei blocchi e coda delle consegne da accettare. Avvisi nel CRM con preferenza separata per passaggi e task pronti.

Verifiche del secondo rilascio: build e TypeScript, test API su archivi locali separati (permessi, copie indipendenti, scadenze, cicli, prerequisiti, notifiche senza duplicati, accettazioni ripetute e annullamenti), controlli browser desktop/mobile su creazione da modello, editor e gestione consegne. Queste verifiche usano dati locali; nessuna fixture aggiuntiva viene creata nel CRM di produzione.


## Terzo rilascio operativo — clienti e profili

- Scheda cliente autonoma `/clienti/[id]` con Riepilogo, Web, Social, Grafica e Progetti e ore; anagrafica estesa con referente, indirizzo e riferimenti fiscali. Collegamenti diretti al reparto e avvisi sulle modifiche non salvate.
- Servizi distinti dai progetti, con CRUD per reparto: stato, categoria, fornitore, pacchetto, frequenza, avvio, prossima data e note. Hosting, domini e licenze plugin hanno scorciatoie nel reparto Web. Nessun servizio viene dedotto automaticamente dai vecchi progetti.
- Informazioni Web su sito, CMS, staging, repository e manutenzione; Social su canali, obiettivi, pubblico, tono, frequenza e piano editoriale; Grafica su linee guida, font, colori, sorgenti, stampa e produzione.
- Calendario editoriale mensile e agenda, con CRUD dei contenuti, canale, formato, stato, data e ora, copy, creatività e referente. È uno strumento di pianificazione interna; la pubblicazione sui social resta esterna.
- Panoramica dei servizi attivi suddivisa per reparto, filtro rinnovi/consegne entro 30 giorni e contenuti Social da seguire entro 7 giorni, compresi quelli scaduti.
- Mansione professionale libera e foto per account, modificabili dal titolare o dall’admin. Le foto sono ridimensionate nel browser, conservate su Blob privato e lette tramite sessione; in Neon rimane il riferimento. L’admin resta un account di servizio senza reparti.
- Consultazione condivisa; servizi e informazioni di reparto modificabili dai relativi membri e dagli amministratori. Le informazioni di reparto controllano la versione salvata per evitare sovrascritture concorrenti. Eliminare il cliente rimuove anche servizi, dossier e contenuti editoriali.

Verifiche: 51 controlli API su archivio locale (validazioni, permessi, versioni concorrenti, riepiloghi e cancellazioni), controlli browser desktop/mobile e test con SDK Blob simulato per foto private, streaming autenticato, sostituzioni, conflitti e pulizia dopo commit fallito. Nessun dato dimostrativo aggiunto in produzione; il nuovo upload delle foto non è stato provato con scritture sul Blob reale.


## Importazione dei piani editoriali Excel

Implementati riconoscimento dei tre modelli disponibili, gestione di celle unite e testi di continuazione, preview con selezione dei fogli, correzione campi e conferma esplicita. I piani identificano gli import successivi; le righe già presenti sono escluse inizialmente e possono essere aggiornate dopo confronto, con controllo della versione e commit atomico. Nessuna cancellazione implicita delle righe mancanti.

Verifiche locali: i tre file di riferimento producono rispettivamente 6, 4 e 3/12 contenuti nei relativi fogli. Eseguiti 32 controlli API per permessi, anteprima senza scritture, creazione, aggiornamento, protezione dai duplicati, conflitti atomici, isolamento tra clienti e cancellazione collegata. I test persistenti usano soltanto Excel sintetici e coprono blocchi, griglie, date 1900/1904, link, formule senza cache e limiti degli archivi. Browser desktop/mobile verificato su dati sintetici per nuova importazione e reimportazione. Nessun file o contenuto dei clienti viene aggiunto in produzione dalle prove.

Rilascio compatibile con gli archivi precedenti: la nuova raccolta editorialPlans parte vuota. Il rollback del codice può lasciare i nuovi campi sul database senza alterare i record esistenti; non è prevista una migrazione distruttiva. In caso di regressione sul parser o sulla conferma, ripristinare il deployment precedente e mantenere gli import esistenti per l’analisi.


## Catalogo fornitori Web

Aggiunta la scheda amministrativa Fornitori Web nelle impostazioni, con CRUD, archiviazione, siti/note e conteggio dei servizi collegati. I servizi Web selezionano il fornitore per ID; i nomi precedenti rimangono preservati e sono associabili al catalogo. La rinomina aggiorna atomicamente i servizi; archiviazione e cancellazione rispettano i collegamenti. Il catalogo parte vuoto sugli archivi precedenti, senza migrazioni distruttive.

Verifiche locali: build e 34 controlli API su permessi, URL, nomi duplicati, riferimenti non validi, rinomina, archiviazione, conservazione dei nomi precedenti e aggiornamenti concorrenti. Browser desktop/mobile sulla scheda impostazioni e selezione/salvataggio di un fornitore nei servizi Web. Nessun fornitore dimostrativo aggiunto in produzione.

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

Modelli di progetto, dipendenze e passaggi di consegna, attività ricorrenti, pianificazione del carico, budget e consuntivi, approvazioni del cliente e calendario editoriale. Queste funzioni costituiscono la roadmap dopo il rilascio operativo corrente.

## Verifiche del rilascio

Implementazione completata per i tre blocchi operativi. Build e controlli TypeScript superati. Flussi API verificati su archivio locale con account Admin, Web e Grafica: permessi degli stati, commenti, menzioni, privacy della giornata e delle ore, ticket upload e cancellazioni collegate. Verificate via browser le schermate desktop e mobile, la registrazione rapida delle ore, l’apertura di un task e il mantenimento della scheda durante gli aggiornamenti. I test Blob con provider simulato coprono callback ripetute, versioni concorrenti, dimensioni e percorsi; non costituiscono una prova di upload reale sullo store di produzione.

Verifica reale autorizzata completata il 4 novembre 2026 sul deploy `e4f3a2d`: creato un progetto tecnico temporaneo, caricato un file TXT su Blob privato e scaricato tramite sessione autenticata. Il confronto dei contenuti è riuscito. Eliminato il progetto, verificata anche dal pannello Vercel la rimozione del file dallo storage.

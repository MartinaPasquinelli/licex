# Piano, rischi e accettazione

## 1. Definition of Ready e Definition of Done

**Ready.** Una story entra in sprint se ha obiettivo e valore chiari, è completabile in uno sprint, ha criteri di accettazione verificabili, dipendenze e rischi noti, UX/API/dati sufficientemente definiti, requisiti di sicurezza e privacy espliciti, dati o mock disponibili, e una stima condivisa (o uno spike concordato).

**Done.** Una story è chiusa quando:

- il codice è integrato via pull request revisionata e i test pertinenti passano;
- i criteri di accettazione sono verificati; API e migrazioni sono documentate e versionate;
- non ci sono segreti o dati sensibili nei log; errori e casi limite principali sono gestiti;
- il flusso è utilizzabile da tastiera; la documentazione tecnica è aggiornata;
- la demo è riproducibile in ambiente di sviluppo e i limiti noti sono registrati, non nascosti all'utente.

**Extra per wallet/RGB:** test di errore, timeout, ripristino e riconciliazione. **Extra per AI:** casi di incertezza, output non valido e documento ostile. **Extra per la rivendita:** test del cambio di titolare (nuovo titolare attivo, precedente disattivato, credenziali ruotate), del rifiuto dell'azienda e del seal speso durante l'offerta.

## 2. Piano Agile e spike

Scrum leggero con sprint di due settimane, backlog visibile, review e retrospettiva. Con un team di una persona si mantengono gli artefatti riducendo le cerimonie (planning settimanale, review su demo, retrospettiva breve). Le durate reali dipendono da dimensione del team, familiarità con RGB/WDK ed esito dello Sprint 0.

**MVP come fetta sottile end-to-end.** Un solo percorso completo con un'azienda demo, invece di molte funzioni superficiali:

1. L'azienda demo si registra, viene verificata e pubblica una licenza emessa come UDA, con politica di trasferibilità dichiarata.
2. L'acquirente la compra con swap atomico in asset RGB stabile (o con escrow, se lo swap non è dimostrato).
3. L'acquirente presenta la proof of holding e l'azienda demo attiva il software.
4. In parallelo, una richiesta software passa da QVAC locale → aggregazione privata → pledge in escrow → consegna simulata → licenza ai sostenitori oppure rimborso.
5. Dopo la prova dei passi 1-3, il titolare rivende la licenza a un secondo utente: l'azienda demo aggiorna il titolare e ruota le credenziali (Sprint 6).

Se questo percorso funziona, l'idea è dimostrata; il resto (report, comparazioni, più aziende) si aggiunge dopo. La rivendita è una fase successiva al percorso primario perché ne riusa swap e proof of holding: non si apre il mercato secondario finché la vendita primaria non è provata.

**Spike obbligatori** (nulla di ciò che dipende da RGB, WDK o QVAC va dato per scontato)

| Spike | Domanda                                                                                                                                                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1    | WDK + modulo RGB: emissione UDA, asset di pagamento stabile, trasferimento e ricezione, eventuale revoca on-chain? Altrimenti, quale libreria?                                                                                                                                                                                 |
| S2    | Swap atomico: due contratti RGB impegnati nella stessa transazione, con scambio off-chain della transazione parziale? Funziona anche tra due utenti privati?                                                                                                                                                                   |
| S3    | Proof of holding: come dimostrare il possesso di un asset all'azienda (consegna dello stato + firma della challenge) rivelando il minimo necessario?                                                                                                                                                                           |
| S4    | Escrow 2-di-3 e rimborso con timelock su seal RGB, per pagamenti protetti e pledge.                                                                                                                                                                                                                                            |
| S5    | QVAC: embedding, clustering, redazione dei dati personali ed estrazione dai termini di licenza sul dispositivo, con tempi e requisiti hardware.                                                                                                                                                                                |
| S6    | Legale e fiscale: ruolo della piattaforma, fatturazione e imposte, recesso per contenuti digitali, regole su cripto-asset e antiriciclaggio.                                                                                                                                                                                   |
| S7    | Rivendita: trasferimento di un UDA tra due utenti con WDK; come l'azienda viene a sapere del nuovo titolare; aggiornamento del registro e rotazione delle credenziali; swap con più destinatari (venditore, commissione, royalty); esito legale sulla rivendita (esaurimento del diritto) per le categorie di licenza ammesse. |

**Sprint**

| Sprint                             | Obiettivo                                                      | Contenuto principale                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Discovery                      | Eliminare le incertezze che possono invalidare l'architettura. | Repository, convenzioni, CI; spike S1–S7 (S7 almeno nella parte tecnica preliminare); azienda demo con endpoint di verifica, attivazione e cambio di titolare; matrice dei rischi e ADR. Exit: decisione documentata se proseguire con WDK RGB, usare un adapter di livello inferiore o ridurre il perimetro.                                                                      |
| 1 — Catalogo e account             | Consultare un catalogo di licenze demo.                        | Setup frontend/backend, schema DB (incluso modello di titolare e trasferibilità), autenticazione e ruoli, onboarding azienda e verifica, ricerca e dettaglio, CI, prima documentazione API.                                                                                                                                                                                        |
| 2 — Emissione e acquisto           | Il percorso completo di vendita.                               | Issuer Kit, emissione UDA con `transfer_policy` (US-29), listino firmato, riepilogo e conferma, swap (o escrow), proof of holding e attivazione demo, macchina a stati, test di errore e riconciliazione. Se la fattibilità manca non si simula una transazione reale: la UI resta in modalità demo chiaramente etichettata e si pianifica la rimozione del blocco.                |
| 3 — Inserzioni e assistente        | Pubblicare con l'aiuto di QVAC.                                | Wizard di inserzione, integrazione QVAC, JSON validato, revisione moderatore, rimborsi e revoche, audit log.                                                                                                                                                                                                                                                                       |
| 4 — Richieste e pledge             | La parte QVAC di software mancante.                            | Richieste in locale, aggregazione privata, matching, notifiche, consenso, pledge in escrow, consegna e rimborso simulati.                                                                                                                                                                                                                                                          |
| 5 — Watchlist, prezzi e rifinitura | Utilità anche prima di un mercato ampio.                       | Watchlist, storico e alert sulle inserzioni interne, storico acquisti, test di privacy, accessi e recupero.                                                                                                                                                                                                                                                                        |
| 6 — Mercato secondario             | Rivendita tra utenti con l'azienda demo.                       | Cambio di titolare e rotazione credenziali (US-30), offerta di rivendita (US-31), acquisto di seconda mano (US-32), approvazione dell'azienda (US-33), royalty (US-34), dispute (US-27 esteso), test end-to-end e di privacy. **Prerequisiti:** esito positivo di S2, S3 e S7 e parere legale su S6/S7; altrimenti si resta con `not_transferable` e la UI non offre la rivendita. |

**Fase successiva:** raccomandazioni semantiche avanzate, report vendite per le aziende, più aziende e integrazioni, fonti prezzo esterne autorizzate, ricerca in linguaggio naturale, scalabilità e osservabilità; estensione del mercato secondario a più aziende e categorie di licenza.

**Backlog tecnico trasversale**

- TECH-01/02: repository, branching, code style, template PR, pipeline CI (lint, test, build).
- TECH-03/04: convenzioni errori API e logging redatto; migrazioni e seed demo.
- TECH-05: threat analysis e registro dei rischi.
- TECH-06: azienda demo e Issuer Kit con API di verifica del possesso, cambio di titolare e rotazione credenziali, revoca e rimborso.
- TECH-07: macchina a stati per ordini, escrow e trasferimenti, con idempotenza.
- TECH-08: test e checklist di accessibilità; policy privacy e modello di consenso.
- TECH-09: ADR in `docs/adr/ADR-XXXX-titolo.md` (contesto, alternative, decisione, conseguenze, data).
- TECH-10: regole di rilevamento anomalie sulle rivendite (frequenza, importi, collegamenti tra wallet) per la revisione del moderatore.

## 3. Piano di test

- **Unitari:** validazione campi, transizioni di stato consentite e vietate (anche `transfer_status`), soglie alert, normalizzazione attributi, validazione output JSON di QVAC, autorizzazioni, calcolo delle commissioni e della royalty, controlli di ammissibilità della rivendita (politica, numero di passaggi, periodo minimo, stato della licenza).
- **Integrazione:** API e database, QVAC e parser dei termini, adapter WDK/RGB, swap ed escrow, Issuer Kit (compreso cambio di titolare), fonti prezzo e scheduler, notifiche.
- **End-to-end:** registrazione azienda → verifica → emissione → inserzione · acquirente → ricerca → riepilogo → swap → proof of holding → attivazione · rimborso e revoca · watchlist → cambio prezzo → notifica · richiesta software → aggregazione → pledge → consegna o rimborso · consenso disattivato → nessuna richiesta esposta alle aziende · **titolare → offerta di rivendita → approvazione (se richiesta) → swap → nuovo titolare → proof of holding → titolare aggiornato → vecchio titolare senza accesso · licenza `not_transferable` → rivendita non offerta · offerta con seal speso → invalidata · rivendita rifiutata dall'azienda · trasferimento fuori da LICEX → stato «non confermato».**
- **AI:** dataset controllato con termini di licenza completi, incompleti, con clausole ambigue (comprese quelle su cessione e trasferimento), con nomi o versioni simili, scansionati con OCR imperfetto, con testo che tenta di istruire il modello e con casi in cui la risposta corretta è «informazione non disponibile». Si misurano separatamente precisione, copertura, falsi positivi e negativi e capacità di dichiarare incertezza; nessuna metrica unica di «affidabilità».

## 4. Rischi principali

| Rischio                                                              | Impatto    | Mitigazione                                                                                                                                                    |
| -------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asset RGB trasferito ma software non attivato                        | Molto alto | Proof of holding con registro dell'azienda; stato «non confermato» dove manca l'integrazione.                                                                  |
| Problemi legali, fiscali, di tutela del consumatore                  | Molto alto | Revisione professionale prima del lancio; definire il ruolo non custodial; spike S6.                                                                           |
| Rivendita non consentita dalla legge o dai termini per certe licenze | Molto alto | Parere legale (S6/S7) prima di aprire il mercato secondario; ammettere solo le categorie di licenza validate; `not_transferable` come predefinito.             |
| Il venditore continua a usare il software dopo la rivendita          | Alto       | Rotazione obbligatoria delle credenziali; nessun segreto nell'asset; proof of holding ripetuta se prevista; registro del titolare unico.                       |
| WDK/RGB non supportano swap, UDA o escrow come previsto              | Alto       | Spike S1–S4 e S7; adapter sostituibile; ripiego su livello RGB inferiore, escrow o pagamento poi consegna (solo primario); nessuna promessa prima della prova. |
| Azienda falsa o impersonata                                          | Alto       | Verifica KYB, prova di controllo di dominio e chiave, firma dei listini, sospensione e audit.                                                                  |
| Poche aziende disposte a vendere in RGB o a consentire la rivendita  | Alto       | Partire da un'azienda partner; Issuer Kit semplice; benefici chiari (canale, registro, pagamenti, royalty).                                                    |
| QVAC interpreta male i termini (clausole di cessione comprese)       | Alto       | Riferimenti alle fonti, conferma dell'azienda, dichiarazione d'incertezza; l'AI non pubblica da sola.                                                          |
| Poca liquidità iniziale                                              | Alto       | Catalogo ristretto e caso d'uso specifico; nessuna promessa di mercato universale; mercato secondario aperto solo dopo il primario.                            |
| Violazione privacy nelle richieste aggregate                         | Alto       | Elaborazione locale, consenso separato, soglie minime, soppressione dei gruppi rari.                                                                           |
| Esposizione della storia dell'asset al nuovo acquirente              | Medio/alto | Informativa prima della conferma; minimizzare i dati nella consignment secondo S3; nessun dato personale aggiuntivo.                                           |
| Perdita di dati wallet/RGB                                           | Alto       | Procedure supportate, test di backup e ripristino, responsabilità spiegate all'utente.                                                                         |
| Ordine incoerente dopo un timeout                                    | Alto       | Idempotenza, macchina a stati, riconciliazione, audit.                                                                                                         |
| Riciclaggio o wash trading tramite rivendite                         | Alto       | Limiti di frequenza, regole di rilevamento anomalie, revisione del moderatore, parere antiriciclaggio (S6).                                                    |
| Offerte duplicate o su asset già ceduto                              | Medio/alto | Offerta unica per asset, invalidazione al seal speso, controllo dello stato presso l'azienda.                                                                  |
| Pledge fittizi o specifiche vaghe                                    | Medio/alto | Costo reale del pledge, soglie di richieste e di capitale, rilasci a milestone.                                                                                |
| Dati prezzo indisponibili                                            | Medio/alto | Partire dalle inserzioni interne e da fonti autorizzate.                                                                                                       |
| Azienda suggerita inadatta per una richiesta                         | Medio      | Motivazioni e limiti visibili; scelta in capo all'azienda.                                                                                                     |

## 5. Decisioni aperte (da chiudere nello Sprint 0)

1. Tipo di applicazione: web pura, desktop o web UI con servizio locale per QVAC e wallet (quest'ultima semplifica inferenza locale e integrazione wallet).
2. Rappresentazione RGB: UDA o schema personalizzato; cosa va nello stato del contratto e cosa resta off-chain; possibilità di revoca on-chain.
3. Asset di pagamento e rete per la demo, in funzione del supporto effettivo di WDK.
4. Swap ed escrow: meccanismo realmente supportato; chi è l'arbitro e come viene scelto.
5. Azienda demo: chi è, quali API offre per verifica del possesso, attivazione, revoca, rimborso e cambio di titolare.
6. Chi può vendere: solo produttori o anche rivenditori autorizzati; quali prove di autorizzazione si richiedono.
7. QVAC locale: modelli, runtime, requisiti hardware e comportamento senza GPU o con poca memoria.
8. Prezzi: solo inserzioni interne o anche fonti esterne autorizzate.
9. Consenso e conservazione: durata di conservazione di richieste e dati; gestione della revoca.
10. Perimetro legale: giurisdizione, categorie di software ammesse, gestione di IVA e fatture.
11. Utenti pilota e caso d'uso iniziale.
12. **Rivendita:** quali categorie di licenza possono essere trasferibili (perpetue? a tempo?) alla luce del parere legale; politica predefinita (`not_transferable` o altra); chi paga la royalty e come si divide con la commissione LICEX; limiti di frequenza e di numero di passaggi.
13. **Rivendita:** modalità con cui l'azienda riceve il cambio di titolare (proof of holding del nuovo titolare, notifica firmata) e come gestisce un trasferimento avvenuto fuori da LICEX.
14. **Rivendita:** se il venditore privato deve essere identificato (livello di verifica) e quali obblighi antiriciclaggio e fiscali ricadono su LICEX.
15. **Rivendita:** se ammettere il pagamento poi consegna o solo swap/escrow (il documento propone di escludere il primo); chi è l'arbitro delle dispute tra utenti.

## 6. Criteri di accettazione dell'MVP

L'MVP è pronto per una demo tecnica quando:

- il percorso di vendita (sezione 13) funziona end-to-end con un'azienda demo, oppure la UI è chiaramente etichettata come simulazione e il blocco tecnico è documentato;
- il wallet non firma senza conferma esplicita e la commissione è mostrata nel riepilogo;
- un'azienda può registrarsi, essere verificata da un moderatore e pubblicare un'inserzione con l'assistente QVAC, con output strutturato, incertezza e fonti;
- il sistema distingue verifica dell'azienda, firma dell'emittente, pagamento, asset RGB e attivazione;
- ogni licenza emessa dichiara la propria `transfer_policy` (anche solo `not_transferable`) e il registro dell'azienda supporta il cambio di titolare, anche se il mercato secondario non è ancora attivo;
- una richiesta software passa da QVAC locale all'aggregazione privata e, con consenso, a un pledge in escrow con consegna o rimborso;
- watchlist e alert funzionano sulle inserzioni interne;
- il consenso all'aggregazione è esplicito e testato; nessuna richiesta è esposta alle aziende senza consenso;
- test automatici e istruzioni di avvio sono disponibili e nessun codice di attivazione è pubblicato in chiaro.

**Criteri aggiuntivi per la demo del mercato secondario (Sprint 6).** La rivendita è dimostrata quando un titolare mette in vendita una licenza `transferable_*`, un secondo utente la compra con swap atomico (o escrow), l'azienda demo aggiorna il titolare e ruota le credenziali, il vecchio titolare non ha più accesso e il nuovo sì; una licenza `not_transferable` non è offerta in rivendita; nessuna rivendita è mostrata come «completata» prima dell'aggiornamento del titolare.

**Condizione essenziale:** una demo non presenta come «vendita completata» un semplice trasferimento di token se l'attivazione lato azienda non è stata dimostrata o dichiarata non verificata. Lo stesso vale per la rivendita.

## 7. Prossime azioni

1. Creare repository, `README.md`, `CONTRIBUTING.md` e template ADR.
2. Scegliere l'azienda demo e definire una licenza di test con API di attivazione funzionante in locale, compresi cambio di titolare e rotazione del codice.
3. Eseguire gli spike S1–S5 e S7 prima del checkout completo e avviare S6 con un professionista legale, includendo il tema della rivendita.
4. Concordare modello dati, stati e regole di verifica delle aziende; decidere la `transfer_policy` predefinita.
5. Implementare catalogo, dettaglio e inserimento senza transazioni reali; poi emissione, swap e proof of holding.
6. Aggiungere assistente QVAC per le inserzioni, richieste e pledge.
7. Aprire il mercato secondario (Sprint 6) solo dopo l'esito di S2, S3, S7 e del parere legale.
8. Testare privacy, accessi, recupero ed errori; far provare il prototipo a un piccolo gruppo di utenti e a una o due aziende, e rivedere il backlog.

**Struttura repository indicativa** (semplificabile per un prototipo individuale):

```
licex/
├── frontend/
├── backend/
├── packages/ (shared-types, wallet-rgb-adapter, issuer-kit)
├── tests/ (integration, e2e)
├── docs/ (product, architecture, adr, security, testing)
├── .github/workflows/
├── README.md
└── CONTRIBUTING.md
```

## 8. Glossario

- **Asset RGB:** asset rappresentato e trasferito con il protocollo RGB secondo le regole del contratto.
- **UDA:** schema RGB per asset unici.
- **Client-side validation:** il destinatario verifica localmente i dati necessari relativi al contratto.
- **Consignment:** dati trasferiti al destinatario per verificare e accettare uno stato o trasferimento RGB; include la storia rilevante dell'asset.
- **Seal:** vincolo di un asset RGB a un output Bitcoin, che ne determina il controllo.
- **Proof of holding:** prova, tramite firma di una challenge, che chi richiede l'attivazione controlla l'asset.
- **Issuer Kit:** libreria e endpoint per l'azienda (emissione, verifica del possesso, politica di trasferibilità, cambio di titolare, revoca, rimborsi).
- **Escrow:** blocco del pagamento fino a una condizione o a una scadenza.
- **KYB:** verifica dell'identità e dei dati di un'azienda.
- **Entitlement:** diritto di accesso o utilizzo riconosciuto dal sistema dell'azienda.
- **Mercato secondario / rivendita:** vendita di una licenza già acquistata da un titolare a un altro utente.
- **Politica di trasferibilità (`transfer_policy`):** regola fissata dall'emittente su se e come una licenza può essere rivenduta.
- **Cambio di titolare:** aggiornamento del registro dell'azienda dopo un trasferimento: nuovo titolare attivo, precedente disattivato.
- **Rotazione delle credenziali:** emissione di un nuovo codice di attivazione per il nuovo titolare e invalidazione del precedente.
- **Royalty:** quota del prezzo di rivendita riconosciuta all'emittente.
- **ADR:** Architecture Decision Record, breve documento che registra una decisione architetturale.
- **DoR / DoD:** Definition of Ready / Definition of Done.
- **MVP, Epic, User story, Story point:** versione minima verificabile; gruppo di story correlate; bisogno di un ruolo con criteri di accettazione; stima relativa di complessità e incertezza (non ore).

## 9. Riferimenti

Da ricontrollare in fase di implementazione: API e supporto possono cambiare.

- **RGB:** documentazione · schemi supportati · concetti di schema · contract transfers
- **WDK:** panoramica · moduli wallet · modulo RGB · API reference · gestione account e storage
- **QVAC:** SDK · ecosistema · CLI
- **Licensing e marketplace:** Keygen · Keygen Licenses API · LicenseSpring · Paddle · Envato Market — User Terms

_Questo documento non sostituisce una revisione legale, una specifica tecnica definitiva o una ricerca brevettuale. La prima priorità è dimostrare che il percorso ristretto è legittimo e tecnicamente realizzabile: licenza emessa dall'azienda, scambio in RGB con wallet WDK, attivazione che segue il token. Solo dopo si apre la rivendita tra utenti, con il consenso dell'emittente._

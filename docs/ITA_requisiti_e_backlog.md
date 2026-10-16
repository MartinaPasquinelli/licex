# Requisiti e backlog

## 1. Epiche e user stories

Priorità MoSCoW: Must (indispensabile per l'MVP), Should, Could. Le stime sono in story point relativi (SP), da rivedere in planning. Ogni criterio di accettazione si applica insieme alle regole delle sezioni 2, 5 e 8; le storie che dipendono da capacità RGB/WDK non ancora dimostrate sono subordinate agli spike.

### E1 — Account e privacy

**US-01 Registrazione e accesso** (Must, 5 SP) — Come utente voglio registrarmi, autenticarmi e chiudere la sessione per proteggere i miei dati.

- Un'email valida crea un account univoco; un'email già usata dà un errore comprensibile che non rivela informazioni superflue.
- Credenziali valide aprono la sessione, errate no; il logout la invalida; le operazioni privilegiate controllano i permessi lato server; nessuna password in chiaro.

**US-02 Preferenze di privacy** (Must, 3 SP) — Come utente voglio decidere se le mie richieste contribuiscono alle statistiche aggregate.

- Il consenso all'aggregazione è distinto dai termini generali; ne sono registrati versione e data; è revocabile per usi futuri.
- Senza consenso le richieste non arrivano mai alle aziende.

### E2 — Aziende e licenze

**US-03 Onboarding e verifica dell'azienda** (Must, 8 SP) — Come azienda voglio registrarmi e farmi verificare per poter vendere.

- Dati societari, prova di controllo del dominio e della chiave di firma; il moderatore approva, rifiuta o chiede integrazioni, con motivazione registrata.
- Una sola azienda verificata può pubblicare; lo stato `company_status` è visibile agli acquirenti.

**US-04 Emettere licenze come asset RGB** (Must, 13 SP, subordinata allo spike S1) — Come azienda voglio emettere licenze come UDA con hash dei metadati e mia firma, tramite l'Issuer Kit.

- Lo spike dimostra in ambiente controllato emissione, salvataggio, trasferimento e ricezione con la libreria scelta.
- L'asset non contiene chiavi o documenti in chiaro; se WDK non supporta lo schema necessario, l'alternativa è documentata in un ADR prima di proseguire.
- I metadati firmati includono la politica di trasferibilità (US-29).

**US-05 Creare un'inserzione con l'assistente QVAC** (Must, 8 SP) — Come azienda voglio pubblicare una licenza con prezzo e condizioni, aiutata da QVAC a estrarre i dati dai miei termini.

- QVAC estrae, se possibile, prodotto, edizione, versione, durata, piattaforme e clausole rilevanti (comprese quelle su cessione e trasferimento) dal testo dei termini, con riferimento al passaggio d'origine.
- Segnala ambiguità e campi mancanti senza inventare valori; l'azienda rivede e conferma; l'esito è etichettato «analisi AI».
- Campi minimi obbligatori; bozza salvabile; un'inserzione incompleta non si pubblica.

**US-06 Revisione delle inserzioni** (Should, 5 SP) — Come moderatore voglio rivedere le inserzioni nuove o segnalate prima che siano visibili.

- Vedo controlli e segnalazioni; posso approvare, rifiutare o sospendere; ogni decisione è registrata con autore e motivazione.

### E3 — Catalogo

**US-07 Cercare licenze** (Must, 5 SP) — Come acquirente voglio cercare per nome, categoria, produttore, versione e prezzo.

- Testo libero più filtri; i risultati mostrano prodotto, edizione/versione, prezzo, azienda verificata e tipo di licenza.
- Quando esiste il mercato secondario, filtro «nuova / seconda mano»; le offerte di seconda mano sono sempre riconoscibili.
- Senza risultati il sistema propone di creare una richiesta software.

**US-08 Dettaglio licenza** (Must, 3 SP) — Come acquirente voglio vedere condizioni, politica di rimborso e stato del venditore per valutare l'acquisto.

- Mostra descrizione, durata, piattaforme, politica di rimborso, politica di trasferibilità, meccanismo di pagamento disponibile e gli stati della sezione 2; le informazioni mancanti sono indicate.

**US-09 Confrontare alternative** (Should, 5 SP) — Come acquirente voglio confrontare prodotti simili per budget e bisogno.

- Alternative basate su caratteristiche, piattaforme, prezzo e uso previsto, ciascuna con motivazione e attributi sconosciuti segnalati; l'utente può correggere i criteri.

### E4 — Acquisto e attivazione

**US-10 Riepilogo e conferma** (Must, 5 SP) — Come acquirente voglio vedere prezzo, asset, destinatario, commissioni e rischio residuo prima di confermare.

- Serve un'azione esplicita dell'utente; nessuna transazione è firmata perché QVAC la suggerisce.

**US-11 Swap atomico licenza↔pagamento** (Must, 13 SP, subordinata allo spike S2) — Come acquirente voglio scambiare pagamento e licenza in RGB in modo atomico.

- Stati visibili: preparato, in attesa, inviato, ricevuto, validato, fallito, da riconciliare; nessun ordine «completato» sulla sola base della UI o dell'AI.
- Errori, timeout e riavvii non creano ordini duplicati.
- Se lo swap atomico non è supportato si usa l'escrow o il pagamento poi consegna (quest'ultimo solo nel mercato primario), e il limite è dichiarato nel riepilogo.

**US-12 Pagamento con garanzia di consegna** (Should, 13 SP, subordinata allo spike S4) — Come acquirente voglio che il pagamento sia protetto quando lo swap non è disponibile.

- Escrow con rilascio alla consegna o a scadenza; rimborso in caso di mancata consegna; l'arbitro interviene solo in caso di disputa.

**US-13 Proof of holding e attivazione** (Must, 8 SP, subordinata allo spike S3) — Come titolare voglio attivare il software dimostrando di possedere l'asset.

- L'azienda verifica la prova e registra l'esito, incluso il titolare registrato; senza integrazione lo stato è «non confermato» e si mostrano i passi manuali.
- Una licenza non è dichiarata «attivata» senza prova adeguata.

**US-14 Rimborsi e revoca** (Should, 5 SP) — Come azienda voglio gestire rimborsi e revoche dal portale.

- Il rimborso è un pagamento inverso con conferma esplicita; la revoca aggiorna il registro e lo stato mostrato all'acquirente; ogni azione è in audit log.
- Rimborso e revoca tengono conto del titolare corrente e dello storico dei passaggi.

**US-15 Storico acquisti e ricevute** (Should, 3 SP) — Come acquirente voglio ritrovare le mie licenze e le ricevute.

- Elenco con stato di attivazione, ricevuta con importo, asset, commissione e azienda; i dati sensibili sono mostrati solo al titolare.
- Le licenze rivendute restano nello storico come «cedute», senza più accesso al software.

### E5 — Watchlist e prezzi

**US-16 Watchlist** (Must, 2 SP) — Come acquirente voglio salvare una licenza per ritrovarla.

- Aggiunta e rimozione; la watchlist è privata.

**US-17 Alert di prezzo** (Must, 5 SP) — Come acquirente voglio una notifica quando il prezzo scende sotto una soglia.

- Soglia e canale configurabili; dati da fonti dichiarate, con indicazione di dati obsoleti; nessuna notifica duplicata per la stessa variazione.

**US-18 Storico prezzi** (Should, 5 SP) — Come acquirente voglio consultare lo storico per valutare la convenienza.

- Il grafico distingue dati registrati, intervalli senza dati e valori stimati; indica fonte e periodo; non inventa storico precedente alla raccolta.
- Il prezzo delle offerte di seconda mano è mostrato separatamente da quello del mercato primario.

### E6 — Software mancante

**US-19 Descrivere un software desiderato** (Must, 5 SP) — Come utente voglio descrivere ciò che non trovo; QVAC locale lo struttura e rimuove i dati personali.

- Descrizione, caso d'uso, OS, requisiti e budget opzionale; la sintesi proposta da QVAC va confermata; la richiesta è modificabile e cancellabile.
- Resta privata (anche solo locale) o è salvata sul servizio con informativa chiara.

**US-20 Corrispondenze e alternative** (Must, 5 SP) — Come utente voglio essere avvisato quando compare un prodotto simile.

- Confronto con nuove inserzioni (anche di seconda mano, segnalate come tali); ogni corrispondenza ha motivazione e requisiti non soddisfatti o sconosciuti; feedback di pertinenza; notifiche conformi a preferenze e consenso.

**US-21 Aggregazione privata** (Must, 8 SP) — Come utente consenziente voglio che QVAC raggruppi e anonimizzi la mia richiesta sul dispositivo.

- Solo dopo consenso; verso il servizio escono solo categorie, con soglia minima di numerosità.
- Nessuna email, nome o testo libero riconducibile; categorie rare soppresse o generalizzate; la gestione dei dati già aggregati dopo una revoca è definita nella policy.

**US-22 Pledge su una richiesta** (Should, 8 SP, subordinata allo spike S4) — Come utente voglio impegnare un importo in RGB su una richiesta di software mancante.

- Importo e scadenza espliciti, fondi in escrow; ogni firma richiede conferma.

**US-23 Consegna e rimborso del pledge** (Should, 8 SP) — Come sostenitore voglio ricevere la licenza alla consegna o il rimborso alla scadenza.

- A rilascio verificato (anche a milestone) i fondi vanno all'azienda e i sostenitori ricevono la licenza nativa; alla scadenza i pledge sono rimborsati automaticamente.

**US-24 Opportunità e RFP per le aziende** (Could, 8 SP) — Come azienda voglio consultare domanda aggregata, capitale impegnato e una specifica di base, e prendere in carico una richiesta.

- Scheda con numero aggregato, casi d'uso, requisiti ricorrenti, capitale impegnato e budget quando i dati bastano; RFP generato da QVAC.
- Il punteggio di compatibilità è indicativo, non una previsione di ricavi; nessun contatto con utenti individuali; nessuna promessa di sviluppo.

### E7 — Assistente QVAC

**US-25 Ricerca in linguaggio naturale** (Should, 8 SP) — Come utente voglio chiedere a QVAC di trovare prodotti che soddisfino i miei requisiti.

- La richiesta diventa filtri o query strutturate; i risultati vengono dal catalogo reale, con riferimenti alle inserzioni; nessun prezzo o caratteristica inventata; le azioni che modificano dati o avviano transazioni richiedono conferma.

**US-26 Spiegazione dei termini** (Should, 5 SP) — Come utente voglio una spiegazione semplice delle clausole di una licenza.

- Rimanda a clausole o pagine d'origine, evidenzia le ambiguità senza trasformarle in certezze (comprese le clausole su cessione e trasferimento) e precisa che non sostituisce consulenza legale.

### E8 — Moderazione e report

**US-27 Segnalazioni e dispute** (Should, 8 SP) — Come amministratore voglio gestire segnalazioni e dispute per limitare frodi e risolvere contestazioni.

- Ogni segnalazione ha stato e cronologia; sospensione temporanea di aziende o inserzioni secondo policy documentate; azioni in audit log; la cronologia tecnica di un asset non è modificata retroattivamente.
- Include le dispute sulla rivendita (attivazione non riassegnata, licenza non valida, offerta fraudolenta), con la procedura della sezione 5.1.

**US-28 Report vendite per l'azienda** (Could, 5 SP) — Come azienda voglio vedere vendite, attivazioni e rimborsi.

- Totali per periodo, licenze emesse e attivate, rimborsi; esportazione; nessun dato personale dell'acquirente oltre a quanto necessario all'attivazione.
- Con il mercato secondario: rivendite, royalty incassate e passaggi di titolare per periodo.

### E9 — Mercato secondario (rivendita tra utenti)

**US-29 Definire la politica di trasferibilità** (Must, 3 SP) — Come azienda voglio stabilire se e come le mie licenze possono essere rivendute.

- Per ogni licenza scelgo `not_transferable` (predefinito), `transferable_with_approval` o `transferable_free`; posso impostare royalty, numero massimo di passaggi e periodo minimo di possesso.
- La politica è inclusa nei metadati firmati dell'asset e mostrata agli acquirenti nel dettaglio; non è modificabile dopo l'emissione se non per le licenze future.
- È una Must perché va decisa all'emissione, anche se il mercato secondario si apre più tardi (Sprint 6).

**US-30 Cambio di titolare e rotazione delle credenziali** (Should, 8 SP, subordinata agli spike S3 e S7) — Come azienda voglio che, dopo un passaggio di titolare, il nuovo titolare sia riconosciuto e il vecchio perda l'accesso.

- Dopo la proof of holding del nuovo titolare, il registro dell'Issuer Kit aggiorna il titolare, disattiva quello precedente e ruota i codici di attivazione (nuovo codice cifrato per il nuovo titolare, precedente invalidato).
- Lo stato mostrato è `holder_updated` solo dopo l'aggiornamento; fino ad allora «trasferimento eseguito, attivazione da riassegnare».
- L'operazione è idempotente, tracciata in audit log, e nessun codice compare in chiaro nei log.

**US-31 Mettere in vendita una licenza** (Should, 8 SP, subordinata allo spike S7) — Come titolare voglio mettere in vendita a prezzo fisso una licenza che non uso più.

- Posso creare l'offerta solo se i controlli deterministici (sezione 5.1) sono superati; vedo il motivo se non lo sono.
- L'offerta è firmata dal mio wallet con conferma esplicita; una sola offerta attiva per asset; è ritirabile finché non è in corso uno swap; si invalida se il seal viene speso.
- Prima della conferma vedo cosa comporta la vendita: perdita dell'accesso, commissione, royalty, informativa sulla storia visibile dell'asset.

**US-32 Acquistare una licenza di seconda mano** (Should, 13 SP, subordinata agli spike S2 e S7) — Come acquirente voglio comprare una licenza da un altro utente con le stesse garanzie di un acquisto dall'azienda, per quanto possibile.

- Riepilogo con prezzo, commissione LICEX, royalty, destinatario, numero di passaggi e rischio residuo; conferma esplicita.
- Solo swap atomico o escrow; il pagamento poi consegna non è ammesso; se nessuno dei due è disponibile l'offerta non si pubblica.
- Ordine «completato» solo con swap confermato e titolare aggiornato dall'azienda; errori e timeout non creano ordini duplicati.
- L'offerta è etichettata come seconda mano e mostra se l'emittente ha confermato il cambio di titolare per i passaggi precedenti.

**US-33 Approvazione delle rivendite da parte dell'azienda** (Should, 5 SP) — Come azienda voglio approvare o rifiutare le rivendite delle mie licenze quando la politica lo richiede.

- Vedo le richieste con licenza, titolare, numero di passaggi e motivo; approvo o rifiuto con motivazione; il venditore e l'acquirente sono avvisati.
- Un rifiuto blocca l'offerta; l'azienda può anche negare l'attivazione al nuovo titolare se il trasferimento è avvenuto fuori dalla politica.

**US-34 Royalty e commissioni sulla rivendita** (Could, 5 SP) — Come azienda voglio ricevere una royalty sulle rivendite.

- Royalty e commissione LICEX sono calcolate e distribuite nello stesso swap, mostrate nel riepilogo e riportate nei report; il calcolo è coperto da test unitari.
- Se lo swap a più destinatari non è supportato, la royalty è gestita con regola alternativa documentata in un ADR.

## 2. Requisiti non funzionali

| Area                      | Requisito                                                                                                                                                                         | Verifica                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Sicurezza                 | Segreti, chiavi wallet e codici di attivazione non nei log né in chiaro nel database.                                                                                             | Code review, test sui log, verifica storage.                                          |
| Privacy                   | Solo i dati necessari; nessuna condivisione con le aziende senza consenso; la storia di un asset ceduto non espone dati personali dei precedenti titolari oltre alla consignment. | Test dei permessi e dei flussi di consenso.                                           |
| Trasparenza               | Stati ed etichette della sezione 2 coerenti in UI e API; le licenze di seconda mano sono sempre riconoscibili.                                                                    | Test UI e API.                                                                        |
| Affidabilità              | Un retry non duplica ordini, escrow, trasferimenti o cambi di titolare.                                                                                                           | Test di idempotenza e timeout.                                                        |
| Coerenza del titolare     | Dopo un passaggio di titolare un solo titolare ha accesso attivo; il precedente è disattivato e le sue credenziali invalidate.                                                    | Test end-to-end sul registro dell'Issuer Kit.                                         |
| Auditabilità              | Azioni amministrative, rimborsi, revoche, approvazioni di rivendita, cambi di titolare ed esiti di verifica tracciati, con fonte e timestamp.                                     | Ispezione audit log.                                                                  |
| Usabilità e accessibilità | Errori chiari; navigazione da tastiera, label accessibili, contrasto adeguato.                                                                                                    | Test con utenti; verifica automatica e manuale (tastiera, screen reader).             |
| Prestazioni               | Tempi accettabili sul dataset MVP.                                                                                                                                                | Soglie da definire dopo una baseline, non prima.                                      |
| Portabilità               | Dipendenze wallet/RGB isolate dietro un adapter.                                                                                                                                  | Test dell'interfaccia adapter, piattaforme documentate.                               |
| Manutenibilità            | API documentate, migrazioni versionate, test, review obbligatoria.                                                                                                                | CI verde.                                                                             |
| Correttezza AI            | Output strutturati, verificabili, con gestione dell'incertezza.                                                                                                                   | Dataset di test, precision/recall, casi limite.                                       |
| Recuperabilità            | Backup e ripristino di database e dati wallet/RGB.                                                                                                                                | Prova di ripristino.                                                                  |
| Legalità                  | Conformità a termini di licenza, policy del marketplace e norme applicabili, incluse quelle sulla rivendita di software.                                                          | Revisione legale prima del rilascio pubblico e prima di aprire il mercato secondario. |

## 3. Modello dati iniziale

Modello concettuale; i campi definitivi emergeranno in progettazione.

| Entità                        | Contenuto principale                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User                          | id, identificatore/email, ruoli, preferenze notifiche e privacy.                                                                                                                                                                                                                                                         |
| Company                       | dati societari, dominio, chiave pubblica di firma, `company_status`, politica di rimborso, politica di trasferibilità predefinita e royalty, moderatore che ha approvato.                                                                                                                                                |
| SoftwareProduct               | nome, azienda, categoria, descrizione, piattaforme, URL ufficiale, attributi normalizzati.                                                                                                                                                                                                                               |
| LicenseListing                | azienda, prodotto, edizione, versione, tipo e durata della licenza, prezzo e asset di pagamento, termini (testo e hash), meccanismo di pagamento, `transfer_policy`, royalty, numero massimo di passaggi, periodo minimo di possesso, stato (draft, pending_review, published, suspended, rejected).                     |
| RgbAssetReference             | schema/contratto, identificativi tecnici, emittente, stato di emissione/trasferimento, impegno (hash) sul segreto off-chain se previsto.                                                                                                                                                                                 |
| Order                         | acquirente, venditore (azienda o utente), azienda, inserzione, tipo (`primary` o `resale`), prezzo, commissione LICEX, royalty, meccanismo (swap, escrow o pagamento poi consegna, quest'ultimo solo `primary`), `payment_status`, stato, riferimenti alle operazioni wallet/RGB, chiave di idempotenza, errore redatto. |
| ResaleListing                 | licenza (LicenseRecord), venditore, prezzo, asset di pagamento, firma dell'offerta, controlli superati/falliti, `transfer_status`, scadenza, offerta unica attiva per asset.                                                                                                                                             |
| TransferRecord                | licenza, titolare precedente e nuovo (identificativi tecnici minimizzati), ordine collegato, approvazione dell'azienda, data dello swap, data di aggiornamento del titolare, rotazione credenziali eseguita sì/no, numero progressivo del passaggio.                                                                     |
| LicenseRecord                 | ordine, titolare registrato corrente, `license_status`, `activation_status`, data di attivazione, motivo di revoca, numero di passaggi già avvenuti.                                                                                                                                                                     |
| Escrow                        | ordine o richiesta collegata, scadenza, condizione di rilascio, stato, arbitro.                                                                                                                                                                                                                                          |
| PriceObservation / PriceAlert | fonte, prezzo, valuta, data, freschezza, tipo (primario o seconda mano) · soglia, condizione, canale, ultima notifica.                                                                                                                                                                                                   |
| WantedSoftwareRequest         | requisiti strutturati (testo originale solo se l'utente sceglie di salvarlo sul servizio), budget, piattaforma, `privacy_mode`, consenso all'aggregazione, stato.                                                                                                                                                        |
| Pledge                        | richiesta, importo, scadenza, escrow collegato, stato (impegnato, rilasciato, rimborsato).                                                                                                                                                                                                                               |
| DemandOpportunity             | categoria normalizzata, conteggio e soglia applicata, requisiti ricorrenti, capitale impegnato, RFP, punteggio e motivazione per azienda; nessun identificativo individuale.                                                                                                                                             |
| AuditEvent                    | attore, azione, entità, timestamp, esito, dettagli minimizzati.                                                                                                                                                                                                                                                          |

Gli stati della sezione 2 si applicano ad azienda, asset, pagamento, licenza, attivazione e trasferimento e vanno normalizzati nel codice e nell'API. In nessuna entità compaiono chiavi di attivazione in chiaro.

# Visione, modello e obiettivi

## 1. Visione e valore

LICEX è un marketplace non custodial in cui aziende verificate vendono licenze software come asset RGB e i titolari possono rivenderle ad altri utenti se l'emittente lo consente. Gli utenti pagano in un asset RGB e ricevono la licenza nel proprio wallet WDK; QVAC, in locale sul dispositivo, aiuta a capire i termini, a cercare e a trasformare i bisogni non soddisfatti in richieste strutturate, anonime e, se l'utente lo vuole, finanziate.

Tre mercati collegati:

1. **Licenze vendute dalle aziende (mercato primario):** emissione, pubblicazione, ricerca, acquisto e attivazione di licenze firmate dall'emittente.
2. **Rivendita tra utenti (mercato secondario):** il titolare di una licenza trasferibile la mette in vendita; il passaggio di proprietà avviene con swap atomico e l'azienda riassegna l'attivazione al nuovo titolare.
3. **Software che non esiste ancora:** l'utente descrive un bisogno, QVAC lo struttura e cerca alternative; con consenso la richiesta diventa un segnale aggregato e, con un impegno economico, una prevendita che le aziende possono raccogliere.

**Problema.** Chi compra software online non sa sempre se il venditore è autorizzato o se la chiave funzionerà; i termini di licenza sono difficili da interpretare; per le aziende, incassare e gestire licenze su canali diversi è oneroso; chi ha comprato una licenza che non usa più di solito non ha modo sicuro di rivenderla; la domanda di software che manca resta invisibile.

**Valore per ciascun attore**

| Per                          | Valore                                                                                                                                                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chi compra                   | Venditori verificati, licenza firmata dall'emittente, pagamento protetto, attivazione che segue il possesso dell'asset, termini spiegati in modo semplice.                                                  |
| Aziende venditrici           | Un canale di vendita con pagamento in RGB, licenze non falsificabili, un registro delle licenze emesse e attivate, il controllo sulle regole di rivendita e, se lo desiderano, una royalty sulle rivendite. |
| Chi rivende                  | Un modo sicuro per recuperare valore da una licenza non più usata: pagamento atomico, nessun rischio di consegna, passaggio di titolare gestito dall'azienda.                                               |
| Chi acquista di seconda mano | Una licenza a prezzo ridotto con provenienza verificabile e attivazione riassegnata dall'azienda, non una chiave copiata.                                                                                   |
| Chi cerca software mancante  | Richieste private, alternative suggerite, possibilità di finanziare ciò che manca.                                                                                                                          |
| Sviluppatori e aziende       | Domanda aggregata con capitale già impegnato, senza dati personali.                                                                                                                                         |

**Principi di prodotto**

1. Il token segue il diritto: l'attivazione dipende dal possesso dell'asset RGB.
2. Verificabilità prima della comodità: i controlli critici sono deterministici; l'AI spiega, estrae e raccomanda, ma non decide.
3. Non custodial: LICEX non detiene fondi né chiavi degli utenti.
4. Privacy per impostazione predefinita: i dati restano sul dispositivo; ogni condivisione richiede consenso esplicito.
5. Nessun segreto (codici di attivazione, chiavi) in chiaro on-chain, nei log o nel database.
6. L'utente vede importo, asset, destinatario e commissioni e conferma ogni firma.
7. Sviluppo incrementale: prima un percorso completo e ristretto, poi l'ampliamento.
8. L'emittente resta in controllo: la rivendita è possibile solo se e come l'azienda l'ha prevista, e dopo ogni passaggio di titolare l'accesso del vecchio titolare cessa.

## 2. Il modello LICEX: licenza nativa e tre livelli

Ogni licenza in vendita è nativa: l'azienda la emette come asset RGB unico (UDA) con hash dei metadati e la propria firma. Questo elimina quasi del tutto il rischio di licenze false, ma un trasferimento RGB, da solo, non basta a dare accesso al software. LICEX distingue sempre:

| Livello                  | Domanda                                                            | Come lo si garantisce                                             |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Controllo dell'asset RGB | Chi controlla l'asset secondo lo stato e le regole del contratto?  | Validazione RGB lato client; consegna dello stato all'acquirente. |
| Autenticità              | La licenza è stata emessa da un'azienda verificata?                | Firma dell'emittente e verifica dell'azienda (sezione 8).         |
| Attivazione effettiva    | Il sistema dell'azienda riconosce il titolare e concede l'accesso? | Proof of holding (sezione 5) e registro dell'Issuer Kit.          |

**Trasferibilità.** Ogni licenza dichiara una politica di trasferibilità (`transfer_policy`), fissata dall'azienda emittente al momento dell'emissione e firmata insieme ai metadati:

| Valore                       | Significato                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `not_transferable`           | La licenza resta legata all'acquirente originale: l'azienda attiva solo il titolare registrato. Nessuna rivendita. È il valore predefinito.             |
| `transferable_with_approval` | Il titolare può rivendere, ma ogni passaggio richiede l'approvazione dell'azienda (che può rifiutare, ad esempio per motivi di licenza o di sicurezza). |
| `transferable_free`          | Il titolare può rivendere liberamente; l'azienda viene solo notificata e riassegna l'attivazione dopo il trasferimento.                                 |

L'azienda può inoltre stabilire: una **royalty** sulle rivendite (percentuale o importo fisso, inserita nello stesso swap), un numero massimo di trasferimenti, un periodo minimo di possesso prima della rivendita e l'esclusione della rivendita quando la licenza è scaduta, revocata o ha un trasferimento già in corso. Gli stessi limiti si applicano all'MVP: il modello dati e l'Issuer Kit supportano il cambio di titolare fin dall'inizio; il mercato secondario è consegnato in uno sprint dedicato (sezione 13).

**Il passaggio di proprietà è un fatto tecnico, il passaggio dei diritti è una decisione dell'azienda.** Un trasferimento RGB di una licenza `not_transferable` o non approvata può avvenire sul piano tecnico (l'asset è del titolare), ma l'azienda non riassegna l'attivazione e LICEX non lo propone né lo presenta come valido. Per questo la rivendita è consentita nell'interfaccia solo dopo i controlli deterministici descritti nella sezione 5.1.

**Stati separati (mai un unico campo verified=true):**

- `company_status`: pending / verified / suspended / rejected
- `ai_review_status`: not_started / analyzed / flagged / failed (solo per l'assistente di inserzione)
- `rgb_asset_status`: not_created / issued / transfer_pending / transferred / validation_error
- `payment_status`: not_started / pending / received / failed / refunded
- `license_status`: active / revoked / expired
- `activation_status`: unknown / pending / confirmed / failed / not_supported
- `transfer_status` (solo per la rivendita): none / requested / approved / rejected / swap_pending / swapped / holder_updated / failed

**Etichette in interfaccia:** «Venditore verificato» · «Licenza firmata dall'emittente» · «Pagamento ricevuto» · «Asset RGB trasferito» · «Attivazione confermata» · «Rivendita consentita dall'emittente» · «Titolare aggiornato dall'emittente». Nessun badge generico come «100% sicura». Se una verifica non è possibile, lo stato è «non verificabile con le fonti disponibili», mai «verificato». Una licenza di seconda mano mostra sempre che è tale, il numero di passaggi già avvenuti e se l'emittente ha confermato il cambio di titolare.

## 3. Obiettivi, non-obiettivi e KPI

**Obiettivi dell'MVP**

- Dimostrare un percorso completo con un'azienda demo: emissione di una licenza come UDA, vendita, swap atomico in pagamento RGB, proof of holding, attivazione.
- Onboarding e verifica delle aziende, con un assistente QVAC che aiuta a compilare l'inserzione partendo dai termini di licenza.
- Gestire richieste di software mancante in locale con QVAC, con aggregazione privata e pledge in escrow.
- Watchlist e alert di prezzo sulle inserzioni interne.
- Documentare limiti, rimborsi e condizioni di vendita.
- Predisporre il modello (politica di trasferibilità, registro del titolare, rotazione delle credenziali) per il mercato secondario.

**Obiettivi della fase di rivendita (Sprint 6, dopo la prova del percorso primario)**

- Dimostrare un passaggio di titolare completo con l'azienda demo: offerta di rivendita, controlli, swap atomico tra utenti, aggiornamento del registro, rotazione delle credenziali, perdita di accesso del vecchio titolare.
- Applicare le politiche di trasferibilità e la royalty definite dall'azienda.

**Non-obiettivi dell'MVP**

- Rivendita di licenze non soggette alla politica dell'emittente, o di licenze non emesse tramite LICEX.
- Rivendita tra utenti senza il consenso dell'azienda emittente.
- Sostituire i sistemi di attivazione e revoca delle aziende: LICEX offre l'Issuer Kit, non un servizio di licensing completo.
- Certificare la bontà di un'azienda basandosi solo sull'AI.
- Supportare ogni wallet, schema RGB e sistema operativo.
- Lasciare che QVAC firmi o spenda fondi senza conferma esplicita.
- Mostrare alle aziende richieste riconducibili a singoli utenti, o garantire che un'azienda realizzi il software richiesto.
- Un mercato secondario con aste, offerte al ribasso, ordini a mercato o strumenti finanziari: la rivendita è a prezzo fisso fissato dal venditore.

**KPI (target da fissare dopo una baseline con utenti reali)**

- % di acquisti conclusi con swap atomico e attivazione automatica; tempo dall'acquisto all'attivazione.
- Aziende che completano l'onboarding e tempo per pubblicare la prima inserzione.
- Incongruenze correttamente segnalate dall'assistente su un set di test controllato.
- Alert di prezzo corretti rispetto alle variazioni memorizzate.
- Richieste software salvate, quota che diventa pledge, capitale impegnato per richiesta, % di rimborsi corretti a scadenza.
- Aziende che adottano l'Issuer Kit e volume di vendite.
- Mercato secondario: quota di licenze con politica di trasferibilità diversa da `not_transferable`; rivendite concluse; tempo dal pagamento all'aggiornamento del titolare; % di rivendite in cui l'accesso del vecchio titolare è cessato correttamente; royalty versate alle aziende.

## 4. Attori e ruoli

| Attore                             | Responsabilità                                                                                                                                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acquirente                         | Cercare, confrontare, acquistare, conservare l'asset ricevuto e attivare il software.                                                                                                                                                    |
| Titolare rivenditore               | Chi possiede una licenza trasferibile e la mette in vendita: fissa il prezzo, conferma la firma del trasferimento, perde l'accesso al software dopo il passaggio di titolare.                                                            |
| Azienda venditrice                 | Produttore o rivenditore autorizzato dal produttore: emette le licenze, fissa condizioni, prezzo e politica di trasferibilità, riceve il pagamento (e l'eventuale royalty), gestisce attivazione, cambio di titolare, revoca e rimborsi. |
| Sviluppatore / azienda interessata | Consultare la domanda aggregata e il capitale impegnato, consegnare il software richiesto.                                                                                                                                               |
| Moderatore / amministratore        | Verifica delle aziende, segnalazioni, sospensioni, arbitraggio, audit; gestione delle dispute sulle rivendite.                                                                                                                           |
| Legale / compliance                | Contratti, protezione dei dati, tutela del consumatore, fiscalità e fatturazione, regole sui cripto-asset e sull'antiriciclaggio, esaurimento dei diritti sulla rivendita di software.                                                   |

Ruoli applicativi: Guest (consultazione pubblica), Utente registrato (profilo, watchlist, richieste, pledge, acquisti, rivendite), Azienda (accesso a inserzioni, Issuer Kit e report dopo verifica), Moderatore. Un account può avere più ruoli; l'autorizzazione è sempre controllata lato server.

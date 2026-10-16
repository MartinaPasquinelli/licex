# Pagamenti, architettura e sicurezza

## 1. Pagamento e vendita in RGB

**Componenti**

- **Asset licenza:** UDA con hash dei metadati, politica di trasferibilità e firma dell'emittente. Nessun codice di attivazione o documento nel contratto.
- **Asset di pagamento:** un asset RGB stabile (ad esempio USDT su RGB, se disponibile nel wallet scelto), per evitare la volatilità tra offerta e chiusura. _Ipotesi da verificare._
- **Listino firmato:** l'azienda pubblica le offerte firmate con la propria chiave; il server fa da indice e coordinamento e non tocca fondi né chiavi.
- **Wallet WDK sul dispositivo dell'utente:** firma solo dopo la conferma esplicita del riepilogo (importo, asset, destinatario, commissioni).

**Come avviene l'acquisto**

| Meccanismo                                              | Descrizione                                                                                                                                                                         | Stato                                                                                                                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Swap atomico (principale)                               | I trasferimenti dei due contratti (licenza e pagamento) sono impegnati nella stessa transazione Bitcoin, quindi avvengono insieme o per nulla.                                      | Ipotesi da validare (spike S2).                                                                                                                                 |
| Escrow 2-di-3 (alternativa)                             | Acquirente, azienda e arbitro: il pagamento si sblocca alla consegna della licenza o a scadenza.                                                                                    | Ipotesi da validare (S4).                                                                                                                                       |
| Pagamento poi consegna (ripiego, solo mercato primario) | L'acquirente paga; l'azienda trasferisce la licenza entro un termine dichiarato, con politica di rimborso. Il rischio per l'acquirente non è azzerato ed è mostrato in interfaccia. | Sempre disponibile per il mercato primario. **Non ammesso nella rivendita tra utenti**, dove non esiste un'azienda con obblighi di rimborso verso l'acquirente. |

Non si presenta mai come atomico un flusso che non lo è.

**Proof of holding.** Per attivare il software il titolare firma una challenge con la chiave collegata al seal RGB dell'asset. L'azienda, che ha creato il contratto, può validare lo stato dell'asset con il proprio stash e concede l'accesso: l'attivazione segue il token. Come presentare la prova senza rivelare più storia del necessario è oggetto dello spike S3.

**Segreti off-chain.** Se il sistema dell'azienda richiede comunque un codice, questo non viaggia nello swap: l'azienda lo cifra con la chiave pubblica dell'acquirente dopo il pagamento e ne pubblica l'impegno (hash, meglio con salt) nei metadati. Dopo un passaggio di titolare l'azienda emette un nuovo codice cifrato per il nuovo titolare e invalida quello precedente (vedi 5.1): per questo il segreto non deve mai stare dentro l'asset, dove resterebbe visibile a tutti i titolari futuri.

**Commissione LICEX.** Inserita nello stesso swap e mostrata nel riepilogo. Nella rivendita si aggiunge, se prevista, la royalty dell'emittente.

**Rimborsi e revoca.** L'azienda stabilisce la politica di rimborso; il rimborso è un pagamento inverso avviato dall'azienda. La revoca vive nel registro dell'azienda: l'asset resta nel wallet, ma l'attivazione viene negata e lo stato `license_status` diventa «revoked» in interfaccia. Se il contratto RGB possa prevedere una revoca on-chain è da valutare in S1. Il rimborso del primo acquirente dopo una rivendita non è previsto: l'ultimo titolare ha gli stessi diritti di rimborso solo se la politica dell'azienda lo dice.

### 1.1 Rivendita tra utenti (mercato secondario)

Principio: **l'asset RGB prova il possesso, l'azienda decide se il possesso dà diritto all'accesso.** Il flusso rispetta le stesse regole della vendita primaria (il token segue il diritto, nessun segreto on-chain, conferma esplicita di ogni firma) e aggiunge il cambio di titolare.

| Fase                  | Cosa succede                                                                                                                                                                                                                                                                                        | Chi decide / verifica             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1. Offerta            | Il titolare crea un'offerta di rivendita a prezzo fisso, in un asset di pagamento ammesso, firmata con la chiave collegata al seal dell'asset.                                                                                                                                                      | Il titolare.                      |
| 2. Controlli          | LICEX controlla in modo deterministico: `transfer_policy` ammette la rivendita, licenza `active` e non scaduta, nessun trasferimento già in corso, numero massimo di passaggi non superato, periodo minimo di possesso rispettato, offerta valida (seal non speso). L'esito è in `transfer_status`. | Codice, non AI.                   |
| 3. Approvazione       | Con `transferable_with_approval`, l'azienda approva o rifiuta tramite l'Issuer Kit. Un rifiuto blocca l'offerta con una motivazione.                                                                                                                                                                | L'azienda.                        |
| 4. Pubblicazione      | L'offerta compare nel catalogo come «seconda mano», con numero di passaggi, stato della licenza, politica di rimborso (se esiste) e se è prevista una royalty.                                                                                                                                      | Sistema.                          |
| 5. Acquisto           | L'acquirente vede un riepilogo con prezzo, asset, commissione LICEX, royalty dell'emittente, destinatario e rischio residuo, e conferma.                                                                                                                                                            | L'acquirente.                     |
| 6. Swap               | Licenza e pagamento sono scambiati nella stessa transazione (swap atomico, S2). Il pagamento si divide tra venditore, commissione LICEX ed eventuale royalty. Se lo swap non è supportato si usa l'escrow; mai «pagamento poi consegna».                                                            | Wallet di entrambi, con conferma. |
| 7. Cambio di titolare | Il nuovo titolare presenta la proof of holding. L'azienda aggiorna il registro: nuovo titolare registrato, vecchio titolare disattivato, credenziali ruotate (nuovo codice cifrato per il nuovo titolare, il precedente invalidato). Lo stato diventa `holder_updated`.                             | L'azienda tramite Issuer Kit.     |
| 8. Chiusura           | L'ordine è «completato» solo con lo swap confermato e il titolare aggiornato dall'azienda. Prima: «trasferimento eseguito, attivazione da riassegnare».                                                                                                                                             | Macchina a stati.                 |

**Regole specifiche della rivendita**

1. **Il vecchio titolare perde l'accesso.** La rotazione delle credenziali e la disattivazione dell'identità precedente sono obbligatorie per ogni passaggio. Senza questa garanzia chi rivende potrebbe continuare a usare il software con la chiave che già possiede; per questo il segreto non va mai dentro l'asset e la proof of holding è ripetuta alle verifiche periodiche dell'azienda (se previste).
2. **Una sola offerta attiva per asset.** Un'offerta pubblicata blocca le altre sullo stesso asset; si invalida se il seal viene speso. L'unicità dello stato RGB impedisce la doppia vendita dello stesso asset; i controlli di LICEX evitano offerte duplicate o già superate.
3. **Trasparenza sulla storia.** Chi acquista di seconda mano riceve la consignment (storia dell'asset) necessaria alla validazione RGB: può dunque vedere dati tecnici dei passaggi precedenti. L'utente è informato prima della conferma; nessun dato personale dei precedenti titolari è comunicato oltre la consignment.
4. **Stato della licenza dichiarato.** Prima della pubblicazione l'offerta mostra se la licenza è attiva, scaduta o revocata secondo l'azienda; se l'azienda non è raggiungibile lo stato è «non verificabile» e la pubblicazione è bloccata o chiaramente segnalata.
5. **Nessun rimborso implicito.** Un'offerta di seconda mano non eredita la politica di rimborso del primo acquisto, salvo diversa indicazione dell'azienda, che è mostrata nel dettaglio.
6. **Dispute.** In caso di mancata riassegnazione dell'attivazione dopo un trasferimento approvato, l'acquirente può aprire una disputa; il moderatore valuta con l'azienda e, se esiste escrow, l'arbitro decide il rilascio. Il comportamento on-chain non è modificato retroattivamente.
7. **Prezzo.** Prezzo fisso fissato dal venditore; LICEX non fissa tetti né minimi, salvo diversa indicazione legale o dell'emittente.

_Ipotesi tecniche da validare in S7 (e in S1, S2, S3):_ disponibilità dello schema e delle API per trasferire un UDA tra utenti con WDK; possibilità di includere royalty e commissione nello stesso swap; modo in cui l'azienda riceve la notizia del trasferimento (proof of holding del nuovo titolare, o notifica con prova); gestione di un asset trasferito fuori da LICEX (in tal caso l'azienda può non riconoscerlo e lo stato resta «non confermato»).

### 1.2 Possesso, attivazione e consegna della chiave: come funziona con RGB e WDK

Questa sezione descrive il meccanismo per cui **chi possiede l'asset ottiene l'accesso al software e, se serve, la chiave**, e come tutto si aggiorna quando la licenza cambia titolare. Valgono le regole della sezione 2 (tre livelli) e dei principi 1 e 5 (il token segue il diritto; nessun segreto nell'asset).

**Cosa fa ciascun componente**

| Componente              | Ruolo                                                                                                                                                                                                           | Cosa NON fa                                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asset RGB (la licenza)  | Dice chi controlla il diritto: il possesso è legato a un output Bitcoin (seal) che solo il titolare può spendere. Il trasferimento passa per una consignment inviata al destinatario, che la valida localmente. | Non contiene la chiave. Non avvisa l'azienda quando cambia titolare: la blockchain non vede i trasferimenti e l'azienda, da sola, non può «guardare» chi possiede cosa. |
| Wallet WDK (modulo RGB) | Custodisce le chiavi dell'utente sul suo dispositivo, riceve e invia asset RGB, firma messaggi (la challenge della proof of holding), crea il backup cifrato.                                                   | Non decide chi può usare il software.                                                                                                                                   |
| Azienda (Issuer Kit)    | Ha creato il contratto, tiene il registro dei titolari, verifica il possesso, rilascia la chiave cifrata per il titolare, la ruota a ogni cambio di titolare e nega l'accesso a chi non è più titolare.         | Non tocca i fondi né le chiavi dell'utente.                                                                                                                             |
| LICEX                   | Indice, coordinamento, interfaccia, notifica all'azienda dei trasferimenti avvenuti sulla piattaforma.                                                                                                          | Non custodisce asset, chiavi o segreti.                                                                                                                                 |

**Flusso di attivazione e consegna della chiave (primo titolare)**

1. L'acquirente riceve l'asset nel proprio wallet (swap o altro meccanismo della sezione 5).
2. L'app genera una **chiave di cifratura dedicata**, distinta dalla chiave del wallet e dal seal, e ne pubblica la parte pubblica nella richiesta di attivazione.
3. L'azienda invia una **challenge** (valore casuale, con scadenza, legato a licenza e acquirente). Il wallet WDK la firma con la chiave collegata all'asset e fornisce, secondo quanto deciso in S3, la minima prova di possesso necessaria.
4. L'azienda **verifica il possesso** con il proprio stash RGB (è il contratto che ha creato) e controlla che la licenza sia `active`.
5. Se la verifica riesce, l'azienda registra il titolare e consegna il segreto: **cifra la chiave con la parte pubblica dell'acquirente** e la restituisce, oppure concede direttamente l'accesso (token di sessione, account) senza chiave. L'impegno (hash con salt) della chiave è già nei metadati firmati, così l'acquirente può verificare di aver ricevuto la chiave giusta.
6. L'app decifra localmente. La chiave non compare in chiaro nell'asset, nel database di LICEX né nei log; `activation_status` diventa `confirmed` solo dopo l'esito registrato dall'azienda.

**Cambio di titolare e invio della nuova chiave**

1. Il titolare vende l'asset (rivendita, sezione 5.1) e lo swap/escrow si chiude.
2. Il **nuovo** titolare avvia l'attivazione con la stessa procedura: challenge, firma, verifica del possesso.
3. L'azienda aggiorna il registro: nuovo titolare attivo, **vecchio titolare disattivato**, vecchia chiave invalidata, **nuova chiave cifrata per il nuovo titolare**.
4. Se il trasferimento è avvenuto sulla piattaforma, LICEX avvisa anche l'azienda; se è avvenuto fuori da LICEX, l'azienda lo scopre solo quando qualcuno chiede l'attivazione e lo stato resta «non confermato» finché la prova non è presentata.
5. Per il software che funziona solo online (account, token, server di licenza) la disattivazione del vecchio titolare è effettiva subito. Per il software **offline** che accetta una chiave perpetua, l'azienda non può «ritirare» la chiave già consegnata: serve una verifica periodica online, o la licenza va dichiarata non adatta alla rivendita (`not_transferable`).

**Cosa si può fare oggi e cosa no** (verifica sulla documentazione disponibile a ottobre 2026; da confermare con S1–S4 e S7 su codice reale)

| Funzione                                                                                                                                         | Stato oggi                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Emettere l'asset licenza con WDK come asset fungibile non inflazionabile (NIA), ad esempio un asset con offerta N, dove ogni unità è una licenza | Documentato nel modulo WDK RGB. Le unità sono intercambiabili: l'identità del titolare vive nel registro dell'azienda.                                             |
| Emettere la licenza come UDA (asset unico) con WDK                                                                                               | **Non esposto** nell'API WDK del modulo rilasciato. Possibile solo scendendo a un livello RGB inferiore (da verificare in S1).                                     |
| Trasferire e ricevere asset RGB tra due utenti (invoice monouso, consignment, transport endpoint)                                                | Documentato nel modulo WDK RGB.                                                                                                                                    |
| Firmare una challenge con il wallet                                                                                                              | Il modulo espone la firma di messaggi; il formato e il legame con il seal vanno provati in S3.                                                                     |
| Verifica del possesso lato azienda (con stash e consignment)                                                                                     | **Non è una funzione pronta**: va costruita nell'Issuer Kit (S3).                                                                                                  |
| Swap atomico licenza↔pagamento tra due contratti                                                                                                 | Non documentato nel modulo WDK on-chain. Swap atomici RGB esistono in ambiente Lightning (software ancora in alpha) e in altri progetti; per WDK da provare in S2. |
| Consegnare la chiave cifrata dopo la verifica del possesso                                                                                       | **Fattibile oggi**: è crittografia standard e logica dell'azienda, non richiede funzioni RGB speciali.                                                             |
| Aggiornare titolare e ruotare la chiave dopo la rivendita                                                                                        | **Fattibile oggi** come software dell'azienda; la parte difficile è sapere che è avvenuto un trasferimento (punto 4 sopra).                                        |
| Asset di pagamento stabile (USDT su RGB)                                                                                                         | Da verificare disponibilità e supporto nel wallet scelto (decisione aperta 3).                                                                                     |

**Conseguenza di progetto.** La strada più concreta oggi è: licenze come asset NIA trasferibili con WDK; registro del titolare e consegna della chiave cifrata nell'Issuer Kit; proof of holding costruita in S3; pagamento con escrow o pagamento poi consegna finché lo swap atomico non è dimostrato. UDA e swap atomico restano obiettivi da dimostrare, non presupposti. Il modulo WDK RGB è mantenuto dalla community e non è garantito da Tether o dal team WDK: va trattato come dipendenza da valutare (vedi sezione 7). Il wallet richiede inoltre una cartella dati locale persistente: perderla invalida i saldi RGB anche se la seed resta valida, quindi il backup cifrato fa parte del flusso utente.

## 2. Richieste di software mancante con QVAC

Oggi una richiesta è solo un segnale; con QVAC, WDK e RGB può diventare una prevendita impegnata che le aziende possono raccogliere.

1. QVAC locale struttura la richiesta (casi d'uso, requisiti, piattaforma, budget), rimuove i dati personali e cerca alternative nel catalogo con embedding locali. Il catalogo include le offerte di seconda mano, segnalate come tali.
2. Se non esiste nulla di adatto, l'utente può pubblicare una scheda anonima a grana grossa (categoria e requisiti generalizzati), mai il testo originale.
3. Aggregazione privata: il raggruppamento di richieste simili avviene sul dispositivo; verso il servizio escono solo categorie, con soglia minima di numerosità e soppressione dei gruppi rari. Il rumore differenziale è un'opzione da valutare.
4. L'utente può fare un pledge in RGB in escrow, con importo e scadenza.
5. Le aziende verificate vedono domanda aggregata, capitale impegnato e una specifica di base (RFP) che QVAC genera dai requisiti ricorrenti, e possono prendere in carico la richiesta.
6. Consegna: a rilascio verificato (anche a milestone) i fondi vanno all'azienda e i sostenitori ricevono la licenza nativa del nuovo software, con sconto early backer.
7. Mancata consegna: alla scadenza il pledge viene rimborsato (timelock, ipotesi da validare in S4).

Ruoli di QVAC: strutturazione e redazione, rimozione dei dati personali, embedding e matching, clustering e deduplica, generazione dell'RFP, abbinamento con aziende a partire da documentazione pubblica. I suggerimenti sono raccomandazioni, non garanzie.

**Rischi:** richieste artificiali (sybil) e specifiche vaghe. **Mitigazioni:** il pledge ha un costo reale, soglie minime sia di richieste sia di capitale, rilasci a milestone.

## 3. Architettura e tecnologie

**Architettura logica** (non custodial: chiavi e fondi restano nel wallet dell'utente)

```
[Client acquirente / rivenditore: Web UI / desktop]
   +--> [Wallet WDK] --> [Adapter RGB] --> [Bitcoin / rete RGB]
   +--> [QVAC locale: termini, ricerca, richieste]
   +--> [API LICEX] --> [PostgreSQL: catalogo, ordini, rivendite, stati, audit]
            +--> [Worker: prezzi, notifiche, riconciliazione ordini e trasferimenti]

[Portale azienda + Issuer Kit] --> emissione UDA, listino firmato,
                                   proof of holding, politica di trasferibilità,
                                   approvazione rivendite, cambio di titolare
                                   e rotazione credenziali, revoca, rimborsi
[Fonti prezzo autorizzate]     <-- storico (solo se previste)
```

Il dettaglio dell'integrazione tra browser, processo QVAC, WDK e librerie RGB si decide dopo gli spike. Una web app su server non deve presentare come locale un'inferenza che invia dati a un backend remoto.

**Stack candidato**

| Area               | Candidato                          | Verifica necessaria                                                                                               |
| ------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Frontend           | React + TypeScript + Vite          | Accessibilità, integrazione con il client wallet.                                                                 |
| Backend            | Node.js + TypeScript, REST         | Autenticazione, sessioni, autorizzazioni.                                                                         |
| Database           | PostgreSQL                         | Migrazioni, retention, indici.                                                                                    |
| AI locale          | QVAC SDK                           | Runtime, modelli, prestazioni, output strutturato, requisiti hardware.                                            |
| Wallet             | WDK                                | API, firma, recupero, compatibilità RGB, trasferimento di UDA tra utenti.                                         |
| Asset              | RGB                                | Schema, issuance, consignment, swap, backup.                                                                      |
| Issuer Kit         | Libreria + endpoint per le aziende | Emissione, verifica del possesso, revoca, politica di trasferibilità, cambio di titolare e rotazione credenziali. |
| Worker e notifiche | Worker backend; email e/o in-app   | Fonti dati, frequenza, provider, preferenze.                                                                      |
| Osservabilità      | Log strutturati e metriche         | Nessun segreto o documento nei log.                                                                               |

**Moduli separati:** Identity & Access · Company Onboarding · Listings · Resale & Transfers · Issuer Kit · AI Assistant (prompt versionati, output strutturati) · Wallet & RGB Adapter (unico contatto con le librerie, sostituibile) · Orders & Escrow (nessun ordine «completato» prima delle conferme) · Price Monitoring · Wanted Software & Pledges · Demand Insights · Notifications & Audit.

**Stato dell'arte e dipendenze** (da verificare in implementazione)

- Marketplace e vendita di prodotti digitali (Envato Market, Paddle) mostrano la domanda di acquisto online con condizioni di licenza; nessuno è costruito su asset RGB.
- Gestione licenze (Keygen, LicenseSpring) mostrano che il record di proprietà non basta: serve il sistema dell'azienda. Per questo LICEX introduce l'Issuer Kit, che gestisce anche il cambio di titolare.
- RGB: asset e contratti con Bitcoin come ancoraggio e validazione lato client. Gli schemi per asset unici (UDA) sono i candidati naturali per una licenza identificabile. Un asset RGB è trasferibile per costruzione tecnica; la restrizione di rivendita è una regola applicativa dell'emittente, non una proprietà del protocollo, salvo diversa verifica in S1/S7.
- WDK: il modulo RGB (@utexo/wdk-wallet-rgb, versione 2.0.3 documentata) è mantenuto dalla community e, secondo la sua documentazione, non espone l'emissione di UDA/CFA tramite l'API dell'account WDK, ha un solo account e artefatti nativi solo per alcuni OS/architetture; supporta emissione di asset NIA, invio e ricezione, firma di messaggi e backup cifrato (dettaglio in 5.2). Va trattato come dipendenza da valutare, con un livello RGB inferiore come ripiego.
- QVAC: inferenza AI locale (modelli linguistici, embedding, RAG) secondo SDK e modelli supportati. Locale è l'inferenza, non l'intera piattaforma: prezzi, notifiche e aggregazione richiedono servizi di rete.
- Prima di rivendicare novità servono ricerca di anteriorità e valutazione legale.

**Assunzioni e vincoli**

- Esistono aziende disposte a vendere licenze in RGB, ad adottare l'Issuer Kit e, per una parte, a consentire la rivendita.
- Gli utenti accettano di usare un wallet self-custodial e di gestire i propri backup.
- QVAC non può verificare fatti esterni senza evidenze accessibili.
- Il wallet dipende da backup, rete, sincronizzazione e gestione corretta delle consignment.
- Le aziende sono in grado di aggiornare il registro del titolare e ruotare le credenziali dopo un trasferimento; senza questa capacità la rivendita non è offerta per quella licenza.

## 4. Fiducia, sicurezza e privacy

**Minacce principali:** azienda falsa o impersonata · listino manipolato o prezzi alterati · furto di credenziali o dispositivo wallet · perdita del wallet o dei backup RGB · asset trasferito ma attivazione negata · doppio acquisto e ordini duplicati dopo timeout · esposizione di codici o dati personali · re-identificazione da richieste rare aggregate · risposte AI errate o troppo sicure · richieste e pledge artificiali · **rivendita di licenze revocate o scadute presentate come valide · venditore che continua a usare il software dopo la rivendita · offerte di rivendita duplicate o su asset già ceduto · trasferimenti di licenza fuori dalle regole dell'emittente · riciclaggio o wash trading tramite rivendite in sequenza · esposizione della storia dell'asset al nuovo acquirente**.

**Contromisure**

- Verifica delle aziende (KYB): controllo dei dati societari, prova di controllo del dominio e della chiave di firma, revisione di un moderatore; stato `company_status` visibile.
- Firma dei listini e delle licenze con la chiave dell'azienda, verificata con codice deterministico, non con il modello. La politica di trasferibilità è nei metadati firmati e non è modificabile da LICEX o dal venditore.
- Output AI vincolati a uno schema, con fonti esplicite e validati prima dell'uso; contenuti caricati trattati come dati, mai come istruzioni.
- Nessuna firma o invio di transazioni da parte dell'AI senza conferma dell'utente.
- Cifratura in transito e a riposo, gestione sicura delle chiavi, nessun segreto in log, analytics o metadati pubblici.
- Idempotency key e macchina a stati per ordini, escrow e trasferimenti.
- Rate limit, controllo accessi, protezione da abuso, audit log; sospensione delle aziende segnalate secondo policy.
- Consenso separato per l'aggregazione; soglie minime e soppressione dei gruppi piccoli.
- Backup e ripristino per database e componenti wallet/RGB secondo le indicazioni delle librerie.
- **Rivendita:** controlli deterministici pre-pubblicazione (stato della licenza presso l'azienda, politica, numero di passaggi, offerta unica per asset); rotazione obbligatoria delle credenziali a ogni passaggio di titolare; solo swap atomico o escrow, mai pagamento poi consegna; segnalazione di pattern anomali (stessa licenza rivenduta ripetutamente, importi anomali, collegamenti tra portafogli) per revisione del moderatore; limiti di frequenza per account; informativa all'utente sulla storia visibile dell'asset.

**Aspetti legali (da confermare con un professionista).** Servono pareri su: ruolo della piattaforma e responsabilità verso i consumatori; fatturazione e imposte sulle vendite in asset RGB; diritto di recesso per contenuti digitali; regole su cripto-asset e antiriciclaggio; protezione dei dati. **Rivendita:** il tema dell'esaurimento del diritto di distribuzione del software, in UE affrontato dalla giurisprudenza della Corte di giustizia sul commercio di licenze «usate» (caso UsedSoft), e il suo rapporto con licenze a tempo, in abbonamento o con vincoli contrattuali; l'obbligo di cancellare o rendere inutilizzabile la copia da parte di chi rivende; il ruolo dell'azienda emittente nel consentire o limitare il trasferimento; il trattamento fiscale e antiriciclaggio del venditore privato e della piattaforma. Il perimetro dipende da giurisdizione e tipo di licenza e va chiuso prima di aprire il mercato secondario. Essere non custodial può ridurre ma non eliminare questi obblighi.

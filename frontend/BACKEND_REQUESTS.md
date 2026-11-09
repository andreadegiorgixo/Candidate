# Richieste al backend

**Stato (fase 5, 6 novembre 2026).** Il frontend parla con il backend vero per accesso, account (compreso il link LinkedIn), candidature, città e **CV** (file caricati): quei dati finiscono nel database. Tutto il resto il backend non lo ha ancora, quindi il frontend lo tiene **nel browser** (`localStorage`, separato per account) e si perde cambiando browser o svuotando i dati del sito. Il punto unico in cui avviene la traduzione è `src/app/core/backend/` (`backend.interceptor.ts`, `adattatore.ts`, `archivio-locale.ts`). Ogni voce che il backend aggiunge si attiva togliendo il ramo corrispondente dell'interceptor.

Il mock (`src/app/core/mock/`) resta solo per i test e per lavorare senza backend: `npm run start:mock`.

## 0. Cosa è già collegato e cosa no

| Voce | Stato | Dettaglio |
|---|---|---|
| `POST /api/auth/register`, `/login` | **Collegato** | Il frontend traduce `{ accessToken, expiresAt }` in `{ token, scadenza }`. |
| `GET /api/account/me` | **Collegato** | Include `linkedin` (stringa, assente se non c'è). Mancano `obiettivoSettimanale` e `sogliaAttesaGiorni`: stanno nel browser (predefiniti 10 e 14). |
| `PUT`, `DELETE /api/account/me` | **Adattato** | Non esistono: il frontend usa `PUT /api/account/{id}` e `DELETE /api/account/delete/{id}`, con l'id preso dal `sub` del token. Il `PUT` manda sempre anche `linkedin` (`""` = rimuovi: un `PUT` senza il campo lo cancella). |
| `GET`, `POST`, `PUT`, `DELETE /api/candidatura` | **Collegato in parte** | Il backend salva solo i campi base. `spontanea`, `fonte`, `prossimaAzioneTesto`, `prossimaAzioneData`, `idCv` stanno nel browser (`idCv` è l'id di un CV vero del server: se il CV non esiste più, il frontend lo azzera alla lettura dell'elenco dei CV). Le candidature create altrove ricevono `fonte: ALTRO`. |
| `GET /api/candidatura/{id}/storico` | **Ricostruito nel browser** | Il frontend registra gli stati che vede: parte dallo stato attuale alla data di invio e aggiunge un evento alla data di oggi a ogni cambio. Lo storico di candidature già avanzate prima della prima apertura è quindi incompleto. |
| `GET`, `POST /api/citta` | **Collegato** | |
| `GET /api/cv`, `POST /api/cv`, `PUT /api/cv/{id}`, `GET /api/cv/{id}/file`, `DELETE /api/cv/{id}` | **Collegato** | Migrazione `V2__cv_e_linkedin.sql`. `POST`/`PUT` sono `multipart/form-data` (`nome`, `file`); solo PDF, DOC, DOCX, massimo 5 MB. Il file si scarica con una richiesta autenticata (Blob). `idCv` nelle candidature resta nel browser. Le vecchie versioni «con link» salvate nel browser vengono scartate: non si possono trasformare in file. |
| colloqui, contatti, promemoria per azienda, modelli, offerte | **Solo nel browser** | Nessun endpoint nel backend. |

## 1. Da implementare per togliere il salvataggio nel browser

| Voce | Cosa assume il frontend |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | Risposta `{ token, scadenza, account }`. Il login sbagliato risponde `401` con `detail`. La registrazione con email già usata risponde `409`. |
| `GET`, `PUT`, `DELETE /api/account/me` | `PUT` accetta `{ nome, cognome, email, linkedin, obiettivoSettimanale, sogliaAttesaGiorni, password? }` (`linkedin` è già nel backend). La password è opzionale e, se c'è, ha almeno 8 caratteri. Non viene mai restituita. `DELETE` cancella anche tutti i dati dell'utente. Oggi nel backend esistono `/api/account/{id}`: servono le versioni `/me`. |
| `GET /api/candidatura` | Tutte le candidature dell'utente, senza filtri né paginazione: il browser filtra e ordina. Ogni elemento ha anche `spontanea`, `fonte`, `prossimaAzioneTesto`, `prossimaAzioneData`, `idCv` e `citta` come oggetto completo. |
| `POST /api/candidatura` | Non riceve `idAccount`: viene dal token. Il frontend non invia `id`, `idAccount` né `dataCreazione`. |
| `GET /api/candidatura/{id}/storico` | `{ stato, dataEvento, nota }[]`. **Il primo evento deve essere `IN_FASE_DI_ATTESA` alla data di invio**, e un nuovo evento va creato a ogni cambio di stato fatto con `PUT`. `dataEvento` è una `LocalDate`. L'ordine non conta: il frontend riordina. |
| `GET`, `POST /api/citta` | Il `GET` restituisce tutte le città. Il `POST` risponde `409` con `detail` leggibile se la città esiste già (stesso nome e provincia, ignorando maiuscole). |
| `GET`, `POST`, `PUT`, `DELETE /api/colloquio` | Vedi sezione 3. `PUT` e `DELETE` su `/api/colloquio/{id}`. |
| `GET`, `POST`, `PUT`, `DELETE /api/contatto` | `{ id, nomeAzienda, nome, ruolo, email, linkedin, note }`. `PUT` e `DELETE` su `/{id}`. Stringhe vuote invece di `null` per i campi facoltativi. |
| `GET`, `PUT /api/azienda/{nome}/promemoria` | `{ nonRicontattarePrimaDel: LocalDate | null }`. Il `GET` risponde `200` con `null`, non `404`, se il promemoria non c'è. Il nome va confrontato **ignorando maiuscole, accenti e spazi in eccesso** (lo stesso criterio di `normalizzaAzienda` in `src/app/core/azienda.ts`). |
| `GET`, `POST`, `PUT`, `DELETE /api/cv` | **Fatto** (vedi sezione 0): `{ id, nome, nomeFile, contentType, dimensione, dataCaricamento }`, file in `multipart/form-data`, download da `/api/cv/{id}/file`. |
| `GET`, `POST`, `PUT`, `DELETE /api/modello` | `{ id, tipo, nome, testo }`. `PUT` e `DELETE` su `/{id}`. |
| `GET`, `POST`, `PUT`, `DELETE /api/offerta` | Vedi sezione 3. `PUT` e `DELETE` su `/{id}`. |

## 2. Errori

Il backend usa già `ProblemDetail` (RFC 9457) e il frontend lo legge così:

- `400` con `errors: { campo: messaggio }`: ogni messaggio compare sotto il campo corrispondente. Servono quindi **messaggi in italiano** e nomi di campo uguali a quelli del JSON (`nomeAzienda`, `email`, `password`, ...).
- `409` con `detail`: compare sul campo (l'email in registrazione e nel profilo, `nomeCitta` per le città).
- `404`: pagina «non trovata» nel contesto.
- `401` su richieste autenticate: il frontend esce e torna a `/accedi` conservando la pagina. Il `401` del login non provoca l'uscita.
- Gli altri errori: snackbar con «Riprova», che usa `detail` se è un testo leggibile.

## 3. Cose che il brief non definisce e che ho dovuto scegliere

Se il backend preferisce altri valori, basta cambiare `src/app/core/api/models.ts` e `src/app/core/stati.ts`.

- **`Colloquio.tipo`**: `CONOSCITIVO`, `TECNICO_1`, `TECNICO_2`, `ALTRO`.
- **`Colloquio.dataOra`**: `LocalDateTime` come `YYYY-MM-DDTHH:mm`, senza secondi né fuso orario.
- **`Colloquio.checklist`**: `{ testo: string, fatto: boolean }[]`.
- **`Colloquio.domande`**: `string[]`. **`voto`**: intero da 1 a 5 oppure `null` finché non c'è il resoconto. **`daMigliorare`**: testo oppure `null`.
- **`Modello.tipo`**: `SOLLECITO`, `RINGRAZIAMENTO`, `SPONTANEA`. I segnaposto `{azienda}`, `{ruolo}`, `{contatto}` sono nel testo e li sostituisce il frontend.
- **`Offerta`**: `ral`, `variabile`, `giorniRemoto` (0-5), `ferie` sono interi o `null`; `scadenza` è una `LocalDate` o `null`; `voto` da 1 a 5 o `null`; `benefit` e `note` sono stringhe. Il frontend impedisce due offerte per la stessa candidatura: sarebbe bene un vincolo di unicità su `idCandidatura`.
- **`Account.obiettivoSettimanale`**: valori da 1 a 100, predefinito 10. **`sogliaAttesaGiorni`**: da 1 a 180, predefinito 14.

## 4. Vincoli del modello attuale che pesano sull'interfaccia

- **`CANDIDATURE.ID_CITTA` è obbligatoria.** Per il lavoro da remoto la città non ha senso: oggi il modulo chiede la sede dell'azienda. Se la colonna diventasse facoltativa, basterebbe togliere un validatore.
- **`JOB_OFFERT` è `NOT NULL` e `@NotBlank`.** Nell'aggiunta rapida l'annuncio è facoltativo: oggi il frontend manda il testo segnaposto `(non indicato)` e in lettura lo ritrasforma in vuoto. Meglio accettare `null` o stringa vuota, e poi togliere il segnaposto da `adattatore.ts`.
- **`PATCH /api/candidatura/{id}/stato`** esiste già, ma il brief prevede `PUT` con l'oggetto intero e così è fatto il frontend. Va bene qualunque delle due, purché il backend scriva lo storico.

## 5. Proposte, non bloccanti

- **Storico in blocco.** Andamento, Aziende e Materiali hanno bisogno dello storico di tutte le candidature e oggi il frontend fa una richiesta per candidatura (al massimo sei in parallelo, ogni candidatura si carica una volta sola per sessione). Con qualche centinaio di candidature è tollerabile, ma `GET /api/candidatura/storico` che restituisce `{ idCandidatura, stato, dataEvento, nota }[]` per tutte le candidature dimezzerebbe i tempi di apertura di Andamento.
- **Nota sul cambio di stato.** Un campo facoltativo `notaStato` nel `PUT` della candidatura permetterebbe di riempire `StoricoEvento.nota` (oggi il mock la riempie solo nei dati di prova).
- **Modello della checklist di preparazione.** Il brief parla di «modello modificabile» ma non c'è un endpoint: per ora sta nel browser (`localStorage`, chiave `candidate.checklist-modello`). Proposta: `GET/PUT /api/account/me/modello-checklist` con `string[]`, oppure un campo nell'account.
- **Esportazione dati.** Oggi il file JSON si compone nel browser con le stesse chiamate. Se i dati crescono, un `GET /api/account/me/esportazione` lato server sarebbe più rapido.
- **Ricerca città.** `GET /api/citta` restituisce tutte le città e il frontend filtra. Se l'elenco diventasse molto lungo servirebbe `?q=`.
- **Tipi generati.** `src/app/core/backend/api.generated.ts` viene da `/v3/api-docs` (`npm run api:tipi`, backend acceso). I record Java non hanno `@NotNull` sui campi: nella specifica risultano tutti opzionali, per esempio in `AuthResponseDTO`. Annotarli con `@Schema(requiredMode = REQUIRED)` renderebbe i tipi generati precisi.
- **CORS e proxy.** In sviluppo `ng serve` inoltra `/api` a `http://localhost:8080` (`proxy.conf.json`): il browser non vede mai un'origine diversa. Aprire l'app da `http://127.0.0.1:4200` invece di `localhost` farebbe rispondere `403` al CORS di Spring, che ammette solo `http://localhost:4200`. In produzione `/api` deve stare sullo stesso dominio dell'app (reverse proxy).
- **Cancellazione delle città.** `DELETE /api/citta/delete/{id}` risponde `409` se la città è in uso, ma non c'è modo di sapere dal frontend quali città non lo sono: la prova end-to-end col backend vero deve ripulirsi da sola.
- **Scadenza del token.** `scadenza` è letta ma non usata: il frontend non rinnova il token e aspetta il `401`.

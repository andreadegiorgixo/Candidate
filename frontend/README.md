# Candidate, frontend

Web app personale in italiano per seguire la propria ricerca di lavoro. Angular 22 (componenti standalone, signals, nuovo control flow), Angular Material 22 solo per i controlli di form e gli overlay, SCSS con variabili CSS, Apache ECharts 6 per i grafici.

La fonte di verità è `../docs/frontend-brief.md`; il riferimento visivo della pagina Oggi è `../docs/mockup-oggi.html`.

## Requisiti

**Node 24 o 26.** La versione 25 non è supportata da Angular CLI. Con Homebrew, per esempio:

```bash
export PATH=/opt/homebrew/opt/node@24/bin:$PATH
node --version   # v24.x
```

## Comandi

```bash
npm install
npm start            # http://localhost:4200, parla con il backend su http://localhost:8080
npm run start:mock   # http://localhost:4201, senza backend: risponde il mock
npm run build        # build di produzione in dist/ (senza mock)
npm test             # test unitari (Vitest) senza watch: npx ng test --watch=false
npm run e2e          # test end-to-end contro il mock (avvia da solo ng serve sulla 4201)
npm run api:tipi     # rigenera src/app/core/backend/api.generated.ts da /v3/api-docs (backend acceso)
```

I test end-to-end usano il Chromium di Playwright. Se la build che Playwright si aspetta non è installata, si può indicare un eseguibile già presente:

```bash
PW_CHROMIUM=/percorso/di/chrome-headless-shell npm run e2e
```

Gli screenshot di fine fase si generano con:

```bash
FASE=1 npx playwright test e2e/screens.spec.ts   # docs/screens/fase-1/, a 1440px e 390px
```

## Backend reale

`npm start` inoltra `/api` a `http://localhost:8080` (`proxy.conf.json`), quindi servono il backend acceso (`./mvnw spring-boot:run` da `backend/`) e il database. Accesso, account, candidature e città vengono salvati nel database.

Il backend non ha ancora colloqui, contatti, promemoria, CV, modelli, offerte e storico degli stati, né alcuni campi delle candidature (fonte, spontanea, prossima azione, CV usato). Il frontend li tiene nel `localStorage` del browser, separati per account: **si perdono cambiando browser o svuotando i dati del sito**. L'elenco completo e cosa chiedere al backend sta in `BACKEND_REQUESTS.md`; il codice che fa questa traduzione è in `src/app/core/backend/`.

Prova end-to-end con il backend vero (crea un account di prova e lo cancella a fine test):

```bash
npx playwright test --project=backend-reale   # con backend su :8080 e `npm start` su :4200 già avviati
```

Se Vite mostra errori strani dopo aver cambiato `angular.json` o `proxy.conf.json` (per esempio `firstCreatePass`), ferma il server, cancella `.angular/cache` e riavvia.

## Mock

Con `npm run start:mock` (configurazione `mock`, `src/environments/environment.mock.ts`) un interceptor HTTP risponde al posto del backend. `environment.ts` (produzione) e `environment.development.ts` non lo includono: il codice del mock non entra nel bundle.

- Utente demo: `demo@candidate.it` con password `demo1234`. Ha circa 60 candidature su 8 mesi con storico coerente, 10 colloqui, 2 offerte aperte e 3 versioni del CV. I dati sono generati con un seme fisso, con date relative a oggi.
- Un account registrato dall'interfaccia parte vuoto.
- I dati stanno in memoria: si azzerano a ogni ricarica della pagina.
- Per provare gli stati di errore e di caricamento, dalla console del browser:

```js
sessionStorage.setItem('candidate.mock.errore', '1')    // ogni GET risponde 500
sessionStorage.setItem('candidate.mock.lento', '4000')  // ogni risposta arriva dopo 4 secondi
sessionStorage.removeItem('candidate.mock.errore')      // per tornare alla normalità
```

## Struttura

```text
src/app/
  core/       API, backend (adattatore e archivio locale), mock, autenticazione, archivi dei dati, date, mappa degli stati, calcoli puri
  layout/     shell con barra laterale e ricerca globale
  shared/     linea (piccola, grande, cronologia), etichetta di stato, grafico, tabella, dialoghi
  features/   oggi, candidature, andamento, colloqui, aziende, materiali, offerte, profilo, auth
```

Le feature non si importano tra loro. I calcoli (coda di Oggi, Andamento, filtri, confronto offerte, ricerca) sono funzioni pure in file `*.logic.ts` o in `core/`, con test accanto.

La pagina `/stile` mostra tutti i componenti condivisi nei loro stati. Esiste solo in sviluppo.

## Scorciatoie

`N` aggiunge una candidatura. `Cmd+K` (o `Ctrl+K`) apre la ricerca globale.

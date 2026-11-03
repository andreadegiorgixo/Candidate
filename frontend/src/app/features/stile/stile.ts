import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { StatoCandidatura, StoricoEvento } from '../../core/api/models';
import { aggiungiGiorni, oggiISO } from '../../core/date';
import { Notifier } from '../../core/notifier';
import { TUTTI_GLI_STATI } from '../../core/stati';
import { chiediConferma } from '../../shared/dialoghi/conferma-dialog';
import { Grafico } from '../../shared/grafico/grafico';
import { CATEGORIE, COLORE_ALTRE, FONT, GRIGLIA, TESTO, TESTO_2 } from '../../shared/grafico/palette';
import { Icona, NomeIcona } from '../../shared/icona/icona';
import { LineaBanda } from '../../shared/percorso/linea-banda';
import { Percorso } from '../../shared/percorso/percorso';
import { StatoTag } from '../../shared/stato-tag/stato-tag';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { TabellaDati, TabellaModello } from '../../shared/tabella-dati/tabella-dati';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { Testata } from '../../shared/testata/testata';

interface Esempio {
  titolo: string;
  stato: StatoCandidatura;
  storico: StoricoEvento[];
}

const OGGI = oggiISO();
const g = (n: number) => aggiungiGiorni(OGGI, -n);
const ev = (stato: StatoCandidatura, giorni: number, nota: string | null = null): StoricoEvento => ({ stato, dataEvento: g(giorni), nota });

const ESEMPI: Esempio[] = [
  { titolo: 'In attesa', stato: 'IN_FASE_DI_ATTESA', storico: [ev('IN_FASE_DI_ATTESA', 6)] },
  { titolo: 'Tecnico 1', stato: 'FASE_DI_COLLOQUIO_TECNICO_1', storico: [ev('IN_FASE_DI_ATTESA', 24), ev('FASE_DI_COLLOQUIO_CONOSCITIVO', 15), ev('FASE_DI_COLLOQUIO_TECNICO_1', 5)] },
  { titolo: 'Proposta in valutazione', stato: 'PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE', storico: [ev('IN_FASE_DI_ATTESA', 41), ev('FASE_DI_COLLOQUIO_CONOSCITIVO', 33), ev('FASE_DI_COLLOQUIO_TECNICO_1', 25), ev('FASE_DI_COLLOQUIO_TECNICO_2', 15), ev('PROPOSTA_LAVORATIVA_RICEVUTA', 7), ev('PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE', 3)] },
  { titolo: 'Assunzione completata', stato: 'ASSUNZIONE_COMPLETATA', storico: [ev('IN_FASE_DI_ATTESA', 60), ev('FASE_DI_COLLOQUIO_CONOSCITIVO', 50), ev('FASE_DI_COLLOQUIO_TECNICO_1', 40), ev('FASE_DI_COLLOQUIO_TECNICO_2', 30), ev('PROPOSTA_LAVORATIVA_RICEVUTA', 20), ev('ASSUNZIONE_COMPLETATA', 2)] },
  { titolo: 'Rifiutata dall’azienda', stato: 'RIFIUTATO_DA_RECRUITER', storico: [ev('IN_FASE_DI_ATTESA', 40), ev('FASE_DI_COLLOQUIO_CONOSCITIVO', 30), ev('FASE_DI_COLLOQUIO_TECNICO_1', 20), ev('RIFIUTATO_DA_RECRUITER', 12, 'L’azienda ha scelto un altro profilo.')] },
  { titolo: 'Ritirata da te', stato: 'RIFIUTATO_DAL_CANDIDATO', storico: [ev('IN_FASE_DI_ATTESA', 40), ev('FASE_DI_COLLOQUIO_CONOSCITIVO', 30), ev('RIFIUTATO_DAL_CANDIDATO', 22)] },
  { titolo: 'Proposta rifiutata', stato: 'PROPOSTA_LAVORATIVA_RIFIUTATA', storico: [ev('IN_FASE_DI_ATTESA', 90), ev('FASE_DI_COLLOQUIO_CONOSCITIVO', 80), ev('FASE_DI_COLLOQUIO_TECNICO_1', 70), ev('FASE_DI_COLLOQUIO_TECNICO_2', 60), ev('PROPOSTA_LAVORATIVA_RICEVUTA', 50), ev('PROPOSTA_LAVORATIVA_RIFIUTATA', 44, 'RAL sotto le aspettative.')] },
  { titolo: 'Senza risposta', stato: 'GHOSTING_O_SENZA_RISPOSTA', storico: [ev('IN_FASE_DI_ATTESA', 80), ev('GHOSTING_O_SENZA_RISPOSTA', 50)] },
];

const SWATCH: { nome: string; valore: string; uso: string; chiaro?: boolean }[] = [
  { nome: '--bosco', valore: '#092D0B', uso: 'Testo, barra laterale, pulsante primario' },
  { nome: '--bosco-2', valore: '#173814', uso: 'Hover sul fondo scuro' },
  { nome: '--lime', valore: '#CBF949', uso: 'Voce attiva, testo del pulsante primario, linea su scuro', chiaro: true },
  { nome: '--avorio', valore: '#F9F9EF', uso: 'Sfondo pagina', chiaro: true },
  { nome: '--sabbia', valore: '#EBEBDD', uso: 'Divisori, fondi tenui', chiaro: true },
  { nome: '--bordo', valore: '#DEDFCF', uso: 'Bordi', chiaro: true },
  { nome: '--testo-2', valore: '#565E50', uso: 'Testo secondario' },
  { nome: '--verde-testo', valore: '#3F6F20', uso: 'Link e focus su fondo chiaro' },
];

/** Pagina di sviluppo: tutti i componenti condivisi, nei loro stati. Non esiste in produzione. */
@Component({
  selector: 'app-stile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatMenuModule, MatDatepickerModule, MatAutocompleteModule,
    Icona, LineaBanda, Percorso, StatoTag, StatoVuoto, TabellaDati, Grafico, Scheletro, ErroreCaricamento, Testata,
  ],
  templateUrl: './stile.html',
  styleUrl: './stile.scss',
})
export class Stile {
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);

  protected readonly esempi = ESEMPI;
  protected readonly stati = TUTTI_GLI_STATI;
  protected readonly swatch = SWATCH;
  protected readonly icone: NomeIcona[] = ['oggi', 'candidature', 'andamento', 'colloqui', 'aziende', 'materiali', 'offerte', 'profilo', 'piu', 'cerca', 'chiudi', 'modifica', 'elimina', 'altro', 'link', 'copia', 'spunta', 'calendario', 'esporta', 'elenco', 'bacheca', 'luogo', 'persona', 'orologio', 'esci', 'avviso', 'trascina'];

  protected readonly conteggi = [13, 4, 2, 2, 1, 0];
  protected readonly uscite = { rifiutate: 11, ritirate: 2, propostaRifiutata: 1, senzaRisposta: 9 };

  protected readonly testo = new FormControl('', { nonNullable: true });
  protected readonly scelta = new FormControl('REMOTO', { nonNullable: true });
  protected readonly data = new FormControl<Date | null>(null);
  protected readonly citta = new FormControl('Mil', { nonNullable: true });
  protected readonly opzioniCitta = ['Milano', 'Roma', 'Torino', 'Bologna'];

  protected readonly tabella: TabellaModello = {
    colonne: [{ titolo: 'Modalità' }, { titolo: 'Candidature', numerica: true }, { titolo: 'Con risposta', numerica: true }],
    righe: [['Da remoto', 24, 10], ['Ibrido', 18, 7], ['In sede', 18, 4]],
  };

  protected readonly caricato = signal(true);

  protected readonly opzioniGrafico = computed(() => ({
    textStyle: { fontFamily: FONT, color: TESTO },
    grid: { left: 90, right: 56, top: 8, bottom: 8 },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => `${v}%` },
    xAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: GRIGLIA } }, axisLabel: { color: TESTO_2, formatter: '{value}%' } },
    yAxis: { type: 'category', inverse: true, data: ['Da remoto', 'Ibrido', 'In sede'], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: TESTO } },
    series: [
      {
        type: 'bar',
        barWidth: 12,
        data: [
          { value: 42, itemStyle: { color: CATEGORIE[0], borderRadius: 4 } },
          { value: 39, itemStyle: { color: CATEGORIE[1], borderRadius: 4 } },
          { value: 22, itemStyle: { color: COLORE_ALTRE, borderRadius: 4 } },
        ],
        label: { show: true, position: 'right', formatter: '{c}%', color: TESTO },
      },
    ],
  }));

  protected async conferma(): Promise<void> {
    const ok = await chiediConferma(this.dialog, {
      titolo: 'Eliminare questa candidatura?',
      testo: 'Perdi anche lo storico e i colloqui collegati. Non si può annullare.',
      conferma: 'Elimina candidatura',
      pericolo: true,
    });
    this.notifier.info(ok ? 'Candidatura eliminata' : 'Non è cambiato niente');
  }

  protected snackbarAnnulla(): void {
    this.notifier.conAzione('Spostata in Tecnico 1', 'Annulla', () => this.notifier.info('Spostamento annullato'));
  }

  protected snackbarErrore(): void {
    this.notifier.errore(new Error('x'), () => this.notifier.info('Riprovo'));
  }
}

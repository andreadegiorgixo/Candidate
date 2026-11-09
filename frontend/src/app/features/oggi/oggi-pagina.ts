import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { Candidatura } from '../../core/api/models';
import { Auth } from '../../core/auth/auth.service';
import { costruisciDaFare, VoceDaFare } from '../../core/da-fare';
import { CandidatureStore, ColloquiStore, OfferteStore } from '../../core/data/archivi';
import { formatoLungo, giornoDelMese, maiuscolaIniziale, meseBreve, soloData, soloOra, descriviData } from '../../core/date';
import { Notifier } from '../../core/notifier';
import { Orologio } from '../../core/orologio';
import { INFO_STATO, TIPO_COLLOQUIO_ETICHETTA } from '../../core/stati';
import { NuovaCandidatura } from '../../shared/aggiungi-candidatura/pannello-candidatura';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { apriMessaggio } from '../../shared/dialoghi/messaggio-dialog';
import { LineaBanda } from '../../shared/percorso/linea-banda';
import { Percorso } from '../../shared/percorso/percorso';
import { StatoTag } from '../../shared/stato-tag/stato-tag';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { Testata } from '../../shared/testata/testata';
import { RitmoCostanza } from './ritmo-costanza';
import { contaInCorso, contaPerFermata, invioSettimana, prossimiColloqui, riepilogoAndamento, riepilogoUscite, titoloOggi } from './oggi.logic';

/** Oggi: «cosa faccio adesso?». Le cose da fare (solo se ce ne sono), la linea, l’andamento in breve, i prossimi colloqui, la settimana, e in fondo ritmo e costanza degli invii. */
@Component({
  selector: 'app-oggi-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LineaBanda, Percorso, StatoTag, StatoVuoto, Scheletro, ErroreCaricamento, Testata, RitmoCostanza],
  templateUrl: './oggi-pagina.html',
  styleUrl: './oggi-pagina.scss',
})
export class OggiPagina {
  private readonly candidature = inject(CandidatureStore);
  private readonly colloqui = inject(ColloquiStore);
  private readonly offerte = inject(OfferteStore);
  private readonly auth = inject(Auth);
  private readonly orologio = inject(Orologio);
  private readonly notifier = inject(Notifier);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly nuova = inject(NuovaCandidatura);

  protected readonly tipoColloquio = TIPO_COLLOQUIO_ETICHETTA;

  protected readonly stato = computed(() => {
    const stati = [this.candidature.stato(), this.colloqui.stato(), this.offerte.stato()];
    if (stati.includes('errore')) return 'errore';
    return stati.every((s) => s === 'pronto') ? 'pronto' : 'caricamento';
  });
  protected readonly errore = computed(() => this.candidature.errore() ?? this.colloqui.errore() ?? this.offerte.errore());

  protected readonly tutte = this.candidature.elementi;
  protected readonly oggi = this.orologio.oggi;

  protected readonly daFare = computed(() =>
    costruisciDaFare({
      candidature: this.candidature.elementi(),
      colloqui: this.colloqui.elementi(),
      offerte: this.offerte.elementi(),
      oggi: this.orologio.oggi(),
      adesso: this.orologio.adesso(),
      sogliaAttesa: this.auth.sogliaAttesa(),
    }),
  );

  protected readonly titolo = computed(() => titoloOggi(this.daFare().length));
  protected readonly data = computed(() => maiuscolaIniziale(formatoLungo(this.orologio.oggi())));
  protected readonly conteggi = computed(() => contaPerFermata(this.candidature.elementi()));
  protected readonly inCorso = computed(() => contaInCorso(this.candidature.elementi()));
  protected readonly uscite = computed(() => riepilogoUscite(this.candidature.elementi()));
  protected readonly titoloLinea = computed(() => {
    const n = this.inCorso();
    return n === 1 ? 'Dove si trova la candidatura ancora in corso' : `Dove si trovano le ${n} candidature ancora in corso`;
  });
  protected readonly settimana = computed(() => invioSettimana(this.candidature.elementi(), this.orologio.oggi(), this.auth.obiettivoSettimanale()));
  protected readonly prossimi = computed(() => prossimiColloqui(this.colloqui.elementi(), this.orologio.adesso(), 3));
  protected readonly riquadri = computed(() => {
    const r = riepilogoAndamento({
      candidature: this.candidature.elementi(),
      colloqui: this.colloqui.elementi(),
      oggi: this.orologio.oggi(),
      adesso: this.orologio.adesso(),
      sogliaAttesa: this.auth.sogliaAttesa(),
    });
    return [r.inviate, r.risposte, r.colloqui];
  });
  protected readonly tacche = Array.from({ length: 10 }, (_, i) => i);

  constructor() {
    this.candidature.carica();
    this.colloqui.carica();
    this.offerte.carica();
  }

  protected ricarica(): void {
    this.candidature.carica(true);
    this.colloqui.carica(true);
    this.offerte.carica(true);
  }

  protected candidatura(v: VoceDaFare): Candidatura {
    return this.candidature.trova(v.idCandidatura)!;
  }

  protected aggiungi(): void {
    this.nuova.apri().subscribe();
  }

  protected giorno = giornoDelMese;
  protected mese = (d: string) => meseBreve(soloData(d));

  protected dettaglioColloquio(c: { tipo: keyof typeof TIPO_COLLOQUIO_ETICHETTA; dataOra: string; luogoOLink: string }): string {
    const luogo = /^https?:/.test(c.luogoOLink) ? 'online' : c.luogoOLink ? `a ${c.luogoOLink.split(',').pop()!.trim()}` : '';
    return `${TIPO_COLLOQUIO_ETICHETTA[c.tipo]}, ore ${soloOra(c.dataOra)}${luogo ? ' ' + luogo : ''}`;
  }

  protected quando(d: string): string {
    return descriviData(soloData(d), this.orologio.oggi());
  }

  protected nomeAzienda(id: number): string {
    return this.candidature.trova(id)?.nomeAzienda ?? '';
  }

  protected segnaFatta(v: VoceDaFare): void {
    const c = this.candidatura(v);
    const input = { ...CandidatureStore.comeInput(c), prossimaAzioneTesto: null, prossimaAzioneData: null };
    this.candidature.aggiorna(c.id, input).subscribe({
      next: () =>
        this.notifier.conAzione('Fatto, lo tolgo dall’elenco', 'Annulla', () =>
          this.candidature.aggiorna(c.id, CandidatureStore.comeInput(c)).subscribe(),
        ),
      error: (e: unknown) => this.notifier.errore(e, () => this.segnaFatta(v)),
    });
  }

  protected segnaSenzaRisposta(v: VoceDaFare): void {
    const c = this.candidatura(v);
    this.candidature.cambiaStato(c, 'GHOSTING_O_SENZA_RISPOSTA').subscribe({
      next: () =>
        this.notifier.conAzione(`${c.nomeAzienda} segnata come senza risposta`, 'Annulla', () =>
          this.candidature.cambiaStato(this.candidature.trova(c.id) ?? c, c.statoCandidatura).subscribe(),
        ),
      error: (e: unknown) => this.notifier.errore(e, () => this.segnaSenzaRisposta(v)),
    });
  }

  protected scriviSollecito(v: VoceDaFare): void {
    apriMessaggio(this.dialog, { candidatura: this.candidatura(v), tipo: 'SOLLECITO' });
  }

  protected apriPreparazione(v: VoceDaFare): void {
    void this.router.navigate(['/colloqui'], { queryParams: { apri: v.idCollegato } });
  }

  protected readonly info = INFO_STATO;
}

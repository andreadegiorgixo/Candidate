import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { Candidatura, Colloquio, Contatto } from '../../core/api/models';
import { normalizzaAzienda } from '../../core/azienda';
import { CandidatureStore, ColloquiStore, ContattiStore, CvStore, StoricoStore } from '../../core/data/archivi';
import { descriviData, formatoBreve, formatoLungo, formatISO, minutiTra, soloData, soloOra } from '../../core/date';
import { erroriCampo } from '../../core/errori';
import { Notifier } from '../../core/notifier';
import { Orologio } from '../../core/orologio';
import { eInCorso, TIPO_COLLOQUIO_ETICHETTA } from '../../core/stati';
import { CampiCandidatura } from '../../shared/candidatura-campi/campi-candidatura';
import { creaFormCandidatura, FormCandidatura, leggiInput } from '../../shared/candidatura-campi/form-candidatura';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { apriColloquio } from '../../shared/dialoghi/colloquio-dialog';
import { chiediConferma } from '../../shared/dialoghi/conferma-dialog';
import { apriContatto } from '../../shared/dialoghi/contatto-dialog';
import { apriMessaggio } from '../../shared/dialoghi/messaggio-dialog';
import { Icona } from '../../shared/icona/icona';
import { Percorso } from '../../shared/percorso/percorso';
import { StatoTag } from '../../shared/stato-tag/stato-tag';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';

/** Dettaglio di una candidatura: linea datata, tutti i campi modificabili, colloqui, contatti e prossima azione. */
@Component({
  selector: 'app-candidatura-dettaglio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CampiCandidatura, Percorso, StatoTag, StatoVuoto, Scheletro, ErroreCaricamento, Icona],
  templateUrl: './candidatura-dettaglio.html',
  styleUrl: './candidatura-dettaglio.scss',
})
export class CandidaturaDettaglio {
  /** Parametro di rotta `:id`. */
  readonly id = input.required<string>();

  protected readonly store = inject(CandidatureStore);
  private readonly storicoStore = inject(StoricoStore);
  private readonly colloquiStore = inject(ColloquiStore);
  private readonly contattiStore = inject(ContattiStore);
  private readonly cvStore = inject(CvStore);
  private readonly notifier = inject(Notifier);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly orologio = inject(Orologio);

  protected readonly etichettaTipo = TIPO_COLLOQUIO_ETICHETTA;
  protected readonly salvataggio = signal(false);
  protected readonly form = signal<FormCandidatura | null>(null);
  protected readonly modificato = signal(false);

  protected readonly candidatura = computed<Candidatura | undefined>(() => this.store.elementi().find((c) => c.id === Number(this.id())));
  protected readonly storico = computed(() => this.storicoStore.perId().get(Number(this.id())));
  protected readonly inCorso = computed(() => !!this.candidatura() && eInCorso(this.candidatura()!.statoCandidatura));

  protected readonly colloqui = computed(() =>
    this.colloquiStore
      .elementi()
      .filter((c) => c.idCandidatura === Number(this.id()))
      .sort((a, b) => b.dataOra.localeCompare(a.dataOra)),
  );

  protected readonly contatti = computed(() => {
    const c = this.candidatura();
    return c ? this.contattiStore.elementi().filter((x) => normalizzaAzienda(x.nomeAzienda) === normalizzaAzienda(c.nomeAzienda)) : [];
  });

  protected readonly nomeCv = computed(() => this.cvStore.elementi().find((v) => v.id === this.candidatura()?.idCv)?.nome ?? null);

  protected readonly urlAnnuncio = computed(() => {
    const j = this.candidatura()?.jobOffert.trim() ?? '';
    return /^https?:\/\/\S+$/.test(j) ? j : null;
  });

  constructor() {
    this.store.carica();
    this.colloquiStore.carica();
    this.contattiStore.carica();
    this.cvStore.carica();
    // La linea datata ha bisogno dello storico.
    effect(() => {
      const id = Number(this.id());
      untracked(() => this.storicoStore.assicuraEIscriviti([id]));
    });
    // Il modulo si crea quando la candidatura arriva, e si rifà solo se cambia candidatura.
    effect(() => {
      const c = this.candidatura();
      untracked(() => {
        if (!c) return this.form.set(null);
        if (this.form() && this.idForm === c.id) return;
        this.idForm = c.id;
        this.nuovoForm(c);
      });
    });
  }

  private idForm: number | null = null;

  private nuovoForm(c: Candidatura): void {
    const f = creaFormCandidatura(c, this.orologio.oggi());
    this.modificato.set(false);
    f.valueChanges.subscribe(() => this.modificato.set(f.dirty));
    this.form.set(f);
  }

  protected annulla(): void {
    const c = this.candidatura();
    if (c) this.nuovoForm(c);
  }

  protected salva(): void {
    const f = this.form();
    const c = this.candidatura();
    if (!f || !c) return;
    if (f.invalid) {
      f.markAllAsTouched();
      return;
    }
    this.salvataggio.set(true);
    this.store.aggiorna(c.id, leggiInput(f)).subscribe({
      next: (n) => {
        this.salvataggio.set(false);
        this.notifier.info('Modifiche salvate');
        this.nuovoForm(n);
      },
      error: (e: unknown) => {
        this.salvataggio.set(false);
        const campi = erroriCampo(e);
        if (campi) for (const [k, m] of Object.entries(campi)) f.get(k)?.setErrors({ server: m });
        this.notifier.errore(e, () => this.salva());
      },
    });
  }

  protected async elimina(): Promise<void> {
    const c = this.candidatura();
    if (!c) return;
    const ok = await chiediConferma(this.dialog, {
      titolo: `Eliminare la candidatura per ${c.nomeAzienda}?`,
      testo: 'Perdi anche lo storico dei cambi di stato. Non si può annullare.',
      conferma: 'Elimina candidatura',
      pericolo: true,
    });
    if (!ok) return;
    this.store.elimina(c.id).subscribe({
      next: () => {
        this.notifier.info(`Candidatura per ${c.nomeAzienda} eliminata`);
        void this.router.navigate(['/candidature']);
      },
      error: (e: unknown) => this.notifier.errore(e, () => void this.elimina()),
    });
  }

  protected scrivi(): void {
    const c = this.candidatura();
    if (c) apriMessaggio(this.dialog, { candidatura: c, tipo: c.spontanea ? 'SPONTANEA' : 'SOLLECITO' });
  }

  protected segnaFatta(): void {
    const c = this.candidatura();
    if (!c) return;
    const input = { ...CandidatureStore.comeInput(c), prossimaAzioneTesto: null, prossimaAzioneData: null };
    this.store.aggiorna(c.id, input).subscribe({
      next: () => {
        this.nuovoForm({ ...c, prossimaAzioneTesto: null, prossimaAzioneData: null });
        this.notifier.conAzione('Prossima azione completata', 'Annulla', () =>
          this.store.aggiorna(c.id, CandidatureStore.comeInput(c)).subscribe({ next: (r) => this.nuovoForm(r) }),
        );
      },
      error: (e: unknown) => this.notifier.errore(e, () => this.segnaFatta()),
    });
  }

  protected async nuovoColloquio(): Promise<void> {
    await apriColloquio(this.dialog, { idCandidatura: Number(this.id()) });
  }

  protected async modificaColloquio(c: Colloquio, modo: 'dettagli' | 'resoconto' = 'dettagli'): Promise<void> {
    await apriColloquio(this.dialog, { colloquio: c, modo });
  }

  protected async nuovoContatto(): Promise<void> {
    const c = this.candidatura();
    if (c) await apriContatto(this.dialog, { nomeAzienda: c.nomeAzienda });
  }

  protected async modificaContatto(c: Contatto): Promise<void> {
    await apriContatto(this.dialog, { contatto: c });
  }

  protected async togliContatto(c: Contatto): Promise<void> {
    const ok = await chiediConferma(this.dialog, {
      titolo: `Togliere ${c.nome}?`,
      testo: 'Il contatto sparisce dall’azienda e da tutte le sue candidature.',
      conferma: 'Togli contatto',
      pericolo: true,
    });
    if (ok) this.contattiStore.elimina(c.id).subscribe({ error: (e: unknown) => this.notifier.errore(e) });
  }

  protected futuro(c: Colloquio): boolean {
    return minutiTra(this.orologio.adesso(), c.dataOra) >= 0;
  }

  protected quando(c: Colloquio): string {
    const oggi = this.orologio.oggi();
    const g = soloData(c.dataOra);
    const quando = ['oggi', 'domani', 'ieri'].includes(descriviData(g, oggi)) ? descriviData(g, oggi) : formatoBreve(g);
    return `${quando} alle ${soloOra(c.dataOra)}`;
  }

  protected dataAzione(): string {
    const d = this.candidatura()?.prossimaAzioneData;
    return d ? descriviData(d, this.orologio.oggi()) : '';
  }

  protected readonly formatoLungo = formatoLungo;
  protected readonly formatISO = formatISO;
}

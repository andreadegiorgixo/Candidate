import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Api } from '../../core/api/api.service';
import { Cv, Modello } from '../../core/api/models';
import { Auth } from '../../core/auth/auth.service';
import { dimensioneLeggibile } from '../../core/cv-file';
import { formatISO, formatoCompleto } from '../../core/date';
import { erroriCampo } from '../../core/errori';
import { LINKEDIN_MESSAGGIO, LINKEDIN_PATTERN } from '../../core/linkedin';
import { scaricaFile } from '../../core/scarica-file';
import { CandidatureStore, CvStore, ModelliStore, StoricoStore } from '../../core/data/archivi';
import { Notifier } from '../../core/notifier';
import { calcolaTasso, percentuale } from '../../core/risposte';
import { TIPI_MODELLO, TIPO_MODELLO_ETICHETTA } from '../../core/stati';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { chiediConferma } from '../../shared/dialoghi/conferma-dialog';
import { Icona } from '../../shared/icona/icona';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { Testata } from '../../shared/testata/testata';
import { apriCv } from './cv-dialog';
import { apriModello } from './modello-dialog';

/** Materiali: «quale CV funziona?». Profilo LinkedIn, versioni del CV (file) con tasso di risposta e modelli di messaggio. */
@Component({
  selector: 'app-materiali-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, Icona, StatoVuoto, Scheletro, ErroreCaricamento, Testata],
  templateUrl: './materiali-pagina.html',
  styleUrl: './materiali-pagina.scss',
})
export class MaterialiPagina {
  protected readonly auth = inject(Auth);
  private readonly api = inject(Api);
  private readonly cvStore = inject(CvStore);
  private readonly modelliStore = inject(ModelliStore);
  private readonly candidature = inject(CandidatureStore);
  private readonly storico = inject(StoricoStore);
  private readonly notifier = inject(Notifier);
  private readonly dialog = inject(MatDialog);

  protected readonly tipoEtichetta = TIPO_MODELLO_ETICHETTA;
  protected readonly percentuale = percentuale;
  protected readonly dimensione = dimensioneLeggibile;
  protected readonly linkedinMessaggio = LINKEDIN_MESSAGGIO;

  protected readonly scaricandoId = signal<number | null>(null);
  protected readonly modificaLinkedinAperta = signal(false);
  protected readonly salvandoLinkedin = signal(false);
  protected readonly linkedinForm = new FormGroup({
    linkedin: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255), Validators.pattern(LINKEDIN_PATTERN)] }),
  });

  protected readonly stato = computed(() => {
    const s = [this.cvStore.stato(), this.modelliStore.stato(), this.candidature.stato()];
    if (s.includes('errore')) return 'errore';
    return s.every((x) => x === 'pronto') ? 'pronto' : 'caricamento';
  });
  protected readonly errore = computed(() => this.cvStore.errore() ?? this.modelliStore.errore() ?? this.candidature.errore());

  /** Per ogni CV: quante candidature lo usano e quante hanno avuto risposta. */
  protected readonly cv = computed(() =>
    [...this.cvStore.elementi()]
      .sort((a, b) => a.id - b.id)
      .map((v) => {
        const t = calcolaTasso(this.candidature.elementi().filter((c) => c.idCv === v.id), this.storico.perId());
        return { cv: v, ...t };
      }),
  );

  protected readonly gruppi = computed(() =>
    TIPI_MODELLO.map((tipo) => ({ tipo, modelli: this.modelliStore.elementi().filter((m) => m.tipo === tipo) })).filter((g) => g.modelli.length > 0),
  );

  constructor() {
    this.auth.caricaAccount();
    this.cvStore.carica();
    this.modelliStore.carica();
    this.candidature.carica();
    effect(() => {
      if (this.candidature.stato() !== 'pronto') return;
      const ids = this.candidature.elementi().filter((c) => c.idCv !== null).map((c) => c.id);
      untracked(() => this.storico.assicuraEIscriviti(ids));
    });
  }

  protected ricarica(): void {
    this.cvStore.carica(true);
    this.modelliStore.carica(true);
    this.candidature.carica(true);
  }

  protected nuovoCv(): void {
    void apriCv(this.dialog, null);
  }

  protected modificaCv(v: Cv): void {
    void apriCv(this.dialog, v);
  }

  /** Giorno di caricamento, nel fuso orario di chi guarda. */
  protected dataCaricamento(v: Cv): string {
    return formatoCompleto(formatISO(new Date(v.dataCaricamento)));
  }

  /** Il file si scarica con una richiesta autenticata e poi si salva col suo nome. */
  protected scarica(v: Cv): void {
    this.scaricandoId.set(v.id);
    this.api.scaricaCv(v.id).subscribe({
      next: (file) => {
        this.scaricandoId.set(null);
        scaricaFile(file, v.nomeFile);
      },
      error: (e: unknown) => {
        this.scaricandoId.set(null);
        this.notifier.errore(e, () => this.scarica(v));
      },
    });
  }

  protected apriLinkedin(attuale: string): void {
    this.linkedinForm.reset({ linkedin: attuale });
    this.modificaLinkedinAperta.set(true);
  }

  protected annullaLinkedin(): void {
    this.modificaLinkedinAperta.set(false);
  }

  protected salvaLinkedin(): void {
    if (this.linkedinForm.invalid) return void this.linkedinForm.markAllAsTouched();
    this.impostaLinkedin(this.linkedinForm.getRawValue().linkedin.trim(), 'Link LinkedIn salvato');
  }

  protected rimuoviLinkedin(): void {
    this.impostaLinkedin('', 'Link LinkedIn rimosso');
  }

  private impostaLinkedin(valore: string, ok: string): void {
    this.salvandoLinkedin.set(true);
    this.auth.impostaLinkedin(valore).subscribe({
      next: () => {
        this.salvandoLinkedin.set(false);
        this.modificaLinkedinAperta.set(false);
        this.notifier.info(ok);
      },
      error: (e: unknown) => {
        this.salvandoLinkedin.set(false);
        const errore = erroriCampo(e)?.['linkedin'];
        if (errore && this.modificaLinkedinAperta()) this.linkedinForm.controls.linkedin.setErrors({ server: errore });
        else this.notifier.errore(e, () => this.impostaLinkedin(valore, ok));
      },
    });
  }

  protected async eliminaCv(v: Cv, usi: number): Promise<void> {
    const ok = await chiediConferma(this.dialog, {
      titolo: `Eliminare «${v.nome}»?`,
      testo: usi ? `Lo usano ${usi} candidature: restano, ma senza una versione del CV indicata. Il file viene cancellato.` : 'Non lo usa nessuna candidatura. Il file viene cancellato.',
      conferma: 'Elimina versione',
      pericolo: true,
    });
    if (!ok) return;
    this.cvStore.elimina(v.id).subscribe({
      next: () => {
        // Le candidature che la usavano restano senza versione, anche in memoria.
        this.candidature.elementi.update((l) => l.map((c) => (c.idCv === v.id ? { ...c, idCv: null } : c)));
        this.notifier.info('Versione eliminata');
      },
      error: (e: unknown) => this.notifier.errore(e, () => void this.eliminaCv(v, usi)),
    });
  }

  protected nuovoModello(): void {
    void apriModello(this.dialog, null);
  }

  protected modificaModello(m: Modello): void {
    void apriModello(this.dialog, m);
  }

  protected async eliminaModello(m: Modello): Promise<void> {
    const ok = await chiediConferma(this.dialog, {
      titolo: `Eliminare «${m.nome}»?`,
      testo: 'Il modello sparisce. Non si può annullare.',
      conferma: 'Elimina modello',
      pericolo: true,
    });
    if (!ok) return;
    this.modelliStore.elimina(m.id).subscribe({
      next: () => this.notifier.info('Modello eliminato'),
      error: (e: unknown) => this.notifier.errore(e, () => void this.eliminaModello(m)),
    });
  }

  protected async copia(m: Modello): Promise<void> {
    try {
      await navigator.clipboard.writeText(m.testo);
      this.notifier.info('Testo copiato');
    } catch {
      this.notifier.errore(new Error('clipboard'));
    }
  }
}

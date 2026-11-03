import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { Colloquio, ColloquioInput, TipoColloquio } from '../../core/api/models';
import { ChecklistModello } from '../../core/checklist-modello';
import { CandidatureStore, ColloquiStore } from '../../core/data/archivi';
import { aggiungiGiorni, componiDataOra, DataISO, formatISO, parseData, soloData, soloOra } from '../../core/date';
import { Notifier } from '../../core/notifier';
import { Orologio } from '../../core/orologio';
import { eInCorso, TIPI_COLLOQUIO, TIPO_COLLOQUIO_ETICHETTA } from '../../core/stati';
import { Icona } from '../icona/icona';

export interface DatiColloquioDialog {
  colloquio?: Colloquio;
  /** Candidatura già nota (dal dettaglio): il campo non si può cambiare. */
  idCandidatura?: number;
  /** `resoconto`: si compila solo il racconto di com'è andata. */
  modo?: 'dettagli' | 'resoconto';
}

/** Un colloquio: data, luogo, persone, checklist di preparazione e resoconto. */
@Component({
  selector: 'app-colloquio-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, Icona],
  templateUrl: './colloquio-dialog.html',
  styleUrl: './colloquio-dialog.scss',
})
export class ColloquioDialog {
  protected readonly dati = inject<DatiColloquioDialog>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ColloquioDialog, Colloquio>>(MatDialogRef);
  private readonly store = inject(ColloquiStore);
  protected readonly candidature = inject(CandidatureStore);
  private readonly notifier = inject(Notifier);
  private readonly modello = inject(ChecklistModello);
  private readonly orologio = inject(Orologio);

  protected readonly tipi = TIPI_COLLOQUIO;
  protected readonly etichetteTipo = TIPO_COLLOQUIO_ETICHETTA;
  protected readonly voti = [1, 2, 3, 4, 5];
  protected readonly salvataggio = signal(false);
  protected readonly soloResoconto = this.dati.modo === 'resoconto';

  private readonly c = this.dati.colloquio;
  protected readonly form = new FormGroup({
    idCandidatura: new FormControl<number | null>(this.c?.idCandidatura ?? this.dati.idCandidatura ?? null, { validators: [Validators.required] }),
    tipo: new FormControl<TipoColloquio>(this.c?.tipo ?? 'CONOSCITIVO', { nonNullable: true }),
    data: new FormControl<Date | null>(parseData(this.c ? soloData(this.c.dataOra) : aggiungiGiorni(this.orologio.oggi(), 1)), { validators: [Validators.required] }),
    ora: new FormControl(this.c ? soloOra(this.c.dataOra) : '10:00', { nonNullable: true, validators: [Validators.required] }),
    luogoOLink: new FormControl(this.c?.luogoOLink ?? '', { nonNullable: true }),
    persone: new FormControl(this.c?.persone ?? '', { nonNullable: true }),
    checklist: new FormArray(
      (this.c?.checklist ?? this.modello.voci().map((testo) => ({ testo, fatto: false }))).map(
        (v) => new FormGroup({ testo: new FormControl(v.testo, { nonNullable: true }), fatto: new FormControl(v.fatto, { nonNullable: true }) }),
      ),
    ),
    voto: new FormControl<number | null>(this.c?.voto ?? null),
    domande: new FormControl((this.c?.domande ?? []).join('\n'), { nonNullable: true }),
    daMigliorare: new FormControl(this.c?.daMigliorare ?? '', { nonNullable: true }),
  });

  /** Il resoconto ha senso solo per i colloqui già avvenuti, o quando lo si sta già scrivendo. */
  protected readonly conResoconto = computed(() => {
    if (this.soloResoconto) return true;
    const d: DataISO | null = this.c ? soloData(this.c.dataOra) : null;
    return !!d && d <= this.orologio.oggi();
  });

  protected readonly candidatureSelezionabili = computed(() =>
    this.candidature
      .elementi()
      .filter((x) => eInCorso(x.statoCandidatura) || x.id === this.form.controls.idCandidatura.value)
      .sort((a, b) => a.nomeAzienda.localeCompare(b.nomeAzienda, 'it')),
  );

  protected readonly candidaturaFissa = computed(() => {
    const id = this.dati.idCandidatura ?? this.c?.idCandidatura;
    return this.candidature.elementi().find((x) => x.id === id) ?? null;
  });

  protected get checklist(): FormArray<FormGroup<{ testo: FormControl<string>; fatto: FormControl<boolean> }>> {
    return this.form.controls.checklist;
  }

  protected aggiungiVoce(): void {
    this.checklist.push(new FormGroup({ testo: new FormControl('', { nonNullable: true }), fatto: new FormControl(false, { nonNullable: true }) }));
  }

  protected togliVoce(i: number): void {
    this.checklist.removeAt(i);
  }

  protected scegliVoto(n: number): void {
    this.form.controls.voto.setValue(this.form.controls.voto.value === n ? null : n);
  }

  protected salva(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: ColloquioInput = {
      idCandidatura: v.idCandidatura!,
      tipo: v.tipo,
      dataOra: componiDataOra(formatISO(v.data!), v.ora),
      luogoOLink: v.luogoOLink.trim(),
      persone: v.persone.trim(),
      checklist: v.checklist.filter((x) => x.testo.trim()).map((x) => ({ testo: x.testo.trim(), fatto: x.fatto })),
      voto: v.voto,
      domande: v.domande.split('\n').map((d) => d.trim()).filter(Boolean),
      daMigliorare: v.daMigliorare.trim() || null,
    };
    this.salvataggio.set(true);
    const op = this.c ? this.store.aggiorna(this.c.id, input) : this.store.crea(input);
    op.subscribe({
      next: (x) => {
        this.notifier.info(this.soloResoconto ? 'Resoconto salvato' : 'Colloquio salvato');
        this.ref.close(x);
      },
      error: (e: unknown) => {
        this.salvataggio.set(false);
        this.notifier.errore(e, () => this.salva());
      },
    });
  }
}

export function apriColloquio(dialog: MatDialog, dati: DatiColloquioDialog): Promise<Colloquio | undefined> {
  return firstValueFrom(
    dialog.open<ColloquioDialog, DatiColloquioDialog, Colloquio>(ColloquioDialog, { data: dati, width: '640px' }).afterClosed(),
  );
}

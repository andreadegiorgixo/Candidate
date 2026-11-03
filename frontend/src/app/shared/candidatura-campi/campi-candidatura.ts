import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { startWith, switchMap } from 'rxjs';
import { Citta } from '../../core/api/models';
import { normalizzaAzienda } from '../../core/azienda';
import { CandidatureStore, CittaStore, CvStore } from '../../core/data/archivi';
import { formatoCompleto } from '../../core/date';
import { dettaglioConflitto, messaggioErrore } from '../../core/errori';
import { FONTE_ETICHETTA, FONTI, MODALITA, MODALITA_ETICHETTA, etichettaStato, TUTTI_GLI_STATI } from '../../core/stati';
import { FormCandidatura } from './form-candidatura';

/** Campi della candidatura, usati dal pannello di aggiunta rapida e dal dettaglio. */
@Component({
  selector: 'app-campi-candidatura',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule, MatDatepickerModule],
  templateUrl: './campi-candidatura.html',
  styleUrl: './campi-candidatura.scss',
})
export class CampiCandidatura {
  readonly form = input.required<FormCandidatura>();
  /** Mostra anche i campi che non sono obbligatori. */
  readonly altri = input(false);
  /** Mostra la scelta dello stato (solo nel dettaglio). */
  readonly conStato = input(false);
  /** Nel dettaglio la candidatura stessa non conta come duplicato. */
  readonly escludiId = input<number | null>(null);

  private readonly citta = inject(CittaStore);
  private readonly candidature = inject(CandidatureStore);
  protected readonly cv = inject(CvStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly modalita = MODALITA;
  protected readonly etichettaModalita = MODALITA_ETICHETTA;
  protected readonly fonti = FONTI;
  protected readonly etichettaFonte = FONTE_ETICHETTA;
  protected readonly stati = TUTTI_GLI_STATI;
  protected readonly etichettaStato = etichettaStato;

  constructor() {
    this.citta.carica();
    this.cv.carica();
  }

  private valoreDi<T>(scelta: (f: FormCandidatura) => FormControl<T>) {
    return toSignal<T | null>(
      toObservable(this.form).pipe(
        switchMap((f) => {
          const c = scelta(f);
          return c.valueChanges.pipe(startWith(c.value));
        }),
      ),
      { initialValue: null },
    );
  }

  private readonly azienda = this.valoreDi((f) => f.controls.nomeAzienda);
  private readonly testoCitta = this.valoreDi((f) => f.controls.citta);
  protected readonly spontanea = this.valoreDi((f) => f.controls.spontanea);

  protected readonly etichettaAnnuncio = computed(() =>
    this.spontanea() ? 'Link o testo del messaggio inviato' : 'Link all’annuncio',
  );

  protected readonly duplicati = computed(() => {
    const chiave = normalizzaAzienda(this.azienda() ?? '');
    if (!chiave) return [];
    return this.candidature
      .elementi()
      .filter((c) => c.id !== this.escludiId() && normalizzaAzienda(c.nomeAzienda) === chiave)
      .sort((a, b) => b.dataCandidatura.localeCompare(a.dataCandidatura))
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        testo: `${c.posizioneLavorativa}, inviata il ${formatoCompleto(c.dataCandidatura)}, stato: ${etichettaStato(c.statoCandidatura)}`,
      }));
  });

  protected readonly testoDigitato = computed(() => {
    const v = this.testoCitta();
    return typeof v === 'string' ? v.trim() : '';
  });

  protected readonly cittaFiltrate = computed(() => {
    const q = normalizzaAzienda(this.testoDigitato());
    const tutte = this.citta.elementi();
    const lista = q ? tutte.filter((c) => normalizzaAzienda(c.nomeCitta).includes(q)) : tutte;
    return [...lista].sort((a, b) => a.nomeCitta.localeCompare(b.nomeCitta, 'it')).slice(0, 8);
  });

  protected readonly puoCreare = computed(() => {
    const q = normalizzaAzienda(this.testoDigitato());
    return !!q && !this.citta.elementi().some((c) => normalizzaAzienda(c.nomeCitta) === q);
  });

  protected mostraCitta = (c: Citta | string | null): string => (c && typeof c === 'object' ? c.nomeCitta : (c ?? ''));

  // Creazione di una città che non esiste ancora.
  protected readonly creaCitta = signal<{ nome: string } | null>(null);
  protected readonly erroreCitta = signal('');
  protected readonly salvandoCitta = signal(false);
  protected readonly formCitta = new FormGroup({
    provincia: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(2)] }),
    regione: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    nazione: new FormControl('Italia', { nonNullable: true, validators: [Validators.required] }),
  });

  protected sceltaCitta(): void {
    this.creaCitta.set(null);
  }

  /** Apre il modulo per creare la città che sta scrivendo l'utente. */
  protected apriNuovaCitta(): void {
    this.creaCitta.set({ nome: this.testoDigitato() });
    this.erroreCitta.set('');
  }

  protected annullaCitta(): void {
    this.creaCitta.set(null);
  }

  protected salvaCitta(): void {
    const nuova = this.creaCitta();
    if (!nuova) return;
    if (this.formCitta.invalid) {
      this.formCitta.markAllAsTouched();
      return;
    }
    this.salvandoCitta.set(true);
    this.erroreCitta.set('');
    const v = this.formCitta.getRawValue();
    this.citta
      .crea({ nomeCitta: nuova.nome, provincia: v.provincia.toUpperCase(), regione: v.regione.trim(), nazione: v.nazione.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.salvandoCitta.set(false);
          this.form().controls.citta.setValue(c);
          this.creaCitta.set(null);
          this.formCitta.reset({ provincia: '', regione: '', nazione: 'Italia' });
        },
        error: (e: unknown) => {
          this.salvandoCitta.set(false);
          this.erroreCitta.set(dettaglioConflitto(e) ? 'Questa città esiste già: sceglila dall’elenco.' : messaggioErrore(e));
        },
      });
  }
}

import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Candidatura, CandidaturaInput, Citta, Fonte, Modalita, StatoCandidatura } from '../../core/api/models';
import { DataISO, formatISO, parseData } from '../../core/date';

/** La città va scelta dall'elenco (o creata): un testo libero non basta. */
export function cittaScelta(c: AbstractControl): ValidationErrors | null {
  const v = c.value as Citta | string | null;
  return v && typeof v === 'object' && v.id ? null : { citta: true };
}

export function creaFormCandidatura(c: Candidatura | null, oggi: DataISO) {
  return new FormGroup({
    nomeAzienda: new FormControl(c?.nomeAzienda ?? '', { nonNullable: true, validators: [Validators.required] }),
    posizioneLavorativa: new FormControl(c?.posizioneLavorativa ?? '', { nonNullable: true, validators: [Validators.required] }),
    modalita: new FormControl<Modalita>(c?.modalita ?? 'REMOTO', { nonNullable: true, validators: [Validators.required] }),
    citta: new FormControl<Citta | string | null>(c?.citta ?? null, { validators: [cittaScelta] }),
    dataCandidatura: new FormControl<Date | null>(parseData(c?.dataCandidatura ?? oggi), { validators: [Validators.required] }),
    statoCandidatura: new FormControl<StatoCandidatura>(c?.statoCandidatura ?? 'IN_FASE_DI_ATTESA', { nonNullable: true }),
    spontanea: new FormControl(c?.spontanea ?? false, { nonNullable: true }),
    fonte: new FormControl<Fonte>(c?.fonte ?? 'LINKEDIN', { nonNullable: true }),
    jobOffert: new FormControl(c?.jobOffert ?? '', { nonNullable: true }),
    note: new FormControl(c?.note ?? '', { nonNullable: true }),
    idCv: new FormControl<number | null>(c?.idCv ?? null),
    prossimaAzioneTesto: new FormControl(c?.prossimaAzioneTesto ?? '', { nonNullable: true }),
    prossimaAzioneData: new FormControl<Date | null>(c?.prossimaAzioneData ? parseData(c.prossimaAzioneData) : null),
  });
}

export type FormCandidatura = ReturnType<typeof creaFormCandidatura>;

/** Dati pronti per l'API: date in `YYYY-MM-DD`, testi vuoti come `null`. */
export function leggiInput(form: FormCandidatura): CandidaturaInput {
  const v = form.getRawValue();
  const testoAzione = v.prossimaAzioneTesto.trim();
  return {
    nomeAzienda: v.nomeAzienda.trim(),
    posizioneLavorativa: v.posizioneLavorativa.trim(),
    modalita: v.modalita,
    citta: v.citta as Citta,
    dataCandidatura: formatISO(v.dataCandidatura!),
    statoCandidatura: v.statoCandidatura,
    spontanea: v.spontanea,
    fonte: v.fonte,
    jobOffert: v.jobOffert.trim(),
    note: v.note.trim() || null,
    idCv: v.idCv,
    prossimaAzioneTesto: testoAzione || null,
    prossimaAzioneData: testoAzione && v.prossimaAzioneData ? formatISO(v.prossimaAzioneData) : null,
  };
}

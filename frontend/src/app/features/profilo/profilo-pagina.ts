import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { Api } from '../../core/api/api.service';
import { Account } from '../../core/api/models';
import { Auth } from '../../core/auth/auth.service';
import { CandidatureStore, StoricoStore } from '../../core/data/archivi';
import { dettaglioConflitto, erroriCampo, messaggioErrore } from '../../core/errori';
import { oggiISO } from '../../core/date';
import { LINKEDIN_MESSAGGIO, LINKEDIN_PATTERN } from '../../core/linkedin';
import { Notifier } from '../../core/notifier';
import { Scheletro } from '../../shared/caricamento/caricamento';
import { Testata } from '../../shared/testata/testata';

/** La conferma deve coincidere con la nuova password: l'errore sta sul campo di conferma. */
function uguale(c: AbstractControl): ValidationErrors | null {
  const nuova = c.parent?.get('nuova')?.value as string | undefined;
  return c.value && nuova !== undefined && c.value !== nuova ? { diverse: true } : null;
}

/** Profilo: dati personali, obiettivi, password, esportazione ed eliminazione dell'account. */
@Component({
  selector: 'app-profilo-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, Scheletro, Testata],
  templateUrl: './profilo-pagina.html',
  styleUrl: './profilo-pagina.scss',
})
export class ProfiloPagina {
  protected readonly auth = inject(Auth);
  private readonly api = inject(Api);
  private readonly notifier = inject(Notifier);
  private readonly candidature = inject(CandidatureStore);
  private readonly storico = inject(StoricoStore);

  protected readonly salvandoDati = signal(false);
  protected readonly salvandoPreferenze = signal(false);
  protected readonly salvandoPassword = signal(false);
  protected readonly esportando = signal(false);
  protected readonly eliminando = signal(false);

  protected readonly dati = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    cognome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    linkedin: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255), Validators.pattern(LINKEDIN_PATTERN)] }),
  });

  protected readonly linkedinMessaggio = LINKEDIN_MESSAGGIO;

  protected readonly preferenze = new FormGroup({
    obiettivoSettimanale: new FormControl(10, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(100)] }),
    sogliaAttesaGiorni: new FormControl(14, { nonNullable: true, validators: [Validators.required, Validators.min(1), Validators.max(180)] }),
  });

  protected readonly password = new FormGroup(
    {
      nuova: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8), Validators.maxLength(72)] }),
      conferma: new FormControl('', { nonNullable: true, validators: [Validators.required, uguale] }),
    },
  );

  protected readonly _riconvalida = this.password.controls.nuova.valueChanges.subscribe(() => this.password.controls.conferma.updateValueAndValidity());

  protected readonly emailConferma = new FormControl('', { nonNullable: true });

  constructor() {
    this.auth.caricaAccount();
    effect(() => {
      const a = this.auth.account();
      if (!a) return;
      untracked(() => {
        this.dati.reset({ nome: a.nome, cognome: a.cognome, email: a.email, linkedin: a.linkedin });
        this.preferenze.reset({ obiettivoSettimanale: a.obiettivoSettimanale, sogliaAttesaGiorni: a.sogliaAttesaGiorni });
      });
    });
  }

  private corrente(): Account {
    return this.auth.account()!;
  }

  private salva(parziale: Partial<Account> & { password?: string }, chiudi: () => void, ok: string, campi?: FormGroup): void {
    const a = this.corrente();
    this.auth
      .aggiornaAccount({
        nome: a.nome,
        cognome: a.cognome,
        email: a.email,
        linkedin: a.linkedin,
        obiettivoSettimanale: a.obiettivoSettimanale,
        sogliaAttesaGiorni: a.sogliaAttesaGiorni,
        ...parziale,
      })
      .subscribe({
        next: () => {
          chiudi();
          this.notifier.info(ok);
        },
        error: (e: unknown) => {
          chiudi();
          const conflitto = dettaglioConflitto(e);
          const errori = erroriCampo(e);
          if (campi && conflitto) campi.get('email')?.setErrors({ server: `${conflitto}. Usa un’altra email.` });
          else if (campi && errori) for (const [k, m] of Object.entries(errori)) campi.get(k)?.setErrors({ server: m });
          else this.notifier.errore(e, () => this.salva(parziale, () => undefined, ok, campi));
        },
      });
  }

  protected salvaDati(): void {
    if (this.dati.invalid) return void this.dati.markAllAsTouched();
    this.salvandoDati.set(true);
    const v = this.dati.getRawValue();
    this.salva({ nome: v.nome.trim(), cognome: v.cognome.trim(), email: v.email.trim(), linkedin: v.linkedin.trim() }, () => this.salvandoDati.set(false), 'Dati salvati', this.dati);
  }

  protected salvaPreferenze(): void {
    if (this.preferenze.invalid) return void this.preferenze.markAllAsTouched();
    this.salvandoPreferenze.set(true);
    this.salva(this.preferenze.getRawValue(), () => this.salvandoPreferenze.set(false), 'Obiettivi salvati', this.preferenze);
  }

  protected salvaPassword(): void {
    if (this.password.invalid) return void this.password.markAllAsTouched();
    this.salvandoPassword.set(true);
    this.salva(
      { password: this.password.getRawValue().nuova },
      () => {
        this.salvandoPassword.set(false);
        this.password.reset({ nuova: '', conferma: '' });
      },
      'Password cambiata',
      this.password,
    );
  }

  /** File JSON con tutto ciò che hai salvato, storico compreso. */
  protected async esporta(): Promise<void> {
    this.esportando.set(true);
    try {
      const [candidature, colloqui, contatti, cv, modelli, offerte] = await Promise.all([
        firstValueFrom(this.api.candidature()),
        firstValueFrom(this.api.colloqui()),
        firstValueFrom(this.api.contatti()),
        firstValueFrom(this.api.cv()),
        firstValueFrom(this.api.modelli()),
        firstValueFrom(this.api.offerte()),
      ]);
      await firstValueFrom(this.storico.assicura(candidature.map((c) => c.id)));
      const { password: _scartata, ...account } = this.corrente();
      const esportate = candidature.map((c) => ({ ...c, storico: this.storico.perId().get(c.id) ?? [] }));
      const json = JSON.stringify({ esportatoIl: oggiISO(), account, candidature: esportate, colloqui, contatti, cv, modelli, offerte }, null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidate-dati-${oggiISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.notifier.info('Esportazione pronta');
    } catch (e) {
      this.notifier.errore(e, () => void this.esporta());
    } finally {
      this.esportando.set(false);
    }
  }

  protected esci(): void {
    this.auth.esci();
  }

  protected emailGiusta(): boolean {
    return this.emailConferma.value.trim().toLowerCase() === this.corrente().email.toLowerCase();
  }

  protected elimina(): void {
    if (!this.emailGiusta()) return;
    this.eliminando.set(true);
    this.api.eliminaAccount().subscribe({
      next: () => this.auth.esci(),
      error: (e: unknown) => {
        this.eliminando.set(false);
        this.notifier.errore(new Error(messaggioErrore(e)), () => this.elimina());
      },
    });
  }

  protected readonly eliminaDisabilitato = () => !this.emailGiusta() || this.eliminando();
  protected readonly tuttiLeCandidature = this.candidature.elementi;
}

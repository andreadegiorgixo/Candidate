import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { Testata } from '../../shared/testata/testata';

/** Indirizzo che non esiste: dice cosa è successo e propone dove andare. */
@Component({
  selector: 'app-non-trovata',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatoVuoto, Testata],
  template: `
    <app-testata titolo="Pagina non trovata" />
    <app-stato-vuoto titolo="Questo indirizzo non esiste" testo="Può essere scritto male o la pagina può essere stata spostata. Riparti da Oggi o dall’elenco delle candidature.">
      <a routerLink="/oggi" class="btn primario">Vai a Oggi</a>
      <a routerLink="/candidature" class="btn">Vai alle candidature</a>
    </app-stato-vuoto>
  `,
})
export class NonTrovata {}

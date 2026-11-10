import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Cornice delle pagine di accesso: a sinistra la linea, a destra il modulo. */
@Component({
  selector: 'app-cornice-accesso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina">
      <aside class="marchio" aria-hidden="true">
        <p class="logo"><i></i>Applify</p>
        <div class="testo">
          <p class="frase">Sai sempre a che punto sei.</p>
          <ol class="linea">
            <li></li><li></li><li></li><li></li><li></li><li></li>
          </ol>
          <p class="didascalia">Dall’invio alla firma, una candidatura alla volta.</p>
        </div>
      </aside>
      <main class="modulo">
        <div class="contenuto">
          <h1>{{ titolo() }}</h1>
          <p class="sotto">{{ sottotitolo() }}</p>
          <ng-content />
        </div>
      </main>
    </div>
  `,
  styleUrl: './cornice.scss',
})
export class CorniceAccesso {
  readonly titolo = input.required<string>();
  readonly sottotitolo = input<string>('');
}

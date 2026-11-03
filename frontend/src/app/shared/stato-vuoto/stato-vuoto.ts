import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Ogni stato vuoto dice cosa succede qui e propone l'azione successiva (contenuto proiettato). */
@Component({
  selector: 'app-stato-vuoto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vuoto">
      <h3>{{ titolo() }}</h3>
      @if (testo()) {
        <p>{{ testo() }}</p>
      }
      <div class="azioni"><ng-content /></div>
    </div>
  `,
  styles: `
    .vuoto {
      display: grid;
      justify-items: start;
      gap: 6px;
      padding: 28px 26px;
      background: var(--bianco);
      border: 1px dashed #8b917f;
      border-radius: var(--r-pannello);
    }
    h3 {
      font-size: 18px;
      font-weight: 700;
    }
    p {
      color: var(--testo-2);
      max-width: 52ch;
    }
    .azioni {
      margin-top: 8px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .azioni:empty {
      display: none;
    }
  `,
})
export class StatoVuoto {
  readonly titolo = input.required<string>();
  readonly testo = input<string>('');
}

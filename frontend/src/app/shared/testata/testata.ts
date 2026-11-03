import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Titolo di pagina con sottotitolo e azioni a destra (contenuto proiettato). */
@Component({
  selector: 'app-testata',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top">
      <div>
        <h1>{{ titolo() }}</h1>
        @if (sottotitolo()) {
          <p>{{ sottotitolo() }}</p>
        }
      </div>
      <div class="azioni"><ng-content /></div>
    </header>
  `,
  styles: `
    .top {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
    }
    p {
      color: var(--testo-2);
      margin-top: 6px;
    }
    .azioni {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    @media (max-width: 1050px) {
      .top {
        flex-direction: column;
        align-items: flex-start;
      }
      .azioni {
        justify-content: flex-start;
      }
    }
  `,
})
export class Testata {
  readonly titolo = input.required<string>();
  readonly sottotitolo = input<string>('');
}
